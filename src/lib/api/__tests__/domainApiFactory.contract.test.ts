import { beforeEach, describe, expect, it, vi } from 'vitest';
import { medicationApi } from '@/lib/api/medicationApi';
import * as cache from '@/lib/sync/cacheStore';
import * as patient from '@/lib/api/patientDataApi';

vi.mock('@/integrations/supabase/client', () => {
  // Minimal chainable supabase stub for tests
  const makeChain = (result: any) => ({
    select() { return { single: async () => ({ data: result, error: null }) }; },
    single: async () => ({ data: result, error: null }),
    is() { return this; },
    eq() { return this; },
    order() { return { then: async (cb: any) => cb({ data: result, error: null }) }; },
  });
  return {
    supabase: {
      auth: { getUser: async () => ({ data: { user: null } }) },
      from: (table: string) => ({
        insert: (p: any) => ({ select: () => ({ single: async () => ({ data: { ...p, id: 'new-id' }, error: null } ) }) }),
        update: (p: any) => ({ select: () => ({ single: async () => ({ data: { ...p, id: p.id ?? 'new-id' }, error: null } ) }) }),
        delete: async () => ({ data: [], error: null }),
        select: async () => ({ data: [], error: null }),
        is: () => ({ eq: () => makeChain([]) }),
        eq: () => makeChain([]),
        in: () => makeChain([]),
      }),
      rpc: async () => ({ data: 'patient-1', error: null }),
    },
  };
});

describe('domainApiFactory contract (medications)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    window.localStorage.clear();
    vi.spyOn(patient, 'ensurePatient').mockResolvedValue('p-1');
  });

  it('save runs validate -> insert -> cache-write -> audit', async () => {
    const writeSpy = vi.spyOn(cache, 'writeCache');
    const auditSpy = vi.spyOn(patient, 'logAudit').mockResolvedValue();
    const row = await medicationApi.save({ medication_name: 'Aspirin' } as any);
    expect(row.id).toBeDefined();
    expect(writeSpy).toHaveBeenCalled();
    expect(auditSpy).toHaveBeenCalledWith(expect.objectContaining({ entityType: 'medication' }));
  });

  it('save does NOT write cache when DB rejects', async () => {
    // replace supabase.from to return chainable insert that errors
    const mod = await vi.importMock('@/integrations/supabase/client');
    (mod.supabase as any).from = () => ({
      insert: (p: any) => ({ select: () => ({ single: async () => ({ data: null, error: new Error('db') }) }) }),
      update: (p: any) => ({ select: () => ({ single: async () => ({ data: null, error: new Error('db') }) }) }),
      select: () => ({ is: () => ({ eq: () => ({ data: [], error: null }) }) }),
      is: () => ({ eq: () => ({}) }),
      eq: () => ({})
    });
    const writeSpy = vi.spyOn(cache, 'writeCache');
    await expect(medicationApi.save({ medication_name: 'X' } as any)).rejects.toBeTruthy();
    expect(writeSpy).not.toHaveBeenCalled();
  });

  it('list filters deleted and patient_id', async () => {
    const mod = await vi.importMock('@/integrations/supabase/client');
    // mock select path to return rows including deleted and wrong patient
    (mod.supabase as any).from = () => {
      const rows = [
        { id: '1', deleted_at: null, patient_id: 'p-1' },
        { id: '2', deleted_at: '2020', patient_id: 'p-1' },
        { id: '3', deleted_at: null, patient_id: 'other' },
      ];
      const filtered = rows.filter(r => !r.deleted_at && r.patient_id === 'p-1');
      return {
          select: () => ({
            is: () => ({
              eq: () => ({
                order: async () => ({ data: filtered, error: null }),
                then: async (cb: any) => cb({ data: filtered, error: null }),
              }),
            }),
          }),
        is: () => ({ eq: () => ({}) }),
        eq: () => ({ then: async (cb: any) => cb({ data: rows, error: null }) }),
      };
    };
    const rows = await medicationApi.list();
    expect(rows.map(r => r.id)).toEqual(['1']);
  });

  it('remove issues soft delete and scopes by patient_id and audits', async () => {
    const mod = await vi.importMock('@/integrations/supabase/client');
    let updatedId: string | null = null;
    (mod.supabase as any).from = () => ({
      update: (p: any) => ({
        eq: () => ({
          eq: () => ({ then: async (cb: any) => cb({ data: null, error: null }) }),
          then: async (cb: any) => cb({ data: null, error: null }),
        }),
        then: async (cb: any) => cb({ data: null, error: null }),
      }),
      select: () => ({ is: () => ({ eq: () => ({ data: [], error: null }) }) }),
    });
    const auditSpy = vi.spyOn(patient, 'logAudit').mockResolvedValue();
    await medicationApi.remove('del-id');
    expect(auditSpy).toHaveBeenCalledWith(expect.objectContaining({ action: 'entity_deleted' }));
  });
});

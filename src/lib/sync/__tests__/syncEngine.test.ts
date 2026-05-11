import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/api/medicationApi', () => ({ medicationApi: { list: async () => [{ id: 'm1' }] } }));
vi.mock('@/lib/api/medicalRecordApi', () => ({ medicalRecordApi: { list: async () => [{ id: 'r1' }] } }));
vi.mock('@/lib/api/appointmentApi', () => ({ appointmentApi: { list: async () => [{ id: 'a1' }] } }));
vi.mock('@/lib/api/allergyApi', () => ({ allergyApi: { list: async () => [{ id: 'al1' }] } }));
vi.mock('@/lib/api/journeyApi', () => ({ journeyApi: { list: async () => [{ id: 'j1' }] } }));
vi.mock('@/lib/api/carePlanApi', () => ({ carePlanApi: { list: async () => [{ id: 'c1' }] } }));
vi.mock('@/lib/api/educationApi', () => ({ educationApi: { list: async () => [{ id: 'e1' }] } }));
vi.mock('@/lib/api/transportApi', () => ({ listTransportTickets: async () => [{ id: 't1' }] }));

import { refreshAll } from '@/lib/sync/syncEngine';

describe('syncEngine.refreshAll', () => {
  beforeEach(() => vi.resetAllMocks());

  it('calls all list functions and returns counts', async () => {
    const res = await refreshAll('p1');
    expect(res.find((r) => r.entity === 'medications')?.count).toBe(1);
    expect(res.every((r) => r.ok)).toBe(true);
  });

  it('one failure does not abort others', async () => {
    // mock one module to throw
    const mod = await vi.importMock<typeof import('@/lib/api/medicalRecordApi')>('@/lib/api/medicalRecordApi');
    (mod.medicalRecordApi as any).list = async () => { throw new Error('boom'); };
    const res = await refreshAll('p1');
    expect(res.find((r) => r.entity === 'medical_records')?.ok).toBe(false);
    expect(res.find((r) => r.entity === 'medications')?.ok).toBe(true);
  });
});

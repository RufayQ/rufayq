import { describe, expect, it, vi, beforeEach } from 'vitest';


// Allow tests to swap RPC behavior by mutating rpcImpl
let rpcImpl: (name: string) => Promise<any> = async (name: string) => {
  if (name === 'ensure_patient') return { data: 'p-xyz', error: null };
  if (name === 'claim_guest_patient_data') return { data: { claimed: { medications: 2 } }, error: null };
  return { data: null, error: null };
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
    rpc: (...args: any[]) => rpcImpl(args[0]),
  },
}));

import { ensurePatient, claimGuestPatientData, bootstrapPatientData } from '@/lib/api/patientDataApi';

describe('patientDataApi', () => {
  beforeEach(() => vi.resetAllMocks());

  it('ensurePatient returns RPC value', async () => {
    const p = await ensurePatient();
    expect(p).toBe('p-xyz');
  });

  it('claimGuestPatientData throws on RPC error', async () => {
    rpcImpl = async () => ({ data: null, error: new Error('rpc') });
    await expect(claimGuestPatientData()).rejects.toBeTruthy();
  });

  it('bootstrapPatientData claims then ensures and returns structure', async () => {
    // reset rpcImpl to normal
    rpcImpl = async (name: string) => {
      if (name === 'ensure_patient') return { data: 'p-xyz', error: null };
      if (name === 'claim_guest_patient_data') return { data: { claimed: { medications: 2 } }, error: null };
      return { data: null, error: null };
    };
    const res = await bootstrapPatientData();
    expect(res).toHaveProperty('patientId');
    expect(res).toHaveProperty('deviceId');
    expect(res).toHaveProperty('userId');
  });
});

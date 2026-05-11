import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  readCache,
  writeCache,
  clearCache,
  filterAlive,
  readLastSyncedAt,
  writeLastSyncedAt,
  clearAllForPatient,
} from '@/lib/sync/cacheStore';

describe('cacheStore', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('read/write/clear and namespace isolation per patientKey', () => {
    writeCache('p1', 'meds', [{ id: 'a' }]);
    writeCache('p2', 'meds', [{ id: 'b' }]);
    expect(readCache('p1', 'meds').map((r: any) => r.id)).toEqual(['a']);
    expect(readCache('p2', 'meds').map((r: any) => r.id)).toEqual(['b']);
    clearCache('p1', 'meds');
    expect(readCache('p1', 'meds')).toEqual([]);
  });

  it('filterAlive strips snake_case and camelCase deleted flags', () => {
    const rows = [
      { id: '1', deleted_at: null },
      { id: '2', deleted_at: '2020-01-01' },
      { id: '3', deletedAt: null },
      { id: '4', deletedAt: '2020-01-01' },
    ];
    const alive = filterAlive(rows as any);
    expect(alive.map((r) => r.id)).toEqual(['1', '3']);
  });

  it('lastSyncedAt round-trip', () => {
    const before = readLastSyncedAt('p1', 'meds');
    expect(before).toBeNull();
    const ts = writeLastSyncedAt('p1', 'meds');
    const after = readLastSyncedAt('p1', 'meds');
    expect(after).toBe(ts);
  });

  it('clearAllForPatient removes all keys for a patient', () => {
    writeCache('p1', 'meds', [{ id: 'a' }]);
    writeCache('p1', 'notes', [{ id: 'x' }]);
    writeCache('p2', 'meds', [{ id: 'b' }]);
    clearAllForPatient('p1');
    expect(readCache('p1', 'meds')).toEqual([]);
    expect(readCache('p1', 'notes')).toEqual([]);
    expect(readCache('p2', 'meds').map((r: any) => r.id)).toEqual(['b']);
  });
});

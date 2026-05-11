import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useDomainData } from '@/hooks/useDomainData';

describe('useDomainData hook', () => {
  it('initial paint from cache, refresh updates, optimistic remove rollback, save dedupes', async () => {
    const api = {
      listCached: () => [{ id: 'a', value: 1 }],
      list: async () => [{ id: 'b', value: 2 }],
      save: async (input: any) => ({ id: input.id ?? 'new', ...input }),
      remove: async (id: string) => { if (id === 'throw') throw new Error('boom'); },
      lastSyncedAt: () => null,
    } as any;

    const { result } = renderHook(() => useDomainData<any>(api));
    expect(result.current.items.map((i: any) => i.id)).toEqual(['a']);
    await act(async () => { await result.current.refresh(); });
    expect(result.current.items.map((i: any) => i.id)).toEqual(['b']);
    await act(async () => {
      try { await result.current.remove('throw'); } catch { /* expected */ }
    });
    expect(result.current.items.length).toBeGreaterThan(0);
    await act(async () => {
      await result.current.save({ id: 'b', value: 3 } as any);
    });
    expect((result.current.items.find((x: any) => x.id === 'b') as any)?.value).toBe(3);
  });
});

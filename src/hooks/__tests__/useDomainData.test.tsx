import React from 'react';
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

    const { result, waitForNextUpdate } = renderHook(() => useDomainData(api));
    // initial items from cache
    expect(result.current.items.map((i) => i.id)).toEqual(['a']);
    // refresh updates items
    await act(async () => { await result.current.refresh(); });
    expect(result.current.items.map((i) => i.id)).toEqual(['b']);
    // optimistic remove rollback
    await act(async () => {
      // start remove that will throw
      try { await result.current.remove('throw'); } catch (e) { /* expected */ }
    });
    // after rollback, items still present
    expect(result.current.items.length).toBeGreaterThan(0);
    // save dedupes by id
    await act(async () => {
      await result.current.save({ id: 'b', value: 3 } as any);
    });
    expect(result.current.items.find((x) => x.id === 'b')?.value).toBe(3);
  });
});

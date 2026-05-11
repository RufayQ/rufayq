## Goal
Fix `src/lib/__tests__/pdfScoring.test.ts` failing on older Node runtimes because `pdfjs-dist` (imported by `src/lib/pdfToImages.ts`) calls `Promise.withResolvers`, which only exists in Node ≥22.

## Change
Prepend a guarded polyfill to `src/test/setup.ts` (which Vitest already loads via `setupFiles`):

```ts
if (typeof (Promise as any).withResolvers !== "function") {
  (Promise as any).withResolvers = function <T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}
```

Placed at the very top of `src/test/setup.ts`, before the existing `@testing-library/jest-dom` import, so it is installed before any test module evaluates `pdfjs-dist`.

## Why this is safe
- Guarded by `typeof !== "function"`, so it's a no-op on Node 22+ where the native method exists.
- Returns the exact `{ promise, resolve, reject }` shape from the ES2024 spec that `pdfjs-dist` expects.
- Lives in test setup only — no product code, no dependency bumps, no changes to `pdfToImages.ts`.

## Verification
- `npx vitest run src/lib/__tests__/pdfScoring.test.ts` → suite executes and passes.
- `npm test` → full suite green, no regressions in other files.

## Out of scope
- Updating Node engine requirements.
- Upgrading or replacing `pdfjs-dist`.
- Any landing page or product code changes.

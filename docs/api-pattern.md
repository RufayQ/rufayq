# `src/api/` — API-First Pattern

This is the contract surface that web, native iOS/Android/Huawei, and Android
Auto all consume. Anything that crosses the network goes through here.

## Layout

```
src/api/
  contracts/        Zod schemas (canonical wire shapes) — types are inferred
  clients/          Thin wrappers over supabase + edge functions
  realtime/         Channel registry — name/table/event/filter constants
  index.ts          Public barrel — the only thing mobile imports
```

## Adding a new resource

1. **Contract first.** Create `contracts/<resource>.ts` exporting Zod schemas
   and `z.infer` types. Cover the full row + any summary/projection variants.
2. **Client.** Create `clients/<resource>.client.ts` exposing
   `list / get / create / update / remove` (plus resource-specific actions).
   Every method:
   - Returns `ApiResult<T>` (`{ data, error }`) — never throws.
   - Validates the response through the Zod schema; failure → `contract_violation`.
3. **Barrel.** Re-export the contract types and client from `src/api/index.ts`.
4. **Tests.** Add round-trip tests for the contract and behaviour tests for
   the client (mock `supabase`).
5. **Migrate callers.** Replace direct `supabase.from('<resource>')` calls in
   features/components with the new client. Existing barrels in `@/features/*`
   keep working unchanged.

## Realtime

Register every channel in `realtime/channels.ts` as an `as const` entry:

```ts
myChannel: {
  name: "resource:event",
  table: "table_name",
  event: "*" | "INSERT" | "UPDATE" | "DELETE",
  filter: "column=eq.value",
}
```

Both admin portal and mobile subscribe by referencing the registry — never by
duplicating the literal name elsewhere.

## What NOT to do here

- No UI imports (no React, no shadcn).
- No business rules — those live in `src/features/<area>/logic/`.
- No direct edits to `src/integrations/supabase/client.ts` or `types.ts`.
- No throwing. Always envelope errors.

## Reference implementation

See `subscriptions` for the canonical example:
- `src/api/contracts/subscriptions.ts`
- `src/api/clients/subscriptions.client.ts`
- `src/api/contracts/__tests__/subscriptions.test.ts`

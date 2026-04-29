## Answering your questions first

**1. Where can add-ons be assigned today?**

Add-ons exist in **two parallel places** in the codebase right now (this is technical debt worth knowing about):

- **Admin Subscription Drawer** → `Add-ons` tab (`SubscriptionDrawer.tsx`)
  - Writes to `user_subscription_addons` table
  - Catalog is **hardcoded** in `ADDON_CATALOG` inside the file
  - Admin-only assignment with comp/price/duration controls
- **Patient `SubscriptionDashboard`** (self-service)
  - Writes to a different table: `subscription_addons`
  - Lets the user request add-ons (status `pending_admin`)

So today there is **no other admin surface** for add-ons besides the per-user drawer. There is **no admin pricing/catalog page at all** — plans live in `src/data/subscriptionPlans.ts` and `src/data/currencyMaster.ts` (static TypeScript), and the landing/Pricing page reads directly from those files.

**2. Is there admin pricing management that updates the landing site?**

No. Any price change today requires editing source files. The two add-on tables are also disconnected, and neither has a shared catalog.

---

## Proposed plan

Build a single **Pricing & Catalog** admin module that becomes the source of truth for plans, add-ons, and prices — and have the public Pricing page read from it.

### 1. Database (new schema)

- `pricing_plans` — `code` (FREE/STARTER/COMPANION/FAMILY or custom), `name_en/ar`, `description_en/ar`, `recommended`, `sort_order`, `is_active`, `published_at`
- `pricing_plan_features` — bilingual feature bullets per plan, ordered
- `pricing_plan_prices` — per `(plan_id, currency, billing_cycle)` → `amount`. Supports SAR / AED / EGP / USD / EUR, monthly / yearly / quarterly
- `pricing_addons` — `key`, `name_en/ar`, `desc_en/ar`, `unit_en/ar`, `cta_en/ar`, `hero`, `is_active`, `sort_order`
- `pricing_addon_prices` — per `(addon_id, currency)` → `amount`
- All tables: admin-only RLS for write, public `select` for active rows
- Audit triggers logging `pricing_plan_*` / `pricing_addon_*` events into `admin_audit_log`
- One-shot seed migration that imports the current values from `subscriptionPlans.ts` + `currencyMaster.ts` so nothing breaks on launch

### 2. Unified add-on catalog

- Replace the hardcoded `ADDON_CATALOG` in `SubscriptionDrawer.tsx` with a fetch from `pricing_addons` + `pricing_addon_prices`
- Patient `SubscriptionDashboard` reads the same table — one catalog, two surfaces
- Migration aligns the two add-on tables: keep `user_subscription_addons` (admin assignments) and `subscription_addons` (user requests), but both reference `pricing_addons.key`

### 3. New admin page: `Pricing & Catalog`

Added as a new sidebar item under the Subscriptions group in `src/pages/Admin.tsx`. Three tabs:

- **Plans** — list/grid of plans; click to open editor drawer (name, description, features, recommended flag, multi-currency price matrix, active toggle, publish)
- **Add-ons** — same pattern for add-ons
- **History** — filtered audit log of pricing changes with CSV export (reuses existing patterns from Organizations history)

UI conventions match the rest of admin: dark/teal styling, permission-gated buttons (`pricing.modify`, `pricing.publish`), confirmation modals, sticky drawer headers, responsive mobile layout.

### 4. Dynamic landing & Pricing page

- New hook `usePricingCatalog()` fetches active plans + add-ons + prices, keyed by currency
- `src/pages/Pricing.tsx` and `src/pages/LandingBelow.tsx` switch from static `PLANS` import to the hook
- Keep the static files as a typed fallback (used during loading and as a seed source) so SSR/initial paint stays instant
- Cache-bust on admin publish via a lightweight `pricing_catalog_version` row that the public page subscribes to (Supabase realtime), so changes appear without a hard refresh — same pattern we used for Organizations

### 5. Permissions

Add to `permissions.ts`:
- `pricing.view` — admin, moderator
- `pricing.modify` — admin only
- `pricing.publish` — admin only

Gate the editor drawer save/publish buttons with `GateButton`, same as elsewhere.

### 6. Out of scope (call out explicitly)

- No payment-processor sync — these are display prices only; bank-transfer flow already accepts arbitrary amounts
- No A/B testing or scheduled price changes (can be a follow-up)
- No per-country price overrides beyond the 5 existing currencies

---

### Files to be created
- `supabase/migrations/<ts>_pricing_catalog.sql` (schema + seed + RLS + audit triggers)
- `src/components/admin/AdminPricingCatalog.tsx`
- `src/components/admin/pricing/PlanEditorDrawer.tsx`
- `src/components/admin/pricing/AddonEditorDrawer.tsx`
- `src/components/admin/pricing/PricingHistoryTab.tsx`
- `src/hooks/usePricingCatalog.ts`

### Files to be edited
- `src/pages/Admin.tsx` (new nav entry + route case)
- `src/features/auth/logic/permissions.ts` (new permission keys)
- `src/features/subscriptions/admin/ui/SubscriptionDrawer.tsx` (read add-on catalog from DB)
- `src/pages/SubscriptionDashboard.tsx` (read add-on catalog from DB)
- `src/pages/Pricing.tsx` and `src/pages/LandingBelow.tsx` (use `usePricingCatalog`)
- `src/data/subscriptionPlans.ts` / `src/data/currencyMaster.ts` (kept as fallback constants)

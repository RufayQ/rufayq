/**
 * usePricingCatalog — fetches the active pricing catalog (plans + add-ons +
 * prices) from the database and live-refreshes when admins publish changes.
 *
 * Admin pages that need *all* rows (including inactive) should query the
 * tables directly with the authenticated client; this hook is for the public
 * Pricing/landing surfaces.
 */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CatalogPlan {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string | null;
  descriptionAr: string | null;
  recommended: boolean;
  ctaEn: string | null;
  ctaAr: string | null;
  sortOrder: number;
  features: { textEn: string; textAr: string }[];
  prices: { currency: string; cycle: string; amount: number }[];
}

export interface CatalogAddon {
  id: string;
  key: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string | null;
  descriptionAr: string | null;
  unitEn: string | null;
  unitAr: string | null;
  ctaEn: string | null;
  ctaAr: string | null;
  hero: boolean;
  sortOrder: number;
  prices: { currency: string; amount: number }[];
}

export interface PricingCatalog {
  plans: CatalogPlan[];
  addons: CatalogAddon[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function usePricingCatalog(): PricingCatalog {
  const [plans, setPlans] = useState<CatalogPlan[]>([]);
  const [addons, setAddons] = useState<CatalogAddon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      try {
        const [plansR, featR, planPxR, addR, addPxR] = await Promise.all([
          supabase.from("pricing_plans").select("*").eq("is_active", true).order("sort_order"),
          supabase.from("pricing_plan_features").select("*").order("sort_order"),
          supabase.from("pricing_plan_prices").select("*"),
          supabase.from("pricing_addons").select("*").eq("is_active", true).order("sort_order"),
          supabase.from("pricing_addon_prices").select("*"),
        ]);
        const err = plansR.error || featR.error || planPxR.error || addR.error || addPxR.error;
        if (err) throw err;
        if (cancel) return;
        setPlans(
          (plansR.data || []).map((p: any) => ({
            id: p.id, code: p.code, nameEn: p.name_en, nameAr: p.name_ar,
            descriptionEn: p.description_en, descriptionAr: p.description_ar,
            recommended: p.recommended, ctaEn: p.cta_en, ctaAr: p.cta_ar,
            sortOrder: p.sort_order,
            features: (featR.data || []).filter((f: any) => f.plan_id === p.id)
              .map((f: any) => ({ textEn: f.text_en, textAr: f.text_ar })),
            prices: (planPxR.data || []).filter((x: any) => x.plan_id === p.id)
              .map((x: any) => ({ currency: x.currency, cycle: x.billing_cycle, amount: Number(x.amount) })),
          })),
        );
        setAddons(
          (addR.data || []).map((a: any) => ({
            id: a.id, key: a.key, nameEn: a.name_en, nameAr: a.name_ar,
            descriptionEn: a.description_en, descriptionAr: a.description_ar,
            unitEn: a.unit_en, unitAr: a.unit_ar, ctaEn: a.cta_en, ctaAr: a.cta_ar,
            hero: a.hero, sortOrder: a.sort_order,
            prices: (addPxR.data || []).filter((x: any) => x.addon_id === a.id)
              .map((x: any) => ({ currency: x.currency, amount: Number(x.amount) })),
          })),
        );
        setError(null);
      } catch (e: any) {
        if (!cancel) setError(e.message || "Failed to load pricing");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [tick]);

  // Realtime: bump on any catalog version change
  useEffect(() => {
    const ch = supabase.channel("pricing-catalog-version")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "pricing_catalog_version" },
        () => setTick((t) => t + 1))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  return useMemo(() => ({ plans, addons, loading, error, reload: () => setTick((t) => t + 1) }),
    [plans, addons, loading, error]);
}

/** Helpers to find prices by currency/cycle. */
export const planPrice = (
  plan: CatalogPlan, currency: string, cycle: "monthly" | "quarterly" | "yearly",
): number | null => {
  const row = plan.prices.find((p) => p.currency === currency && p.cycle === cycle);
  return row ? row.amount : null;
};
export const addonPrice = (addon: CatalogAddon, currency: string): number | null => {
  const row = addon.prices.find((p) => p.currency === currency);
  return row ? row.amount : null;
};

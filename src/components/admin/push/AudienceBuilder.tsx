import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Globe, Package, Users, Check } from "lucide-react";
import type { PushAudience } from "@/hooks/useAdminPushCampaigns";

interface Props {
  value: PushAudience;
  onChange: (v: PushAudience) => void;
  estimate: number | null;
  estimating: boolean;
}

export default function AudienceBuilder({ value, onChange, estimate, estimating }: Props) {
  const [countries, setCountries] = useState<string[]>([]);
  const [plans, setPlans] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const { data: profs } = await supabase
        .from("profiles")
        .select("nationality")
        .not("nationality", "is", null)
        .limit(1000);
      const uniq = Array.from(new Set((profs ?? []).map((p) => p.nationality).filter(Boolean) as string[])).sort();
      setCountries(uniq);

      const { data: subs } = await supabase
        .from("user_subscriptions")
        .select("plan")
        .limit(1000);
      const uniqPlans = Array.from(new Set((subs ?? []).map((s) => s.plan).filter(Boolean) as string[])).sort();
      setPlans(uniqPlans);
    })();
  }, []);

  const toggle = (key: "countries" | "plans" | "roles", v: string) => {
    const arr = value[key] as string[];
    const next = arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
    onChange({ ...value, [key]: next });
  };

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={value.all}
          onChange={(e) => onChange({ ...value, all: e.target.checked })}
          className="h-4 w-4"
        />
        <Globe className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Send to all users</span>
      </label>

      <div className={value.all ? "opacity-40 pointer-events-none" : ""}>
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
          <Globe className="h-3 w-3" /> Countries (nationality)
        </div>
        <div className="flex flex-wrap gap-2">
          {countries.length === 0 ? (
            <span className="text-xs text-muted-foreground">No nationalities recorded yet</span>
          ) : countries.map((c) => {
            const active = value.countries.includes(c);
            return (
              <button
                key={c}
                type="button"
                onClick={() => toggle("countries", c)}
                className={`rounded-full px-3 py-1 text-xs border transition ${
                  active ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-muted"
                }`}
              >
                {active && <Check className="mr-1 inline h-3 w-3" />}
                {c}
              </button>
            );
          })}
        </div>
      </div>

      <div className={value.all ? "opacity-40 pointer-events-none" : ""}>
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
          <Package className="h-3 w-3" /> Plans (active subscriptions)
        </div>
        <div className="flex flex-wrap gap-2">
          {plans.length === 0 ? (
            <span className="text-xs text-muted-foreground">No active plans yet</span>
          ) : plans.map((p) => {
            const active = value.plans.includes(p);
            return (
              <button
                key={p}
                type="button"
                onClick={() => toggle("plans", p)}
                className={`rounded-full px-3 py-1 text-xs border transition ${
                  active ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-muted"
                }`}
              >
                {active && <Check className="mr-1 inline h-3 w-3" />}
                {p}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
          <Users className="h-3 w-3" /> Role
        </div>
        <div className="flex gap-2">
          {(["patient", "provider"] as const).map((r) => {
            const active = value.roles.includes(r);
            return (
              <button
                key={r}
                type="button"
                onClick={() => toggle("roles", r)}
                className={`rounded-full px-3 py-1 text-xs border capitalize transition ${
                  active ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-muted"
                }`}
              >
                {r}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-md bg-muted/40 px-3 py-2 text-sm">
        Estimated reach:{" "}
        <span className="font-semibold">
          {estimating ? "…" : estimate === null ? "—" : `${estimate.toLocaleString()} device${estimate === 1 ? "" : "s"}`}
        </span>
      </div>
    </div>
  );
}

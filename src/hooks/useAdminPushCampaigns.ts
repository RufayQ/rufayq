import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CampaignStatus = "draft" | "scheduled" | "sending" | "sent" | "failed" | "cancelled";
export interface PushAudience {
  all: boolean;
  countries: string[];
  plans: string[];
  roles: ("patient" | "provider")[];
}
export interface PushCampaign {
  id: string;
  title: string;
  title_ar: string | null;
  body: string | null;
  body_ar: string | null;
  link: string | null;
  kind: string;
  audience: PushAudience;
  scope: "global" | "org";
  organization_id: string | null;
  status: CampaignStatus;
  scheduled_at: string | null;
  sent_at: string | null;
  audience_size: number;
  delivered_count: number;
  failed_count: number;
  is_test: boolean;
  created_by: string | null;
  created_at: string;
  error_msg: string | null;
}

export const useAdminPushCampaigns = () => {
  const [items, setItems] = useState<PushCampaign[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("push_campaigns")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    setItems((data as unknown as PushCampaign[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return { items, loading, reload };
};

export async function estimateAudience(
  audience: PushAudience,
  scope: "global" | "org",
  organizationId: string | null,
): Promise<number> {
  const { data, error } = await supabase.rpc("push_estimate_audience", {
    _audience: audience as unknown as never,
    _scope: scope,
    _org: organizationId,
  });
  if (error) throw error;
  return (data as number) ?? 0;
}

export async function createCampaign(input: {
  title: string;
  title_ar?: string;
  body?: string;
  body_ar?: string;
  link?: string;
  audience: PushAudience;
  scope: "global" | "org";
  organization_id: string | null;
  scheduled_at?: string | null;
  status: "draft" | "scheduled";
}): Promise<string> {
  const user = (await supabase.auth.getUser()).data.user;
  const { data, error } = await supabase
    .from("push_campaigns")
    .insert({
      title: input.title,
      title_ar: input.title_ar ?? null,
      body: input.body ?? null,
      body_ar: input.body_ar ?? null,
      link: input.link ?? null,
      audience: input.audience as unknown as never,
      scope: input.scope,
      organization_id: input.organization_id,
      scheduled_at: input.scheduled_at ?? null,
      status: input.status,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

export async function sendCampaignNow(id: string) {
  const { data, error } = await supabase.rpc("push_campaign_send", { _campaign_id: id });
  if (error) throw error;
  return data as { delivered: number };
}

export async function testSendCampaign(id: string) {
  const { error } = await supabase.rpc("push_campaign_test_send", { _campaign_id: id });
  if (error) throw error;
}

export async function cancelCampaign(id: string) {
  const { error } = await supabase.rpc("push_campaign_cancel", { _campaign_id: id });
  if (error) throw error;
}

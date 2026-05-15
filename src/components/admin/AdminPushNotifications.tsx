import { useState } from "react";
import { Bell, History as HistoryIcon, PencilLine } from "lucide-react";
import { useAdminPushCampaigns } from "@/hooks/useAdminPushCampaigns";
import CampaignComposer from "./push/CampaignComposer";
import CampaignHistory from "./push/CampaignHistory";

interface Props { isAdmin: boolean }

export default function AdminPushNotifications({ isAdmin }: Props) {
  const { items, loading, reload } = useAdminPushCampaigns();
  const [tab, setTab] = useState<"compose" | "history">("compose");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" /> Push Notifications
          </h1>
          <p className="text-sm text-muted-foreground">
            Send segmented in-app announcements to patients and providers.
          </p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-border">
        <button
          onClick={() => setTab("compose")}
          className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
            tab === "compose" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <PencilLine className="h-4 w-4" /> Composer
        </button>
        <button
          onClick={() => setTab("history")}
          className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
            tab === "history" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <HistoryIcon className="h-4 w-4" /> History ({items.length})
        </button>
      </div>

      {tab === "compose" ? (
        <CampaignComposer onSent={reload} isAdmin={isAdmin} />
      ) : (
        <CampaignHistory items={items} loading={loading} reload={reload} />
      )}
    </div>
  );
}

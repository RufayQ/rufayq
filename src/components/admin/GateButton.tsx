/**
 * GateButton — permission-aware action button.
 *
 * If the current admin's role lacks `action`, the button is rendered
 * disabled with a "permission denied" toast on click (instead of hidden),
 * so item 6 of the brief is satisfied: visible disabled state + toast.
 *
 * Pass `hideWhenDenied` to use the original "hide entirely" behaviour.
 */
import type { ReactNode } from "react";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { usePermissions } from "@/features/auth";
import type { Action } from "@/features/auth/logic/permissions";

interface GateButtonProps {
  action: Action;
  onClick: () => void;
  children: ReactNode;
  className?: string;
  title?: string;
  hideWhenDenied?: boolean;
  showLockIcon?: boolean;
}

export const GateButton = ({
  action, onClick, children, className = "", title,
  hideWhenDenied = false, showLockIcon = true,
}: GateButtonProps) => {
  const { ready, can } = usePermissions();
  const allowed = ready && can(action);
  if (!ready) return null;
  if (!allowed && hideWhenDenied) return null;

  const handle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!allowed) {
      toast.error("Permission required", {
        description: `Your role can't perform "${action}". Ask an admin to grant access.`,
      });
      return;
    }
    onClick();
  };

  return (
    <button
      type="button"
      onClick={handle}
      title={title || (allowed ? undefined : `Requires ${action}`)}
      aria-disabled={!allowed}
      className={`${className} ${allowed ? "" : "opacity-50 cursor-not-allowed grayscale"}`}
    >
      {!allowed && showLockIcon && <Lock size={10} className="inline mr-1" />}
      {children}
    </button>
  );
};

export default GateButton;

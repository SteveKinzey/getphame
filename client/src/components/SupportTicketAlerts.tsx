import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

/**
 * Lightweight in-app delivery for recipient-scoped support events. React Query
 * polling runs only in an active operator's browser; no server-side timer is used.
 */
export default function SupportTicketAlerts() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const displayedAlertIds = useRef(new Set<number>());
  const alerts = trpc.support.myTicketAlerts.useQuery(undefined, {
    enabled: user?.role === "admin",
    refetchInterval: 5_000,
    refetchIntervalInBackground: false,
  });
  const markRead = trpc.support.markTicketAlertsRead.useMutation({
    onSuccess: () => void utils.support.myTicketAlerts.invalidate(),
  });

  useEffect(() => {
    const undisplayedAlerts =
      alerts.data?.filter(alert => !displayedAlertIds.current.has(alert.id)) ??
      [];
    if (undisplayedAlerts.length === 0) return;

    undisplayedAlerts.forEach(alert => {
      displayedAlertIds.current.add(alert.id);
      const ticketLabel = alert.subject?.trim() || `Ticket #${alert.ticketId}`;
      const actor = alert.actorName?.trim() || "An administrator";
      const description =
        alert.type === "assignment"
          ? `${actor} assigned you “${ticketLabel}”.`
          : alert.type === "mention"
            ? `${actor} mentioned you in a private update on “${ticketLabel}”.`
            : alert.type === "sla_breach"
              ? `Urgent ticket #${alert.ticketId} has breached its SLA deadline: “${ticketLabel}”.`
              : `${actor} escalated “${ticketLabel}” to ${alert.priority ?? "higher"} priority.`;

      if (alert.type === "assignment") {
        toast.success("New ticket assigned", {
          description,
          id: `support-ticket-alert-${alert.id}`,
        });
      } else if (alert.type === "mention") {
        toast.info("Mentioned in a ticket", {
          description,
          id: `support-ticket-alert-${alert.id}`,
        });
      } else if (alert.type === "sla_breach") {
        toast.warning("Urgent SLA breach", {
          description,
          id: `support-ticket-alert-${alert.id}`,
        });
      } else {
        toast.warning("Ticket escalated", {
          description,
          id: `support-ticket-alert-${alert.id}`,
        });
      }
    });

    markRead.mutate({ ids: undisplayedAlerts.map(alert => alert.id) });
  }, [alerts.data, markRead]);

  return null;
}

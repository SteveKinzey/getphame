import {
  createContext,
  useContext,
  useEffect,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, RefreshCw } from "lucide-react";
import {
  useAppVersionCheck,
  type AppUpdateState,
} from "@/hooks/useAppVersionCheck";

const UPDATE_TOAST_ID = "getphame-version-update";
const UPDATE_STATUS_TOAST_ID = "getphame-version-update-status";

type AppVersionContextValue = ReturnType<typeof useAppVersionCheck>;

const AppVersionContext = createContext<AppVersionContextValue | null>(null);

export function AppVersionProvider({ children }: { children: ReactNode }) {
  const update = useAppVersionCheck();

  return (
    <AppVersionContext.Provider value={update}>
      {children}
      <AppVersionUpdateNotice update={update} />
    </AppVersionContext.Provider>
  );
}

export function useAppVersionUpdate() {
  const context = useContext(AppVersionContext);
  if (!context) {
    throw new Error("useAppVersionUpdate must be used inside AppVersionProvider");
  }
  return context;
}

function updateStatusMessage(
  state: AppUpdateState,
  blocker: ReturnType<typeof useAppVersionCheck>["blocker"],
  t: ReturnType<typeof useTranslation>["t"]
): string {
  if (state === "blocked") {
    return blocker === "pending-mutation"
      ? t("versionUpdate.blockedMutation", {
          defaultValue: "Finish the current action before updating.",
        })
      : t("versionUpdate.blockedSensitiveFlow", {
          defaultValue: "Finish this sign-in or payment step before updating.",
        });
  }

  if (state === "reloading") {
    return t("versionUpdate.reloading", {
      defaultValue: "Updating this tab now.",
    });
  }

  if (state === "failed") {
    return t("versionUpdate.failed", {
      defaultValue:
        "The update could not be completed automatically. You can refresh this tab when ready.",
    });
  }

  return "";
}

function AppVersionUpdateNotice({ update }: { update: AppVersionContextValue }) {
  const { t } = useTranslation();
  const {
    availableVersion,
    blocker,
    cancelDiscard,
    confirmDiscardAndUpdate,
    deferUpdate,
    noticeVisible,
    requestUpdate,
    state,
  } = update;
  const statusMessage = updateStatusMessage(state, blocker, t);

  useEffect(() => {
    if (noticeVisible && state === "available" && availableVersion) {
      toast.custom(
        () => (
          <div
            data-testid="pwa-update-notice"
            className="w-[min(25rem,calc(100vw-2rem))] rounded-2xl border border-[oklch(0.79_0.15_80_/_0.68)] bg-white p-4 shadow-lg"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl rr-bg-gold">
                <RefreshCw size={17} className="rr-text-navy" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black rr-text-navy">
                  {t("versionUpdate.title", { defaultValue: "Update ready" })}
                </p>
                <p className="mt-1 text-xs leading-5 rr-text-navy-mid">
                  {t("versionUpdate.notice", {
                    defaultValue:
                      "A new version of GET PHAME is ready. Update when you have a clear moment.",
                  })}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={requestUpdate}
                    className="rounded-lg px-3 py-2 text-xs font-black transition-[transform,opacity] duration-150 active:scale-[0.97] rr-bg-navy rr-text-gold"
                  >
                    {t("versionUpdate.updateNow", { defaultValue: "Update now" })}
                  </button>
                  <button
                    type="button"
                    onClick={deferUpdate}
                    className="rounded-lg px-3 py-2 text-xs font-bold transition-[transform,opacity] duration-150 active:scale-[0.97] rr-bg-white-card rr-text-navy"
                  >
                    {t("versionUpdate.later", { defaultValue: "Later" })}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ),
        { id: UPDATE_TOAST_ID, duration: Infinity }
      );
      return;
    }

    toast.dismiss(UPDATE_TOAST_ID);
  }, [availableVersion, deferUpdate, noticeVisible, requestUpdate, state, t]);

  useEffect(() => {
    if (!statusMessage) return;

    if (state === "failed") {
      toast.error(statusMessage, { id: UPDATE_STATUS_TOAST_ID, duration: 8_000 });
      return;
    }

    if (state === "blocked") {
      toast.warning(statusMessage, { id: UPDATE_STATUS_TOAST_ID, duration: 6_000 });
      return;
    }

    toast.message(statusMessage, { id: UPDATE_STATUS_TOAST_ID, duration: 4_000 });
  }, [state, statusMessage]);

  return (
    <>
      <p className="sr-only" aria-live="polite" data-testid="pwa-update-status">
        {statusMessage}
      </p>
      <AlertDialog
        open={state === "confirm-loss"}
        onOpenChange={open => {
          if (!open) cancelDiscard();
        }}
      >
        <AlertDialogContent className="max-w-md rounded-2xl">
          <AlertDialogHeader>
            <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl rr-bg-gold">
              <AlertTriangle size={20} className="rr-text-navy" aria-hidden="true" />
            </div>
            <AlertDialogTitle className="rr-text-navy">
              {t("versionUpdate.discardTitle", {
                defaultValue: "Update and discard unsaved changes?",
              })}
            </AlertDialogTitle>
            <AlertDialogDescription className="rr-text-navy-mid">
              {t("versionUpdate.discardDescription", {
                defaultValue:
                  "This tab has unsaved work. Save it first, or confirm that you want to reload and discard those changes.",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDiscard}>
              {t("versionUpdate.keepEditing", { defaultValue: "Keep editing" })}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDiscardAndUpdate}
              className="rr-bg-navy rr-text-gold hover:opacity-90"
            >
              {t("versionUpdate.discardAndUpdate", {
                defaultValue: "Discard and update",
              })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

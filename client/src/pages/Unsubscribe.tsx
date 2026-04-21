/**
 * Unsubscribe page — handles the /unsubscribe?token=... link from email footers.
 * Validates the HMAC token via the contacts.unsubscribe tRPC mutation and shows
 * a confirmation or error state.
 */
import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function UnsubscribePage() {
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const unsubMutation = trpc.contacts.unsubscribe.useMutation({
    onSuccess: () => setStatus("success"),
    onError: (e) => {
      setErrorMsg(e.message);
      setStatus("error");
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    setToken(t);
    if (t) {
      setStatus("loading");
      unsubMutation.mutate({ token: t });
    } else {
      setStatus("error");
      setErrorMsg("No unsubscribe token found in the link. Please use the link from your email.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 pt-16 pb-40"
      style={{ background: "oklch(0.975 0.003 100)" }}
    >
      {/* Card */}
      <div
        className="w-full max-w-sm rounded-2xl shadow-lg overflow-hidden"
        style={{ background: "#ffffff" }}
      >
        {/* Navy header */}
        <div
          className="px-8 py-6 text-center"
          style={{ background: "oklch(0.22 0.09 260)" }}
        >
          <p
            className="text-xs font-bold tracking-widest uppercase mb-1"
            style={{ color: "oklch(0.80 0.18 80)", fontFamily: "'Syne', sans-serif" }}
          >
            ReviewLink
          </p>
          <h1
            className="text-xl font-black text-white"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            Email Preferences
          </h1>
        </div>

        {/* Body */}
        <div className="px-8 py-8 text-center">
          {status === "loading" && (
            <div className="flex flex-col items-center gap-3">
              <Loader2 size={40} className="animate-spin" style={{ color: "oklch(0.22 0.09 260)" }} />
              <p className="text-sm" style={{ color: "oklch(0.40 0.04 260)" }}>
                Processing your request…
              </p>
            </div>
          )}

          {status === "success" && (
            <div className="flex flex-col items-center gap-4">
              <CheckCircle2 size={48} className="text-green-500" />
              <div>
                <p
                  className="text-lg font-bold mb-1"
                  style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}
                >
                  You've been unsubscribed
                </p>
                <p className="text-sm" style={{ color: "oklch(0.50 0.04 260)" }}>
                  You won't receive any more review request emails. If this was a mistake, please
                  contact the business directly.
                </p>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center gap-4">
              <XCircle size={48} className="text-red-500" />
              <div>
                <p
                  className="text-lg font-bold mb-1"
                  style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}
                >
                  Something went wrong
                </p>
                <p className="text-sm" style={{ color: "oklch(0.50 0.04 260)" }}>
                  {errorMsg || "This unsubscribe link may be invalid or expired."}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-8 py-4 text-center border-t"
          style={{ borderColor: "#e8eaf0", background: "#f8f9ff" }}
        >
          <p className="text-xs" style={{ color: "#aaa" }}>
            Powered by{" "}
            <a
              href="https://reviewlink.app"
              className="underline"
              style={{ color: "#aaa" }}
            >
              ReviewLink
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

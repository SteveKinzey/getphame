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
      className="min-h-screen flex flex-col items-center justify-center px-6 pt-16 pb-40 rr-bg-cream-warm"
    >
      {/* Card */}
      <div
        className="w-full max-w-sm rounded-2xl shadow-lg overflow-hidden"
        style={{ background: "#ffffff" }}
      >
        {/* Navy header */}
        <div
          className="px-8 py-6 text-center rr-bg-navy"
        >
          <p
            className="text-base font-bold tracking-widest uppercase mb-1 rr-text-gold"
          >
            Phame
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
              <Loader2 size={40} className="animate-spin rr-text-navy" />
              <p className="text-base font-semibold rr-text-navy-mid">
                Processing your request…
              </p>
            </div>
          )}

          {status === "success" && (
            <div className="flex flex-col items-center gap-4">
              <CheckCircle2 size={48} className="text-green-500" />
              <div>
                <p
                  className="text-lg font-bold mb-1 rr-text-navy"
                >
                  You've been unsubscribed
                </p>
                <p className="text-base font-semibold rr-text-navy-mid">
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
                  className="text-lg font-bold mb-1 rr-text-navy"
                >
                  Something went wrong
                </p>
                <p className="text-base font-semibold rr-text-navy-mid">
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
          <p className="text-sm font-bold" style={{ color: "#222" }}>
            Powered by{" "}
            <a
              href="https://getphame.app"
              className="underline"
              style={{ color: "#222", fontWeight: "bold" }}
            >
              Phame
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

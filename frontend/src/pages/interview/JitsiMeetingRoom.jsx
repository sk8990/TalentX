import { useEffect, useRef, useState } from "react";

const JITSI_DOMAIN = "meet.jit.si";

function extractJitsiRoomName(meetingLink) {
  const raw = String(meetingLink || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw);
    return url.pathname.replace(/^\/+/, "").replace(/\/+$/, "") || "";
  } catch {
    return raw;
  }
}

export default function JitsiMeetingRoom({
  meetingLink,
  displayName = "Participant",
  onLeave,
  height = "100%",
}) {
  const containerRef = useRef(null);
  const apiRef = useRef(null);
  const loadingTimerRef = useRef(null);
  const roomName = extractJitsiRoomName(meetingLink);
  const [loading, setLoading] = useState(Boolean(roomName));
  const [error, setError] = useState(roomName ? "" : "No meeting room available.");

  useEffect(() => {
    if (!roomName) return undefined;

    let cancelled = false;

    const loadJitsiScript = () =>
      new Promise((resolve, reject) => {
        if (typeof window.JitsiMeetExternalAPI === "function") {
          return resolve();
        }
        const existing = document.querySelector(
          'script[src="https://meet.jit.si/external_api.js"]'
        );
        if (existing) {
          existing.addEventListener("load", resolve, { once: true });
          existing.addEventListener("error", () => reject(new Error("Jitsi script load failed")), { once: true });
          return;
        }
        const script = document.createElement("script");
        script.src = "https://meet.jit.si/external_api.js";
        script.async = true;
        script.onload = resolve;
        script.onerror = () => reject(new Error("Jitsi script load failed"));
        document.body.appendChild(script);
      });

    const initJitsi = async () => {
      try {
        await loadJitsiScript();
        if (cancelled || !containerRef.current) return;

        const api = new window.JitsiMeetExternalAPI(JITSI_DOMAIN, {
          roomName,
          parentNode: containerRef.current,
          userInfo: { displayName },
          configOverwrite: {
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            disableDeepLinking: true,
            prejoinPageEnabled: true,
            enableClosePage: false,
            disableInviteFunctions: true,
            analytics: {
              disabled: true,
              amplitudeAPPKey: null,
              googleAnalyticsTrackingId: null,
            },
            disableThirdPartyRequests: true,
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            SHOW_PROMOTIONAL_CLOSE_PAGE: false,
            TOOLBAR_BUTTONS: [
              "microphone",
              "camera",
              "desktop",
              "chat",
              "raisehand",
              "tileview",
              "hangup",
              "fullscreen",
              "settings",
            ],
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
          },
        });

        apiRef.current = api;

        api.addEventListener("videoConferenceJoined", () => {
          if (!cancelled) setLoading(false);
        });

        // Fallback: clear loading after iframe loads even if the
        // videoConferenceJoined event is delayed (e.g. prejoin page).
        api.addEventListener("browserSupport", () => {
          if (!cancelled) setLoading(false);
        });
        loadingTimerRef.current = setTimeout(() => {
          if (!cancelled) setLoading(false);
        }, 8000);

        api.addEventListener("readyToClose", () => {
          clearTimeout(loadingTimerRef.current);
          if (onLeave) onLeave();
        });
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to load Jitsi Meet");
          setLoading(false);
        }
      }
    };

    initJitsi();

    return () => {
      cancelled = true;
      clearTimeout(loadingTimerRef.current);
      if (apiRef.current) {
        try {
          apiRef.current.dispose();
        } catch {
          // ignore
        }
        apiRef.current = null;
      }
    };
  }, [roomName, displayName, onLeave]);

  if (error) {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
        <div>
          <p className="text-sm font-semibold text-rose-700">{error}</p>
          {onLeave ? (
            <button
              onClick={onLeave}
              className="mt-3 rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
            >
              Go Back
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden rounded-2xl" style={{ height }}>
      {loading ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/80 text-white">
          <div className="text-center">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            <p className="text-sm font-semibold">Connecting to Jitsi Meet...</p>
          </div>
        </div>
      ) : null}
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";
import NotificationsIcon from "@mui/icons-material/Notifications";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import DescriptionIcon from "@mui/icons-material/Description";
import EventNoteIcon from "@mui/icons-material/EventNote";
import QuizIcon from "@mui/icons-material/Quiz";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import VerifiedIcon from "@mui/icons-material/Verified";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import CampaignIcon from "@mui/icons-material/Campaign";

const POLL_INTERVAL_MS = 60 * 1000;
const CACHE_TTL_MS = 15 * 1000;
const VIEWPORT_PADDING_PX = 8;
const PANEL_GAP_PX = 10;
const DESKTOP_PANEL_WIDTH_PX = 384;
const MOBILE_PANEL_MAX_WIDTH_PX = 360;

let notificationsCache = {
  notifications: [],
  unreadCount: 0,
  fetchedAt: 0,
};

let notificationsInFlight = null;

async function fetchNotificationsShared(force = false) {
  const now = Date.now();
  const hasFreshCache = notificationsCache.fetchedAt > 0 && (now - notificationsCache.fetchedAt) < CACHE_TTL_MS;

  if (!force && hasFreshCache) {
    return notificationsCache;
  }

  if (notificationsInFlight) {
    return notificationsInFlight;
  }

  notificationsInFlight = API.get("/notifications")
    .then((res) => {
      notificationsCache = {
        notifications: res.data?.notifications || [],
        unreadCount: res.data?.unreadCount || 0,
        fetchedAt: Date.now(),
      };
      return notificationsCache;
    })
    .catch(() => notificationsCache)
    .finally(() => {
      notificationsInFlight = null;
    });

  return notificationsInFlight;
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [panelPosition, setPanelPosition] = useState({ top: 0, left: 0, width: DESKTOP_PANEL_WIDTH_PX });
  const buttonRef = useRef(null);
  const panelRef = useRef(null);

  const updatePanelPosition = useCallback(() => {
    if (typeof window === "undefined" || !buttonRef.current) {
      return;
    }

    const rect = buttonRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const maxWidth = Math.max(220, viewportWidth - VIEWPORT_PADDING_PX * 2);
    const panelWidth =
      viewportWidth < 640
        ? Math.min(MOBILE_PANEL_MAX_WIDTH_PX, maxWidth)
        : Math.min(DESKTOP_PANEL_WIDTH_PX, maxWidth);

    let left = rect.right - panelWidth;
    left = Math.max(
      VIEWPORT_PADDING_PX,
      Math.min(left, viewportWidth - panelWidth - VIEWPORT_PADDING_PX)
    );

    const top = rect.bottom + PANEL_GAP_PX;
    setPanelPosition({ top, left, width: panelWidth });
  }, []);

  async function fetchNotifications(force = false) {
    try {
      const data = await fetchNotificationsShared(force);
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // Silent fail to avoid interrupting the layout.
    }
  }

  useEffect(() => {
    const initialFetchTimer = setTimeout(() => {
      void fetchNotifications(false);
    }, 0);

    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }

      void fetchNotifications(false);
    }, POLL_INTERVAL_MS);

    return () => {
      clearTimeout(initialFetchTimer);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event) => {
      const target = event.target;
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleReposition = () => updatePanelPosition();
    updatePanelPosition();
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [open, updatePanelPosition]);

  const markAllRead = async () => {
    try {
      await API.put("/notifications/read-all");
      setUnreadCount(0);
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
    } catch {
      // Silent fail to avoid interrupting the layout.
    }
  };

  const markRead = async (id) => {
    try {
      await API.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((item) => (item._id === id ? { ...item, isRead: true } : item))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Silent fail to avoid interrupting the layout.
    }
  };

  const handleBellClick = () => {
    setOpen((prev) => {
      const next = !prev;
      if (next) {
        updatePanelPosition();
        void fetchNotifications(true);
      }
      return next;
    });
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      await markRead(notification._id);
    }

    if (notification.link) {
      setOpen(false);
      navigate(notification.link);
    }
  };

  const iconByType = {
    APPLICATION_STATUS: DescriptionIcon,
    INTERVIEW_SCHEDULED: EventNoteIcon,
    INTERVIEW_SLOT_OPENED: EventNoteIcon,
    INTERVIEW_SLOT_BOOKED: EventNoteIcon,
    ASSESSMENT_SENT: QuizIcon,
    OFFER_RECEIVED: LocalOfferIcon,
    RECRUITER_APPROVED: VerifiedIcon,
    INTERVIEWER_ASSIGNED: EventNoteIcon,
    INTERVIEWER_FEEDBACK_SUBMITTED: DescriptionIcon,
    INTERVIEWER_CREATED: CampaignIcon,
    JOB_POSTED: CampaignIcon,
    TICKET_ANSWERED: SupportAgentIcon,
    GENERAL: CampaignIcon
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleBellClick}
        className="relative rounded-xl p-2 text-slate-600 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
      >
        <NotificationsIcon sx={{ fontSize: 22 }} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          style={{
            top: panelPosition.top,
            left: panelPosition.left,
            width: panelPosition.width,
          }}
          className="fixed z-[90] rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-700">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                <DoneAllIcon sx={{ fontSize: 14 }} />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500 dark:text-slate-300">
                No notifications yet.
              </div>
            ) : (
              notifications.map((notification) => {
                const TypeIcon = iconByType[notification.type] || CampaignIcon;

                return (
                  <div
                    key={notification._id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`cursor-pointer border-b border-slate-50 px-4 py-3 transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700 ${
                      !notification.isRead ? "bg-indigo-50/50 dark:bg-indigo-900/20" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 rounded-lg bg-slate-100 p-1 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                        <TypeIcon sx={{ fontSize: 16 }} />
                      </span>

                      <div className="flex-1">
                        <p
                          className={`text-sm ${
                            !notification.isRead
                              ? "font-semibold text-slate-900 dark:text-white"
                              : "text-slate-700 dark:text-slate-200"
                          }`}
                        >
                          {notification.title}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-300">
                          {notification.message}
                        </p>
                        <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-400">
                          {new Date(notification.createdAt).toLocaleString()}
                        </p>
                      </div>

                      {!notification.isRead && (
                        <div className="mt-1 h-2 w-2 rounded-full bg-indigo-500" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

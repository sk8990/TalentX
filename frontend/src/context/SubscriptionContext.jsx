import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getMySubscription } from "../api/subscriptionApi";
import { readStoredSession } from "../utils/authRouting";

const SubscriptionContext = createContext(null);
const STORAGE_KEY = "talentx_subscription";

function readCachedSubscription() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function cacheSubscription(subscription) {
  if (!subscription) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(subscription));
}

export function SubscriptionProvider({ children }) {
  const [subscription, setSubscription] = useState(readCachedSubscription);
  const [loading, setLoading] = useState(false);

  const refreshSubscription = useCallback(async () => {
    const { token, user } = readStoredSession();

    if (!token || !user) {
      setSubscription(null);
      cacheSubscription(null);
      return null;
    }

    try {
      setLoading(true);
      const nextSubscription = await getMySubscription();
      setSubscription(nextSubscription);
      cacheSubscription(nextSubscription);
      return nextSubscription;
    } catch (_err) {
      setSubscription(null);
      cacheSubscription(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSubscription();

    const handleAuthChanged = () => {
      refreshSubscription();
    };

    window.addEventListener("talentx-auth-changed", handleAuthChanged);
    return () => {
      window.removeEventListener("talentx-auth-changed", handleAuthChanged);
    };
  }, [refreshSubscription]);

  const hasFeature = useCallback(
    (featureName) => Boolean(subscription?.features?.[featureName]),
    [subscription]
  );

  const value = useMemo(
    () => ({
      subscription,
      loading,
      hasFeature,
      refreshSubscription
    }),
    [hasFeature, loading, refreshSubscription, subscription]
  );

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error("useSubscription must be used within SubscriptionProvider");
  }
  return context;
}

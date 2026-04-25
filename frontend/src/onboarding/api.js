import axios from "axios";
import {
  getStoredOnboardingToken,
  persistOnboardingToken,
  clearStoredOnboardingToken
} from "./session";

const DEFAULT_SERVER_ORIGIN = import.meta.env.DEV
  ? "http://localhost:5000"
  : "https://talentx-dls1.onrender.com";

const SERVER_ORIGIN = String(import.meta.env.VITE_SERVER_ORIGIN || DEFAULT_SERVER_ORIGIN)
  .trim()
  .replace(/\/+$/, "");

const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || `${SERVER_ORIGIN}/api`)
  .trim()
  .replace(/\/+$/, "");

const onboardingAPI = axios.create({
  baseURL: API_BASE_URL,
});

// Phase 3.1: Auto-refresh token on 401 responses
let refreshPromise = null;

async function tryRefreshToken() {
  try {
    const mainSession = JSON.parse(localStorage.getItem("talentx_session") || "{}");
    if (!mainSession?.token) return null;

    const { data } = await axios.post(`${API_BASE_URL}/onboarding/init`, {}, {
      headers: { Authorization: `Bearer ${mainSession.token}` }
    });

    if (data?.token) {
      persistOnboardingToken(data.token);
      return data.token;
    }
  } catch (_err) {
    clearStoredOnboardingToken();
  }
  return null;
}

onboardingAPI.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retried) {
      originalRequest._retried = true;

      // Deduplicate concurrent refresh attempts
      if (!refreshPromise) {
        refreshPromise = tryRefreshToken().finally(() => { refreshPromise = null; });
      }

      const newToken = await refreshPromise;
      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return onboardingAPI(originalRequest);
      }
    }

    return Promise.reject(error);
  }
);

export function buildServerAssetUrl(pathname) {
  const rawPath = String(pathname || "").trim();
  if (!rawPath) {
    return "";
  }

  if (/^https?:\/\//i.test(rawPath)) {
    return rawPath;
  }

  return `${SERVER_ORIGIN}${rawPath.startsWith("/") ? rawPath : `/${rawPath}`}`;
}

export default onboardingAPI;

import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

const instance = axios.create({
  baseURL: API_BASE_URL,
});

instance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

instance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      if (currentPath !== "/" && currentPath !== "/register" && currentPath !== "/forgot-password") {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/";
      }
    }
    return Promise.reject(error);
  }
);

export function getServerOrigin() {
  const explicitOrigin = String(import.meta.env.VITE_SERVER_ORIGIN || "").trim();
  if (explicitOrigin) {
    return explicitOrigin.replace(/\/+$/, "");
  }

  if (/^https?:\/\//i.test(API_BASE_URL)) {
    const normalized = API_BASE_URL.replace(/\/+$/, "");
    return normalized.replace(/\/api$/, "");
  }

  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return "http://localhost:5000";
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return "";
}

export default instance;

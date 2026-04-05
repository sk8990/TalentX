import axios from "axios";

const DEFAULT_SERVER_ORIGIN = import.meta.env.DEV
  ? "http://localhost:5000"
  : "https://talentx-dls1.onrender.com";
const SERVER_ORIGIN = String(import.meta.env.VITE_SERVER_ORIGIN || DEFAULT_SERVER_ORIGIN)
  .trim()
  .replace(/\/+$/, "");
const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || `${SERVER_ORIGIN}/api`)
  .trim()
  .replace(/\/+$/, "");

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
  if (SERVER_ORIGIN) {
    return SERVER_ORIGIN;
  }

  if (/^https?:\/\//i.test(API_BASE_URL)) {
    const normalized = API_BASE_URL.replace(/\/+$/, "");
    return normalized.replace(/\/api$/, "");
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return "";
}

export default instance;

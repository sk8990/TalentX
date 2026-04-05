import { clearStoredAuth } from "./authRouting";

export const logout = () => {
  clearStoredAuth();
  window.location.href = "/";
};


const ONBOARDING_TOKEN_KEY = "talentx_onboarding_token";
const ONBOARDING_INSTANCE_KEY = "talentx_onboarding_instance";

export function persistOnboardingToken(token) {
  if (token) {
    sessionStorage.setItem(ONBOARDING_TOKEN_KEY, token);
  }
}

export function getStoredOnboardingToken() {
  return sessionStorage.getItem(ONBOARDING_TOKEN_KEY) || "";
}

export function clearStoredOnboardingToken() {
  sessionStorage.removeItem(ONBOARDING_TOKEN_KEY);
}

export function persistOnboardingInstanceId(instanceId) {
  if (instanceId) {
    sessionStorage.setItem(ONBOARDING_INSTANCE_KEY, instanceId);
  }
}

export function getStoredOnboardingInstanceId() {
  return sessionStorage.getItem(ONBOARDING_INSTANCE_KEY) || "";
}

export function clearStoredOnboardingInstanceId() {
  sessionStorage.removeItem(ONBOARDING_INSTANCE_KEY);
}

export function clearOnboardingSession() {
  clearStoredOnboardingToken();
  clearStoredOnboardingInstanceId();
}

export function decodeJwtPayload(token) {
  try {
    const encodedPayload = String(token || "").split(".")[1] || "";
    if (!encodedPayload) {
      return null;
    }

    const normalizedPayload = encodedPayload.replace(/-/g, "+").replace(/_/g, "/");
    const decodedPayload = window.atob(normalizedPayload);
    return JSON.parse(decodedPayload);
  } catch {
    return null;
  }
}

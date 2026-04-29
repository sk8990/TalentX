import API from "./axios";

export function getMySubscription() {
  return API.get("/subscriptions/me").then((response) => response.data);
}

export function cancelSubscription() {
  return API.patch("/subscriptions/cancel").then((response) => response.data);
}

export function manualActivateEnterprise(userId) {
  const payload = userId ? { userId, plan: "enterprise" } : { plan: "enterprise" };
  return API.post("/subscriptions/manual-activate", payload).then((response) => response.data);
}

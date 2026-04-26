import API from "./axios";

export function createPaymentOrder(plan) {
  return API.post("/payments/create-order", { plan }).then((response) => response.data);
}

export function verifyPayment(payload) {
  return API.post("/payments/verify", payload).then((response) => response.data);
}

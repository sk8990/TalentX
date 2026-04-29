import API from "./axios";

export function getSuperAdminDashboard() {
  return API.get("/super-admin/dashboard").then((response) => response.data);
}

export function getPackages() {
  return API.get("/super-admin/packages").then((response) => response.data);
}

export function createPackage(payload) {
  return API.post("/super-admin/packages", payload).then((response) => response.data);
}

export function updatePackage(id, payload) {
  return API.put(`/super-admin/packages/${id}`, payload).then((response) => response.data);
}

export function togglePackageStatus(id, isActive) {
  return API.patch(`/super-admin/packages/${id}/active/status`, { value: isActive }).then((response) => response.data);
}

export function togglePackageLandingVisibility(id, isVisibleOnLandingPage) {
  return API.patch(`/super-admin/packages/${id}/visibility/status`, { value: isVisibleOnLandingPage }).then((response) => response.data);
}

export function getEnterpriseRequests() {
  return API.get("/super-admin/enterprise-requests").then((response) => response.data);
}

export function handleEnterpriseRequest(id, payload) {
  return API.patch(`/super-admin/enterprise-requests/${id}/handle`, payload).then((response) => response.data);
}

export function assignPackageToUser(userId, packageId) {
  return API.post(`/super-admin/users/${userId}/assign-package`, { packageId }).then((response) => response.data);
}

export function getPayments(params = {}) {
  return API.get("/super-admin/payments", { params }).then((response) => response.data);
}

export function getRevenue() {
  return API.get("/super-admin/revenue").then((response) => response.data);
}

export function getSubscriptions(params = {}) {
  return API.get("/super-admin/subscriptions", { params }).then((response) => response.data);
}

export function getUniversities(params = {}) {
  return API.get("/super-admin/universities", { params }).then((response) => response.data);
}

export function disableUniversity(id, reason) {
  return API.patch(`/super-admin/universities/${id}/disable`, { reason }).then((response) => response.data);
}

export function enableUniversity(id) {
  return API.patch(`/super-admin/universities/${id}/enable`).then((response) => response.data);
}

export function getRecruiters(params = {}) {
  return API.get("/super-admin/recruiters", { params }).then((response) => response.data);
}

export function disableRecruiter(id, reason) {
  return API.patch(`/super-admin/recruiters/${id}/disable`, { reason }).then((response) => response.data);
}

export function enableRecruiter(id) {
  return API.patch(`/super-admin/recruiters/${id}/enable`).then((response) => response.data);
}

import API from "./axios";

const BASE = "/college-admin";

export const getCollegeProfile = () => API.get(`${BASE}/profile`);

export const getPendingStudents = () => API.get(`${BASE}/pending-students`);
export const getApprovedStudents = () => API.get(`${BASE}/approved-students`);
export const getRejectedStudents = () => API.get(`${BASE}/rejected-students`);

export const approveStudent = (id) => API.post(`${BASE}/students/${id}/approve`);
export const rejectStudent = (id) => API.post(`${BASE}/students/${id}/reject`);

export const getCollegeJobs = () => API.get(`${BASE}/jobs`);

export const getPlacementReports = () => API.get(`${BASE}/placement-reports`);

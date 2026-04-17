import axios from "axios";

// In dev, requests to /api/* are proxied to the backend by Vite (see vite.config.ts).
// In production, set VITE_API_URL to the backend origin.
const API_BASE_URL = import.meta.env.VITE_API_URL || "";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Pragma": "no-cache",
  },
});

// ── Auth token injection ───────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Bust any browser caching for GET requests
    if (config.method === "get") {
      config.params = { ...config.params, _t: Date.now() };
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Global 401 handler – auto-logout on expired/invalid token ──
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Don't clear during login-related calls
      const url = error.config?.url || "";
      if (!url.includes("/auth/login") && !url.includes("/auth/token")) {
        localStorage.removeItem("token");
        // Notify AuthContext via custom event (no full page reload)
        window.dispatchEvent(new Event("auth:logout"));
      }
    }
    return Promise.reject(error);
  }
);

type D = Record<string, unknown>;

/* Health */
export const getHealthStatus = () => api.get("/api/health");

/* ── Apprentices ── */
export const getApprentices = (params?: { limit?: number; offset?: number }) =>
  api.get("/api/apprentices/", { params });
export const getApprentice = (id: number) => api.get(`/api/apprentices/${id}`);
export const createApprentice = (data: D) => api.post("/api/apprentices/", data);
export const updateApprentice = (id: number, data: D) => api.put(`/api/apprentices/${id}`, data);
export const deleteApprentice = (id: number) => api.delete(`/api/apprentices/${id}`);

/* ── Cohorts ── */
export const getCohorts = () => api.get("/api/cohorts/");
export const getCohort = (id: number) => api.get(`/api/cohorts/${id}`);
export const createCohort = (data: D) => api.post("/api/cohorts/", data);
export const updateCohort = (id: number, data: D) => api.put(`/api/cohorts/${id}`, data);
export const deleteCohort = (id: number) => api.delete(`/api/cohorts/${id}`);

/* ── Modules ── */
export const getModules = () => api.get("/api/modules/");
export const getModule = (id: number) => api.get(`/api/modules/${id}`);
export const getModuleDetail = (id: number) => api.get(`/api/modules/${id}/detail`);
export const createModule = (data: D) => api.post("/api/modules/", data);
export const updateModule = (id: number, data: D) => api.put(`/api/modules/${id}`, data);
export const deleteModule = (id: number) => api.delete(`/api/modules/${id}`);

/* ── KSBs ── */
export const getKSBs = () => api.get("/api/ksbs/");
export const getKSB = (id: number) => api.get(`/api/ksbs/${id}`);
export const createKSB = (data: D) => api.post("/api/ksbs/", data);
export const updateKSB = (id: number, data: D) => api.put(`/api/ksbs/${id}`, data);
export const deleteKSB = (id: number) => api.delete(`/api/ksbs/${id}`);

/* ── Evidence Submissions ── */
export const getSubmissions = (params?: { limit?: number; offset?: number }) =>
  api.get("/api/submissions/", { params });
export const getSubmission = (id: number) => api.get(`/api/submissions/${id}`);
export const createSubmission = (data: D) => api.post("/api/submissions/", data);
export const updateSubmission = (id: number, data: D) => api.put(`/api/submissions/${id}`, data);
export const deleteSubmission = (id: number) => api.delete(`/api/submissions/${id}`);

/* ── Coach Feedback ── */
export const getFeedback = (submissionId?: number) =>
  api.get("/api/feedback/", { params: submissionId ? { submission_id: submissionId } : {} });
export const getFeedbackById = (id: number) => api.get(`/api/feedback/${id}`);
export const createFeedback = (data: D) => api.post("/api/feedback/", data);
export const updateFeedback = (id: number, data: D) => api.put(`/api/feedback/${id}`, data);
export const deleteFeedback = (id: number) => api.delete(`/api/feedback/${id}`);

/* ── Interventions ── */
export const getInterventions = (status?: string) =>
  api.get("/api/interventions/", { params: status ? { status } : {} });
export const getIntervention = (id: number) => api.get(`/api/interventions/${id}`);
export const createIntervention = (data: D) => api.post("/api/interventions/", data);
export const updateIntervention = (id: number, data: D) => api.patch(`/api/interventions/${id}`, data);
export const deleteIntervention = (id: number) => api.delete(`/api/interventions/${id}`);

/* ── Analytics ── */
export const getDashboardSummary = () => api.get("/api/analytics/summary");
export const getSubmissionsByStatus = () => api.get("/api/analytics/submissions-by-status");
export const getSubmissionsByModule = () => api.get("/api/analytics/submissions-by-module");
export const getKSBCoverage = () => api.get("/api/analytics/ksb-coverage");
export const getKSBCoverageByType = () => api.get("/api/analytics/ksb-coverage-by-type");
export const getApprenticeProgress = () => api.get("/api/analytics/apprentice-progress");
export const getFeedbackList = () => api.get("/api/analytics/feedback");
export const getSubmissionTrends = () => api.get("/api/analytics/submission-trends");
export const getCohortComparison = () => api.get("/api/analytics/cohort-comparison");
export const getKSBHeatmap = () => api.get("/api/analytics/ksb-heatmap");
export const getApprenticeScatter = () => api.get("/api/analytics/apprentice-scatter");
export const getInterventionAnalysis = () => api.get("/api/analytics/intervention-analysis");

/* ── Analytics Analysis (AI-powered) ── */
export const getChartAnalysis = (chartId: string) => api.get(`/api/analytics/${chartId}/analysis`);

/* ── Chat / AI ── */
export const sendChatMessage = (message: string, conversationId?: number) =>
  api.post("/api/chat", { message, conversation_id: conversationId });
export const getChatConversations = () => api.get("/api/chat/conversations");
export const getChatConversation = (id: number) => api.get(`/api/chat/conversations/${id}`);
export const deleteChatConversation = (id: number) => api.delete(`/api/chat/conversations/${id}`);

/* ── Auth ── */
export const login = (email: string, password: string) =>
  api.post("/api/auth/login", { email, password });
export const changePassword = (current_password: string, new_password: string) =>
  api.post("/api/auth/change-password", { current_password, new_password });
export const getMe = () => api.get("/api/auth/me");

/* ── Users (Admin) ── */
export const getUsers = () => api.get("/api/users/");
export const getUser = (id: number) => api.get(`/api/users/${id}`);
export const createCoach = (data: D) => api.post("/api/users/coaches", data);
export const createApprenticeUser = (data: D) => api.post("/api/users/apprentices", data);
export const updateCoach = (id: number, data: D) => api.put(`/api/users/coaches/${id}`, data);
export const updateApprenticeUser = (id: number, data: D) => api.put(`/api/users/apprentices/${id}`, data);
export const deleteUser = (id: number) => api.delete(`/api/users/${id}`);
export const assignCohorts = (userId: number, cohortIds: number[]) =>
  api.post(`/api/users/${userId}/assign-cohorts`, { cohort_ids: cohortIds });
export const getUserCohorts = (userId: number) => api.get(`/api/users/${userId}/cohorts`);

/* ── Admin ── */
export const getAuditLog = (params?: { limit?: number; offset?: number; action?: string }) =>
  api.get("/api/admin/audit-log", { params });
export const getSystemStats = () => api.get("/api/admin/system-stats");

/* ── Apprentice Portal (My) ── */
export const getMyDashboard = () => api.get("/api/my/dashboard");
export const getMySubmissions = () => api.get("/api/my/submissions");
export const submitMyEvidence = (data: D) => api.post("/api/my/submissions", data);
export const updateMySubmission = (id: number, data: D) => api.put(`/api/my/submissions/${id}`, data);
export const getMyPortfolio = () => api.get("/api/my/portfolio");
export const getMyModules = () => api.get("/api/my/modules");
export const getMyFeedback = () => api.get("/api/my/feedback");
export const getMyKSBs = () => api.get("/api/my/ksbs");

export default api;

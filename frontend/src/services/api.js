import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 120_000, // 120 s — ML inference + LLM can be slow
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor ────────────────────────────────────────────────────────
api.interceptors.request.use(
  (config) => config,
  (error)  => Promise.reject(error)
);

// ── Response interceptor — normalise errors ────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred';
    const status = error.response?.status || 0;
    return Promise.reject({ message, status, raw: error });
  }
);

// ── API functions ──────────────────────────────────────────────────────────────

/**
 * Upload an image for detection analysis.
 * @param {FormData} formData   Must include field "image" (File) and optional "locationDescription"
 */
export function detectImage(formData) {
  return api.post('/detect', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

/**
 * Get paginated detection history.
 * @param {number} limit
 * @param {number} skip
 */
export function getHistory(limit = 50, skip = 0) {
  return api.get('/history', { params: { limit, skip } });
}

/**
 * Get aggregate statistics.
 */
export function getStats() {
  return api.get('/history/stats');
}

/**
 * Get paginated reports list.
 * @param {number} page
 * @param {number} limit
 */
export function getReports(page = 1, limit = 20) {
  return api.get('/reports', { params: { page, limit } });
}

/**
 * Get a single detection report by ID.
 * @param {string} id
 */
export function getReport(id) {
  return api.get(`/reports/${id}`);
}

/**
 * Delete a detection report by ID.
 * @param {string} id
 */
export function deleteReport(id) {
  return api.delete(`/reports/${id}`);
}

export default api;

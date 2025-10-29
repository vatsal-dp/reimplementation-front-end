import axios from "axios";
import { getAuthToken } from "./auth";

/**
 * @author Ankur Mundra on June, 2023
 */

// Allow deploy-time configuration of the API base URL. Use REACT_APP_API_BASE_URL in production (VCL).
const ENV_BASE = (process.env.REACT_APP_API_BASE_URL || '').trim();
const DEFAULT_BASE = (typeof window !== 'undefined' && window.location ? `${window.location.origin}/api/v1` : 'http://localhost:3002/api/v1');
const BASE_URL = ENV_BASE || DEFAULT_BASE;

const axiosClient = axios.create({
  baseURL: BASE_URL,
  timeout: 3000, // 2 minutes to better tolerate slow grade/heatgrid requests
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

axiosClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token && token !== "EXPIRED") {
    config.headers["Authorization"] = `Bearer ${token}`;
    return config;
  }
  return Promise.reject("Authentication token not found! Please login again.");
});
// No automatic fallback here: rely on deploy-time config (REACT_APP_API_BASE_URL) or same-origin proxy.
export default axiosClient;

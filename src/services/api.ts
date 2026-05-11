import axios from "axios";
import {
  AUTH_STORAGE_KEY,
  AUTH_TOKEN_STORAGE_KEY,
  DEFAULT_DEV_BACKEND_PORT,
  UNAUTHORIZED_EVENT,
} from "../utils/constants";

const isLikelyDevHost = (hostname: string) =>
  hostname === "localhost" ||
  hostname === "127.0.0.1" ||
  /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);

export function getApiBaseUrl() {
  const envValue = import.meta.env.VITE_API_BASE_URL?.trim();
  if (envValue) {
    return envValue.replace(/\/$/, "");
  }

  if (typeof window === "undefined") {
    return "";
  }

  const { hostname, port, protocol } = window.location;

  if (!hostname) {
    return "";
  }

  if (port === DEFAULT_DEV_BACKEND_PORT) {
    return `${protocol}//${hostname}:${port}`;
  }

  if (isLikelyDevHost(hostname)) {
    return `http://${hostname}:${DEFAULT_DEV_BACKEND_PORT}`;
  }

  return "";
}

export function resolveApiAssetUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmed) || /^data:/i.test(trimmed) || /^blob:/i.test(trimmed)) {
    return trimmed;
  }

  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    return trimmed;
  }

  if (trimmed.startsWith("/")) {
    return `${baseUrl}${trimmed}`;
  }

  return `${baseUrl}/${trimmed.replace(/^\/+/, "")}`;
}

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)?.trim();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    return config;
  }

  const rawSession = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (rawSession) {
    try {
      const session = JSON.parse(rawSession) as { token?: string | null };
      if (session.token) {
        config.headers.Authorization = `Bearer ${session.token}`;
      }
    } catch {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
    }

    return Promise.reject(error);
  }
);

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallback;
}

import { api, getApiErrorMessage } from "./api";
import type {
  AuthUser,
  LoginCredentials,
  LoginResponse,
  SetPasswordResponse,
  StoredSession,
  TokenPayload,
} from "../types/auth.types";
import type { UserRole } from "../types/user.types";
import {
  AUTH_STORAGE_KEY,
  AUTH_TOKEN_STORAGE_KEY,
  AUTH_USER_STORAGE_KEY,
  UNAUTHORIZED_EVENT,
} from "../utils/constants";

const roleMap: Record<string, UserRole> = {
  admin: "admin",
  administrator: "admin",
  medical_center_admin: "medical_center_admin",
  "medical center admin": "medical_center_admin",
  pharmacist: "pharmacist",
  pharmacy: "pharmacist",
  doctor: "doctor",
  receptionist: "receptionist",
};

export const AUTH_SESSION_UPDATED_EVENT = "auth:session-updated";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeRole(value: unknown): UserRole | null {
  if (typeof value !== "string") {
    return null;
  }

  return roleMap[value.trim().toLowerCase()] ?? null;
}

function decodeJwtPayload(token: string): TokenPayload | null {
  const [, payload] = token.split(".");

  if (!payload) {
    return null;
  }

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(window.atob(padded)) as TokenPayload;
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== "number") {
    return false;
  }

  return payload.exp * 1000 <= Date.now();
}

function readUserCandidate(value: unknown): Partial<AuthUser> | null {
  if (!isRecord(value)) {
    return null;
  }

  const firstName = typeof value.firstName === "string" ? value.firstName : "";
  const lastName = typeof value.lastName === "string" ? value.lastName : "";
  const compositeName = `${firstName} ${lastName}`.trim();

  return {
    email: typeof value.email === "string" ? value.email : undefined,
    id: typeof value.id === "string" ? value.id : undefined,
    name:
      typeof value.name === "string"
        ? value.name
        : typeof value.fullName === "string"
          ? value.fullName
          : compositeName || undefined,
    role: normalizeRole(value.role) ?? undefined,
  };
}

function extractToken(payload: unknown): string | null {
  if (!isRecord(payload)) {
    return null;
  }

  const candidates = [payload.token, payload.accessToken, payload.jwt];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate;
    }
  }

  return null;
}

function extractUser(payload: unknown, token: string): AuthUser | null {
  const payloadRecord = isRecord(payload) ? payload : {};
  const tokenPayload = decodeJwtPayload(token);
  const tokenUser = readUserCandidate(tokenPayload);
  const nestedUser = readUserCandidate(payloadRecord.user);
  const nestedUserRecord = isRecord(payloadRecord.user) ? payloadRecord.user : {};

  const role =
    normalizeRole(payloadRecord.role) ??
    nestedUser?.role ??
    tokenUser?.role ??
    normalizeRole(tokenPayload?.role);

  if (!role) {
    return null;
  }

  return {
    email:
      nestedUser?.email ??
      tokenUser?.email ??
      (typeof payloadRecord.email === "string" ? payloadRecord.email : undefined),
    id:
      nestedUser?.id ??
      tokenUser?.id ??
      (typeof payloadRecord.id === "string" ? payloadRecord.id : ""),
    name:
      nestedUser?.name ??
      tokenUser?.name ??
      (typeof payloadRecord.name === "string" ? payloadRecord.name : "HealthLink User"),
    role,
    status:
      typeof nestedUserRecord.verificationStatus === "string"
        ? (nestedUserRecord.verificationStatus as AuthUser["status"])
        : typeof nestedUserRecord.verification_status === "string"
          ? (nestedUserRecord.verification_status as AuthUser["status"])
          : typeof nestedUserRecord.status === "string"
            ? (nestedUserRecord.status as AuthUser["status"])
            : typeof payloadRecord.verificationStatus === "string"
        ? (payloadRecord.verificationStatus as AuthUser["status"])
        : typeof payloadRecord.verification_status === "string"
          ? (payloadRecord.verification_status as AuthUser["status"])
          : nestedUser && "verificationStatus" in nestedUser
            ? (nestedUser as AuthUser).verificationStatus ?? null
            : typeof payloadRecord.status === "string"
              ? (payloadRecord.status as AuthUser["status"])
              : null,
    verificationStatus:
      typeof nestedUserRecord.verificationStatus === "string"
        ? (nestedUserRecord.verificationStatus as AuthUser["verificationStatus"])
        : typeof nestedUserRecord.verification_status === "string"
          ? (nestedUserRecord.verification_status as AuthUser["verificationStatus"])
          : typeof nestedUserRecord.status === "string"
            ? (nestedUserRecord.status as AuthUser["verificationStatus"])
            : typeof payloadRecord.verificationStatus === "string"
        ? (payloadRecord.verificationStatus as AuthUser["verificationStatus"])
        : typeof payloadRecord.verification_status === "string"
          ? (payloadRecord.verification_status as AuthUser["verificationStatus"])
          : typeof payloadRecord.status === "string"
            ? (payloadRecord.status as AuthUser["verificationStatus"])
            : null,
    verificationNotes:
      typeof nestedUserRecord.verificationNotes === "string"
        ? nestedUserRecord.verificationNotes
        : typeof nestedUserRecord.verification_notes === "string"
          ? nestedUserRecord.verification_notes
          : typeof payloadRecord.verificationNotes === "string"
        ? payloadRecord.verificationNotes
        : typeof payloadRecord.verification_notes === "string"
          ? payloadRecord.verification_notes
          : null,
  };
}

export function getApprovalStatus(user: AuthUser | null | undefined) {
  const rawStatus = String(user?.verificationStatus || user?.status || "").trim().toLowerCase();
  if (
    rawStatus === "pending" ||
    rawStatus === "approved" ||
    rawStatus === "rejected" ||
    rawStatus === "suspended"
  ) {
    return rawStatus;
  }

  return null;
}

export function requiresApprovalGate(user: AuthUser | null | undefined) {
  if (!user) {
    return false;
  }

  if (!["doctor", "pharmacist", "medical_center_admin"].includes(user.role)) {
    return false;
  }

  const status = getApprovalStatus(user);
  return Boolean(status && status !== "approved");
}

export async function login(credentials: LoginCredentials): Promise<StoredSession> {
  try {
    const response = await api.post<LoginResponse>("/api/auth/login", credentials);
    const token = extractToken(response.data);

    if (!token) {
      throw new Error("Login response did not include a valid token.");
    }

    const user = extractUser(response.data, token);

    if (!user) {
      throw new Error("Login response did not include a valid user role.");
    }

    if (isTokenExpired(token)) {
      throw new Error("Your session has already expired. Please sign in again.");
    }

    return { token, user };
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Unable to sign in. Check your credentials and try again."));
  }
}

export async function validateResetTokenRequest(token: string) {
  await api.post("/api/auth/validate-reset-token", { token });
}

export async function resetPasswordRequest(payload: { token: string; password: string }) {
  await api.post("/api/auth/reset-password", payload);
}

export async function setPasswordRequest(payload: { token: string; password: string }) {
  const response = await api.post<SetPasswordResponse>("/api/auth/set-password", payload);
  return {
    message:
      typeof response.data.message === "string" && response.data.message.trim()
        ? response.data.message
        : "Password set successfully.",
  };
}

export function getDefaultRouteForRole(role: UserRole) {
  switch (role) {
    case "admin":
      return "/admin/dashboard";
    case "medical_center_admin":
      return "/center/dashboard";
    case "pharmacist":
      return "/pharmacy/dashboard";
    case "doctor":
      return "/doctor/dashboard";
    case "receptionist":
      return "/receptionist/dashboard";
    default:
      return "/login";
  }
}

export function getDefaultRouteForUser(user: AuthUser) {
  if (requiresApprovalGate(user)) {
    return "/approval-status";
  }

  return getDefaultRouteForRole(user.role);
}

export function getBaseRouteForRole(role: UserRole) {
  switch (role) {
    case "admin":
      return "/admin";
    case "medical_center_admin":
      return "/center";
    case "pharmacist":
      return "/pharmacy";
    case "doctor":
      return "/doctor";
    case "receptionist":
      return "/receptionist";
    default:
      return "/login";
  }
}

export function readStoredSession(): StoredSession {
  if (typeof window === "undefined") {
    return { token: null, user: null };
  }

  try {
    const token = readStoredToken();
    const user = readStoredUser(token);

    if (!token || !user) {
      clearStoredSession(false);
      return { token: null, user: null };
    }

    if (isTokenExpired(token)) {
      clearStoredSession(false);
      return { token: null, user: null };
    }

    return { token, user };
  } catch {
    clearStoredSession(false);
    return { token: null, user: null };
  }
}

export function readStoredToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const directToken = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)?.trim();
  if (directToken) {
    return directToken;
  }

  const rawSession = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!rawSession) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawSession) as StoredSession;
    if (parsed.token?.trim()) {
      window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, parsed.token);
      return parsed.token;
    }
  } catch {
    return null;
  }

  return null;
}

function readStoredUser(token: string | null): AuthUser | null {
  if (typeof window === "undefined" || !token) {
    return null;
  }

  const rawUser = window.localStorage.getItem(AUTH_USER_STORAGE_KEY);
  if (rawUser) {
    try {
      const parsedUser = JSON.parse(rawUser) as AuthUser;
      if (parsedUser?.role && parsedUser?.name) {
        return parsedUser;
      }
    } catch {
      window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
    }
  }

  const rawSession = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (rawSession) {
    try {
      const parsed = JSON.parse(rawSession) as StoredSession;
      if (parsed.user) {
        window.localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(parsed.user));
        return parsed.user;
      }
    } catch {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }

  const user = extractUser({}, token);

  if (!user) {
    return null;
  }

  window.localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
  return user;
}

export function setStoredSession(session: StoredSession) {
  if (!session.token || !session.user) {
    clearStoredSession(false);
    return;
  }

  window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, session.token);
  window.localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(session.user));
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  window.dispatchEvent(new CustomEvent(AUTH_SESSION_UPDATED_EVENT));
}

export function clearStoredSession(dispatchEvent = true) {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);

  if (dispatchEvent) {
    window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
  }
}

export function hasExpiredStoredSession() {
  const token = readStoredToken();
  return token ? isTokenExpired(token) : false;
}

export { UNAUTHORIZED_EVENT };
export { login as loginRequest };

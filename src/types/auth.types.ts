import type { UserRole } from "./user.types";

export type AuthUser = {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
  status?: "pending" | "approved" | "rejected" | "suspended" | null;
  verificationStatus?: "pending" | "approved" | "rejected" | "suspended" | null;
  verificationNotes?: string | null;
};

export type LoginCredentials = {
  email: string;
  password: string;
};

export type StoredSession = {
  token: string | null;
  user: AuthUser | null;
};

export type AuthContextValue = {
  isAuthenticated: boolean;
  isInitializing: boolean;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<AuthUser>;
  logout: () => void;
  token: string | null;
  user: AuthUser | null;
};

export type LoginResponse = {
  token?: string;
  accessToken?: string;
  jwt?: string;
  role?: string;
  id?: string;
  name?: string;
  email?: string;
  user?: Record<string, unknown>;
};

export type SetPasswordResponse = LoginResponse & {
  message?: string;
};

export type TokenPayload = Record<string, unknown> & {
  exp?: number;
};

import type { UserRole } from "./user.types";

export type AuthUser = {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
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

export type TokenPayload = Record<string, unknown> & {
  exp?: number;
};

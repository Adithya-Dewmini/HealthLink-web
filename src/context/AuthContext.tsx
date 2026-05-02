import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import {
  clearStoredSession,
  login as loginRequest,
  readStoredSession,
  setStoredSession,
  UNAUTHORIZED_EVENT,
} from "../services/auth.service";
import type { AuthContextValue, LoginCredentials, StoredSession } from "../types/auth.types";

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<StoredSession>({ token: null, user: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSession(readStoredSession());
    setLoading(false);
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      setSession({ token: null, user: null });
      setLoading(false);
    };

    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setLoading(true);

    try {
      const nextSession = await loginRequest(credentials);
      setStoredSession(nextSession);
      setSession(nextSession);
      return nextSession.user as NonNullable<StoredSession["user"]>;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setLoading(true);
    clearStoredSession();
    setSession({ token: null, user: null });
    setLoading(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: Boolean(session.token && session.user),
      isInitializing: loading && !session.token && !session.user,
      loading,
      login,
      logout,
      token: session.token,
      user: session.user,
    }),
    [loading, login, logout, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

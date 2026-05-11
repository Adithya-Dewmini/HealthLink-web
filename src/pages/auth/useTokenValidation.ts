import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

export type TokenValidationStatus =
  | "missing"
  | "validating"
  | "valid"
  | "invalid";

export type TokenValidationState<T = unknown> = {
  token: string;
  status: TokenValidationStatus;
  data: T | null;
  error: string | null;
  isValidating: boolean;
  isChecking: boolean;
  isValid: boolean;
  isInvalid: boolean;
};

export function useTokenValidation<T = unknown>(
  validateToken: (token: string) => Promise<T>
): TokenValidationState<T> {
  const [searchParams] = useSearchParams();

  const token = useMemo(() => {
    return searchParams.get("token")?.trim() ?? "";
  }, [searchParams]);

  const [status, setStatus] = useState<TokenValidationStatus>(
    token ? "validating" : "missing"
  );
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function runValidation() {
      if (!token) {
        if (!mounted) return;
        setStatus("missing");
        setError("Invalid or missing token.");
        setData(null);
        return;
      }

      try {
        setStatus("validating");
        setError(null);

        const result = await validateToken(token);

        if (!mounted) return;
        setData(result);
        setStatus("valid");
      } catch (caughtError) {
        if (!mounted) return;
        setData(null);
        setStatus("invalid");
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Token validation failed."
        );
      }
    }

    void runValidation();

    return () => {
      mounted = false;
    };
  }, [token, validateToken]);

  return {
    token,
    status,
    data,
    error,
    isValidating: status === "validating",
    isChecking: status === "validating",
    isValid: status === "valid",
    isInvalid: status === "invalid" || status === "missing",
  };
}
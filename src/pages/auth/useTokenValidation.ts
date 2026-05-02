import { useEffect, useMemo, useState } from "react";

type TokenStatus = "idle" | "validating" | "valid" | "invalid";

type ValidateTokenFn = (token: string) => Promise<void>;

export function useTokenValidation(validateToken: ValidateTokenFn) {
  const token = useMemo(
    () => new URLSearchParams(window.location.search).get("token")?.trim() || "",
    []
  );
  const [status, setStatus] = useState<TokenStatus>(token ? "idle" : "invalid");
  const [error, setError] = useState(token ? "" : "Missing token.");

  useEffect(() => {
    if (!token) {
      return;
    }

    let isActive = true;

    const runValidation = async () => {
      setStatus("validating");
      setError("");

      try {
        await validateToken(token);

        if (!isActive) {
          return;
        }

        setStatus("valid");
      } catch (caughtError) {
        if (!isActive) {
          return;
        }

        setStatus("invalid");
        setError(caughtError instanceof Error ? caughtError.message : "Unable to validate link.");
      }
    };

    void runValidation();

    return () => {
      isActive = false;
    };
  }, [token, validateToken]);

  return {
    error,
    isValid: status === "valid",
    status,
    token,
  };
}

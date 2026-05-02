import { useEffect, useState, type FormEvent } from "react";
import Button from "../../components/ui/Button";
import { setPasswordRequest, validateResetTokenRequest } from "../../services/auth.service";
import { MOBILE_LOGIN_LINK } from "../../utils/constants";
import { useTokenValidation } from "./useTokenValidation";

export default function SetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const tokenState = useTokenValidation(validateResetTokenRequest);

  useEffect(() => {
    if (!isSuccess) {
      return;
    }

    const timer = window.setTimeout(() => {
      window.location.href = MOBILE_LOGIN_LINK;
    }, 1600);

    return () => window.clearTimeout(timer);
  }, [isSuccess]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!tokenState.token) {
      setSubmitError("Missing setup token.");
      return;
    }

    if (!tokenState.isValid) {
      setSubmitError(tokenState.error || "Invalid setup link.");
      return;
    }

    if (password.trim().length < 8) {
      setSubmitError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setSubmitError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      await setPasswordRequest({
        password,
        token: tokenState.token,
      });
      setIsSuccess(true);
    } catch (caughtError) {
      setSubmitError(
        caughtError instanceof Error ? caughtError.message : "Unable to set your password."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-shell">
      <section className="form-card">
        <div className="section-badge">HealthLink</div>
        <h1 className="section-title">Set your password</h1>
        <p className="section-copy">Complete account setup to access your workspace.</p>

        {tokenState.error ? <div className="message message-error">{tokenState.error}</div> : null}
        {tokenState.status === "validating" ? (
          <div className="message">Validating your invite link...</div>
        ) : null}

        {isSuccess ? (
          <div className="message message-success">
            <strong>Password set successfully.</strong>
            <span>Redirecting you to the HealthLink app.</span>
          </div>
        ) : tokenState.isValid ? (
          <form className="form-stack" onSubmit={handleSubmit}>
            <label className="field-group">
              <span className="field-label">New password</span>
              <input
                className="field-input"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
              />
            </label>

            <label className="field-group">
              <span className="field-label">Confirm password</span>
              <input
                className="field-input"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
              />
            </label>

            {submitError ? <div className="message message-error">{submitError}</div> : null}

            <Button type="submit" fullWidth disabled={isSubmitting}>
              {isSubmitting ? "Setting password..." : "Set password"}
            </Button>
          </form>
        ) : null}
      </section>
    </div>
  );
}

import { useState, type FormEvent } from "react";
import Button from "../../components/ui/Button";
import { resetPasswordRequest, validateResetTokenRequest } from "../../services/auth.service";
import { useTokenValidation } from "./useTokenValidation";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const tokenState = useTokenValidation(validateResetTokenRequest);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!tokenState.token) {
      setSubmitError("Missing reset token.");
      return;
    }

    if (!tokenState.isValid) {
      setSubmitError(tokenState.error || "Invalid or expired link.");
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
      await resetPasswordRequest({
        password,
        token: tokenState.token,
      });
      window.location.href = "/login";
    } catch (caughtError) {
      setSubmitError(caughtError instanceof Error ? caughtError.message : "Reset failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-shell">
      <section className="form-card">
        <div className="section-badge">HealthLink</div>
        <h1 className="section-title">Reset your password</h1>
        <p className="section-copy">Enter a new password to continue.</p>

        {tokenState.error ? <div className="message message-error">{tokenState.error}</div> : null}
        {tokenState.status === "validating" ? (
          <div className="message">Validating your reset link...</div>
        ) : null}

        {tokenState.isValid ? (
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
              {isSubmitting ? "Resetting..." : "Reset password"}
            </Button>
          </form>
        ) : null}
      </section>
    </div>
  );
}

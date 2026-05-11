import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button";
import { setPasswordRequest, validateResetTokenRequest } from "../../services/auth.service";
import { useAuth } from "../../hooks/useAuth";
import { useTokenValidation } from "./useTokenValidation";

export default function SetPasswordPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const tokenState = useTokenValidation(validateResetTokenRequest);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!tokenState.token) {
      setSubmitError("Missing setup token.");
      return;
    }

    if (!tokenState.isValid) {
      setSubmitError(tokenState.error || "Invalid or expired setup link.");
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
      const result = await setPasswordRequest({
        password,
        token: tokenState.token,
      });
      logout();
      navigate("/login", {
        replace: true,
        state: {
          initialEmail: "",
          flashMessage: result.message || "Password set successfully. Please log in.",
        },
      });
    } catch (caughtError) {
      setSubmitError(
        caughtError instanceof Error ? caughtError.message : "Unable to complete password setup."
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
        <p className="section-copy">Create a password to activate your HealthLink account.</p>

        {tokenState.error ? <div className="message message-error">{tokenState.error}</div> : null}
        {tokenState.isValidating ? (
          <div className="message">Validating your setup link...</div>
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
              {isSubmitting ? "Setting password..." : "Set password"}
            </Button>
          </form>
        ) : null}
      </section>
    </div>
  );
}

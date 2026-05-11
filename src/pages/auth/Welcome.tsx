import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button";
import { getWelcomeMessageForRole } from "./passwordSetupOnboarding";
import { useAuth } from "../../hooks/useAuth";

export default function WelcomePage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const role = "receptionist";

  useEffect(() => {
    logout();

    const timer = window.setTimeout(() => {
      navigate("/login", {
        replace: true,
        state: {
          flashMessage: "Password set successfully. Please log in.",
        },
      });
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [logout, navigate]);

  const handleGoToLogin = () => {
    navigate("/login", {
      replace: true,
      state: {
        flashMessage: "Password set successfully. Please log in.",
      },
    });
  };

  return (
    <div className="page-shell onboarding-shell">
      <section className="form-card onboarding-card onboarding-card-enter">
        <div className="onboarding-icon onboarding-icon-success onboarding-icon-enter">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 2.75A9.25 9.25 0 1 0 21.25 12 9.26 9.26 0 0 0 12 2.75Zm4.08 7.74-4.76 4.76a.875.875 0 0 1-1.24 0l-2.16-2.16a.875.875 0 1 1 1.24-1.24l1.54 1.54 4.14-4.14a.875.875 0 0 1 1.24 1.24Z"
              fill="currentColor"
            />
          </svg>
        </div>

        <div className="onboarding-copy">
          <h1 className="section-title onboarding-title">Welcome to HealthLink</h1>
          <p className="section-copy onboarding-copy-text">
            Your account has been activated successfully.
          </p>
          <p className="onboarding-role-message">{getWelcomeMessageForRole(role)}</p>
        </div>

        <Button className="onboarding-dashboard-button" onClick={handleGoToLogin}>
          Go to login
        </Button>
      </section>
    </div>
  );
}

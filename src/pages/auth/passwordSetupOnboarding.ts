import type { AuthUser, StoredSession } from "../../types/auth.types";
import type { UserRole } from "../../types/user.types";
import { getDefaultRouteForRole } from "../../services/auth.service";

const PASSWORD_SETUP_ONBOARDING_KEY = "hl.password-setup-onboarding";

export type PasswordSetupOnboardingState = {
  dashboardPath: string;
  user: AuthUser;
};

function canUseBrowserStorage() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

export function savePasswordSetupOnboarding(session: StoredSession) {
  if (!canUseBrowserStorage() || !session.user) {
    return;
  }

  const payload: PasswordSetupOnboardingState = {
    dashboardPath: getDefaultRouteForRole(session.user.role),
    user: session.user,
  };

  window.sessionStorage.setItem(PASSWORD_SETUP_ONBOARDING_KEY, JSON.stringify(payload));
}

export function readPasswordSetupOnboarding(): PasswordSetupOnboardingState | null {
  if (!canUseBrowserStorage()) {
    return null;
  }

  const rawValue = window.sessionStorage.getItem(PASSWORD_SETUP_ONBOARDING_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as PasswordSetupOnboardingState;
    if (!parsed?.user?.role || !parsed?.dashboardPath) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function clearPasswordSetupOnboarding() {
  if (!canUseBrowserStorage()) {
    return;
  }

  window.sessionStorage.removeItem(PASSWORD_SETUP_ONBOARDING_KEY);
}

export function getWelcomeMessageForRole(role: UserRole) {
  switch (role) {
    case "doctor":
      return "Your account will be reviewed by admin before activation.";
    case "admin":
      return "You can now manage the platform.";
    case "pharmacist":
      return "You can now manage inventory and prescriptions.";
    case "medical_center_admin":
      return "You can now coordinate clinic operations, staff, and schedules.";
    case "receptionist":
      return "You can now manage bookings and front-desk workflows.";
    default:
      return "Your account has been activated successfully.";
  }
}

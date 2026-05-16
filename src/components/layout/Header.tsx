import Button from "../ui/Button";
import type { AuthUser } from "../../types/auth.types";
import type { ReceptionHeaderAction } from "../../utils/constants";
import {
  CalendarClock,
  CalendarDays,
  ListOrdered,
  LogOut,
  Play,
  SkipForward,
  UserCheck,
  UserPlus,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";

type HeaderProps = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  contextLabel?: string;
  user: AuthUser | null;
  onLogout: () => void;
  variant?: "default" | "reception" | "center";
  actions?: ReceptionHeaderAction[];
};

const headerActionIcons: Record<string, LucideIcon> = {
  CalendarClock,
  ListOrdered,
  Play,
  SkipForward,
  UserCheck,
  UserPlus,
  UserRound,
};

const formatToday = () =>
  new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date());

export default function Header({
  contextLabel,
  eyebrow,
  onLogout,
  subtitle,
  title,
  user,
  variant = "default",
  actions = [],
}: HeaderProps) {
  const isReception = variant === "reception";
  const isCenter = variant === "center";

  if (isReception) {
    return (
      <header className="app-header reception-topbar">
        <div className="reception-command-left">
          <div className="app-header-title-block">
            <p className="app-eyebrow">HealthLink Reception</p>
            <h1 className="app-title">{title}</h1>
            {subtitle ? <p className="app-subtitle">{subtitle}</p> : null}
          </div>
          <div className="reception-context-row">
            <span className="reception-date-pill">
              <CalendarDays size={14} />
              <span>{formatToday()}</span>
            </span>
            <span className="reception-context-pill">{contextLabel ?? "Medical center desk"}</span>
            <span className="reception-context-pill reception-status-pill">Desk active</span>
          </div>
        </div>

        <div className="reception-command-actions" aria-label="Reception workflow actions">
          {actions.map((action) => {
            const Icon = headerActionIcons[action.icon] ?? UserRound;
            return (
              <Link
                key={`${action.label}:${action.to}`}
                to={action.to}
                className={`reception-command-action${action.primary ? " reception-command-action-primary" : ""}`}
              >
                <Icon size={15} />
                <span>{action.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="reception-command-user">
          <div className="user-summary">
            <span className="user-avatar" aria-hidden="true">
              <UserRound size={16} />
            </span>
            <span className="user-summary-copy">
              <strong>{user?.name ?? "HealthLink User"}</strong>
              <span>{user?.email ?? user?.role ?? "Receptionist"}</span>
            </span>
          </div>
          <button type="button" className="reception-logout-action" onClick={onLogout} aria-label="Log out">
            <LogOut size={15} />
            <span>Logout</span>
          </button>
        </div>
      </header>
    );
  }

  return (
    <header className={`app-header${isCenter ? " center-topbar" : ""}`}>
      <div className="app-header-title-block">
        <p className="app-eyebrow">{eyebrow}</p>
        <h1 className="app-title">{title}</h1>
        {subtitle ? <p className="app-subtitle">{subtitle}</p> : null}
      </div>

      <div className="app-header-actions">
        <div className="user-summary">
          <span className="user-summary-copy">
            <strong>{user?.name ?? "HealthLink User"}</strong>
            <span>{user?.email ?? contextLabel ?? user?.role ?? "Authenticated session"}</span>
          </span>
        </div>
        <Button variant={isCenter ? "secondary" : "danger"} onClick={onLogout}>
          Log out
        </Button>
      </div>
    </header>
  );
}

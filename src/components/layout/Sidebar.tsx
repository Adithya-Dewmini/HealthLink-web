import { NavLink } from "react-router-dom";
import {
  CalendarClock,
  ClipboardList,
  LayoutDashboard,
  ListOrdered,
  Stethoscope,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

export type SidebarItem = {
  label: string;
  to?: string;
  disabled?: boolean;
  icon?: string;
  subtitle?: string;
};

type SidebarProps = {
  badge: string;
  title: string;
  description: string;
  items: SidebarItem[];
  variant?: "default" | "reception";
};

const iconMap: Record<string, LucideIcon> = {
  CalendarClock,
  ClipboardList,
  LayoutDashboard,
  ListOrdered,
  UsersRound,
};

export default function Sidebar({ badge, title, description, items, variant = "default" }: SidebarProps) {
  const isReception = variant === "reception";

  return (
    <aside className={`sidebar${isReception ? " reception-sidebar" : ""}`}>
      <div className="sidebar-section">
        {isReception ? (
          <div className="reception-brand">
            <div className="reception-brand-mark" aria-hidden="true">
              <Stethoscope size={22} />
            </div>
            <div>
              <div className="sidebar-badge">{badge}</div>
              <h2 className="sidebar-title">{title}</h2>
            </div>
          </div>
        ) : (
          <>
            <div className="sidebar-badge">{badge}</div>
            <h2 className="sidebar-title">{title}</h2>
          </>
        )}
        <p className="sidebar-description">{description}</p>
      </div>

      <nav className="sidebar-nav" aria-label={`${title} navigation`}>
        {items.map((item) => {
          const Icon = item.icon ? iconMap[item.icon] : null;

          if (item.disabled || !item.to) {
            return (
              <span key={item.label} className="sidebar-link sidebar-link-disabled">
                {Icon ? <Icon className="sidebar-link-icon" size={18} /> : null}
                <span className="sidebar-link-copy">
                  <span>{item.label}</span>
                  {item.subtitle ? <small>{item.subtitle}</small> : null}
                </span>
              </span>
            );
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `sidebar-link${isActive ? " sidebar-link-active" : ""}`
              }
            >
              {Icon ? <Icon className="sidebar-link-icon" size={18} /> : null}
              <span className="sidebar-link-copy">
                <span>{item.label}</span>
                {item.subtitle ? <small>{item.subtitle}</small> : null}
              </span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}

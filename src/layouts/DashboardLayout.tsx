import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Header from "../components/layout/Header";
import Sidebar, { type SidebarItem } from "../components/layout/Sidebar";
import { useAuth } from "../hooks/useAuth";
import { RECEPTION_HEADER_CONFIG } from "../utils/constants";

type DashboardLayoutProps = {
  badge: string;
  title: string;
  description: string;
  headerEyebrow: string;
  headerTitle: string;
  navigation: SidebarItem[];
  variant?: "default" | "reception";
};

export default function DashboardLayout({
  badge,
  description,
  headerEyebrow,
  headerTitle,
  navigation,
  title,
  variant = "default",
}: DashboardLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  const isReception = variant === "reception";
  const activeItem =
    navigation
      .filter((item) => item.to && location.pathname.startsWith(item.to))
      .sort((left, right) => (right.to?.length || 0) - (left.to?.length || 0))[0] ?? null;
  const receptionHeaderConfig = isReception
    ? Object.entries(RECEPTION_HEADER_CONFIG)
        .filter(([path]) => location.pathname.startsWith(path))
        .sort((left, right) => right[0].length - left[0].length)[0]?.[1]
    : undefined;

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className={`dashboard-shell${isReception ? " reception-shell" : ""}`}>
      <Sidebar
        badge={badge}
        title={title}
        description={description}
        items={navigation}
        variant={variant}
      />

      <div className="dashboard-main">
        <Header
          eyebrow={headerEyebrow}
          title={receptionHeaderConfig?.title ?? (isReception && activeItem ? activeItem.label : headerTitle)}
          subtitle={isReception ? receptionHeaderConfig?.subtitle ?? activeItem?.subtitle ?? "Front desk operations" : undefined}
          contextLabel={isReception ? "Medical center desk" : undefined}
          user={user}
          onLogout={handleLogout}
          variant={variant}
          actions={receptionHeaderConfig?.actions}
        />

        <main className="dashboard-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

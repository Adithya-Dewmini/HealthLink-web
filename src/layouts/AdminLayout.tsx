import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Sidebar, { type AdminSidebarSection } from "../components/Sidebar";
import { useAuth } from "../hooks/useAuth";

export type AdminLayoutProps = {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
};

const iconSet = {
  dashboard: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
      />
    </svg>
  ),
  banners: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 7a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V7zm3 8l3-3 2 2 3-4 2 5H7z"
      />
    </svg>
  ),
  verifications: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  users: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  ),
  centers: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m3-4h1m-1 4h1m-5 8h5M12 21v-4a1 1 0 00-1-1h-2a1 1 0 00-1 1v4"
      />
    </svg>
  ),
  doctors: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19.428 15.428a4 4 0 00-5.656 0M6 20h12M12 4a4 4 0 110 8 4 4 0 010-8z"
      />
    </svg>
  ),
  pharmacies: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19.428 15.341A8 8 0 118.659 4.572M9 12h6m-3-3v6"
      />
    </svg>
  ),
  monitoring: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 3v18h18M7 14l3-3 3 2 4-5"
      />
    </svg>
  ),
  audit: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 17v-2m3 2v-4m3 4V9M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z"
      />
    </svg>
  ),
  settings: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10.325 4.317a1 1 0 011.35-.936l1.145.573a1 1 0 00.894 0l1.145-.573a1 1 0 011.35.936l.104 1.278a1 1 0 00.566.826l1.175.587a1 1 0 01.442 1.34l-.52 1.167a1 1 0 000 .82l.52 1.167a1 1 0 01-.442 1.34l-1.175.587a1 1 0 00-.566.826l-.104 1.278a1 1 0 01-1.35.936l-1.145-.573a1 1 0 00-.894 0l-1.145.573a1 1 0 01-1.35-.936l-.104-1.278a1 1 0 00-.566-.826l-1.175-.587a1 1 0 01-.442-1.34l.52-1.167a1 1 0 000-.82l-.52-1.167a1 1 0 01.442-1.34l1.175-.587a1 1 0 00.566-.826l.104-1.278z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
};

const navigationSections: AdminSidebarSection[] = [
  {
    title: "Overview",
    items: [
      {
        name: "Dashboard",
        path: "/admin/dashboard",
        icon: iconSet.dashboard,
      },
      {
        name: "Dashboard Banners",
        path: "/admin/dashboard-banners",
        icon: iconSet.banners,
      },
    ],
  },
  {
    title: "Governance",
    items: [
      {
        name: "Verifications",
        path: "/admin/verifications",
        icon: iconSet.verifications,
      },
      {
        name: "Users",
        path: "/admin/users",
        icon: iconSet.users,
      },
      {
        name: "Audit Logs",
        path: "/admin/audit-logs",
        icon: iconSet.audit,
      },
    ],
  },
  {
    title: "Operations",
    items: [
      {
        name: "Medical Centers",
        path: "/admin/clinics",
        icon: iconSet.centers,
      },
      {
        name: "Doctors",
        path: "/admin/doctors",
        icon: iconSet.doctors,
      },
      {
        name: "Pharmacies",
        path: "/admin/pharmacies",
        icon: iconSet.pharmacies,
      },
      {
        name: "System Monitoring",
        path: "/admin/monitoring",
        icon: iconSet.monitoring,
      },
    ],
  },
  {
    title: "Platform",
    items: [
      {
        name: "Settings",
        icon: iconSet.settings,
        disabled: true,
      },
    ],
  },
];

export default function AdminLayout({ children, title, subtitle }: AdminLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const userSummary = useMemo(
    () => ({
      name: user?.name ?? "HealthLink Admin",
      email: user?.email ?? "admin@healthlink.com",
    }),
    [user]
  );

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#F2F3F7] font-sans selection:bg-[#90D2F5] selection:text-[#053F56]">
      <Sidebar
        activePath={location.pathname}
        brandSubtitle="Global Admin"
        brandTitle="HealthLink"
        isOpen={isSidebarOpen}
        navLabel="Admin navigation"
        setIsOpen={setIsSidebarOpen}
        sections={navigationSections}
        versionLabel="v2.4.1 (Production)"
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          title={title}
          subtitle={subtitle}
          theme="admin"
          user={userSummary}
          onMenuToggle={() => setIsSidebarOpen(true)}
          onLogout={handleLogout}
        />

        <main className="flex-1 overflow-y-auto bg-[#F2F3F7] p-6">{children}</main>
      </div>
    </div>
  );
}

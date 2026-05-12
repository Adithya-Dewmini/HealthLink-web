import { useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Sidebar, { type AdminSidebarSection } from "../components/Sidebar";
import { useAuth } from "../hooks/useAuth";

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
  queues: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  ),
  visits: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
      />
    </svg>
  ),
  patients: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17 20h5V4H2v16h5m10 0v-2a4 4 0 00-4-4H9a4 4 0 00-4 4v2m12 0H7m10-9a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  ),
  sessions: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10m-11 9h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v11a2 2 0 002 2z"
      />
    </svg>
  ),
  createSession: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  liveQueue: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h2m0-14h6m-6 14h6m0 0h2a2 2 0 002-2v-2m-2 2V9a2 2 0 00-2-2h-2m0 0V5m0 2h-4" />
    </svg>
  ),
  checkIn: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7M5 5h14v14H5z" />
    </svg>
  ),
  walkIns: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v6m3-3h-6M12 7a4 4 0 11-8 0 4 4 0 018 0zm-7 13a7 7 0 0114 0" />
    </svg>
  ),
  bookings: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  lateMissed: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  reports: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-6m4 6V7m4 10v-3M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
  notifications: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0a3 3 0 11-6 0h6z" />
    </svg>
  ),
  settings: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317a1 1 0 011.35-.936l1.84.737a1 1 0 00.805 0l1.84-.737a1 1 0 011.35.936l.177 1.93a1 1 0 00.5.78l1.64.95a1 1 0 01.367 1.366l-.91 1.71a1 1 0 000 .948l.91 1.71a1 1 0 01-.367 1.366l-1.64.95a1 1 0 00-.5.78l-.177 1.93a1 1 0 01-1.35.936l-1.84-.737a1 1 0 00-.805 0l-1.84.737a1 1 0 01-1.35-.936l-.177-1.93a1 1 0 00-.5-.78l-1.64-.95a1 1 0 01-.367-1.366l.91-1.71a1 1 0 000-.948l-.91-1.71a1 1 0 01.367-1.366l1.64-.95a1 1 0 00.5-.78l.177-1.93z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
};

const navigationSections: AdminSidebarSection[] = [
  {
    title: "Workspace",
    items: [
      { name: "Dashboard", path: "/receptionist/dashboard", icon: iconSet.dashboard },
      { name: "Today Sessions", path: "/receptionist/sessions", icon: iconSet.sessions },
      { name: "Doctor Schedule", path: "/receptionist/create-session", icon: iconSet.createSession },
      { name: "Live Queue", path: "/receptionist/live-queue", icon: iconSet.liveQueue },
    ],
  },
  {
    title: "Patient Flow",
    items: [
      { name: "Check-in", path: "/receptionist/check-in", icon: iconSet.checkIn },
      { name: "Walk-ins", path: "/receptionist/walk-ins", icon: iconSet.walkIns },
      { name: "Bookings", path: "/receptionist/bookings", icon: iconSet.bookings },
      { name: "Late / Missed", path: "/receptionist/late-missed", icon: iconSet.lateMissed },
    ],
  },
  {
    title: "Records",
    items: [
      { name: "Patients", path: "/receptionist/patients", icon: iconSet.patients },
      { name: "Reports", path: "/receptionist/reports", icon: iconSet.reports },
    ],
  },
  {
    title: "Account",
    items: [
      { name: "Notifications", path: "/receptionist/notifications", icon: iconSet.notifications },
      { name: "Settings", path: "/receptionist/settings", icon: iconSet.settings },
    ],
  },
];

const pageMeta: Record<string, { title: string; subtitle: string }> = {
  "/receptionist/dashboard": {
    title: "Dashboard",
    subtitle: "Watch queue flow, arrival pressure, and check-in readiness from a calmer front desk command view.",
  },
  "/receptionist/live-queue": {
    title: "Live Queue",
    subtitle: "Run the live patient flow with clearer queue state, calling order, and desk control.",
  },
  "/receptionist/check-in": {
    title: "Check-in",
    subtitle: "Review booked patients and move arrivals through the desk flow quickly.",
  },
  "/receptionist/walk-ins": {
    title: "Walk-ins",
    subtitle: "Handle unscheduled arrivals and attach them safely to today’s desk flow.",
  },
  "/receptionist/bookings": {
    title: "Bookings",
    subtitle: "Track appointment bookings, desk intake, and visit preparation without losing context.",
  },
  "/receptionist/late-missed": {
    title: "Late / Missed",
    subtitle: "Review patients who are late, missed, or need a front-desk follow-up decision.",
  },
  "/receptionist/patients": {
    title: "Patients",
    subtitle: "Search, register, and attach patients to the desk workflow with less friction.",
  },
  "/receptionist/sessions": {
    title: "Today Sessions",
    subtitle: "Review doctor session readiness and queue coverage across the clinic desk.",
  },
  "/receptionist/create-session": {
    title: "Doctor Schedule",
    subtitle: "Set weekly doctor sessions and add extra sessions when needed.",
  },
  "/receptionist/reports": {
    title: "Reports",
    subtitle: "Review receptionist-facing operational summaries and front-desk clinic activity.",
  },
  "/receptionist/notifications": {
    title: "Notifications",
    subtitle: "Stay aware of desk alerts, patient flow changes, and session readiness updates.",
  },
  "/receptionist/settings": {
    title: "Settings",
    subtitle: "Manage receptionist panel preferences and workflow-focused account options.",
  },
};

export default function ReceptionLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const normalizedPath = useMemo(() => {
    if (location.pathname === "/reception") return "/receptionist";
    if (location.pathname.startsWith("/reception/")) {
      return location.pathname.replace("/reception/", "/receptionist/");
    }
    return location.pathname;
  }, [location.pathname]);

  const activeMeta =
    Object.entries(pageMeta)
      .filter(([path]) => normalizedPath.startsWith(path))
      .sort((left, right) => right[0].length - left[0].length)[0]?.[1] ?? pageMeta["/receptionist/dashboard"];

  const userSummary = useMemo(
    () => ({
      name: user?.name ?? "HealthLink Reception",
      email: user?.email ?? "reception@healthlink.com",
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
        activePath={`${normalizedPath}${location.search}`}
        brandSubtitle="Reception Panel"
        brandTitle="HealthLink"
        isOpen={isSidebarOpen}
        navLabel="Reception navigation"
        setIsOpen={setIsSidebarOpen}
        sections={navigationSections}
        theme="pharmacy"
        versionLabel="v2.4.1 (Production)"
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          title={activeMeta.title}
          subtitle={activeMeta.subtitle}
          theme="pharmacy"
          user={userSummary}
          searchPlaceholder="Search patients, visits, queues, or sessions"
          searchHint="Search across desk operations, patient records, and today’s sessions."
          onMenuToggle={() => setIsSidebarOpen(true)}
          onLogout={handleLogout}
        />

        <main className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_left,rgba(186,230,253,0.22),transparent_22%),linear-gradient(180deg,#f7faff_0%,#f2f5fb_100%)] p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

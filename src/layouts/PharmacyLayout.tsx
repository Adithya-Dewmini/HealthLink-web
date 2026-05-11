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
  inventory: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M20 7l-8 4-8-4m16 0l-8-4-8 4m16 0v10l-8 4m8-14l-8 4m0 10L4 17V7m8 14V11"
      />
    </svg>
  ),
  orders: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
      />
    </svg>
  ),
  storefront: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 7l1.664 9.151A2 2 0 006.632 18h10.736a2 2 0 001.968-1.849L21 7M8 7V5a4 4 0 118 0v2M9 11h.01M15 11h.01"
      />
    </svg>
  ),
  insights: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 3v18h18M7 14l3-3 3 2 4-5"
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
        path: "/pharmacy/dashboard",
        icon: iconSet.dashboard,
      },
    ],
  },
  {
    title: "Operations",
    items: [
      {
        name: "Inventory",
        path: "/pharmacy/inventory",
        icon: iconSet.inventory,
      },
      {
        name: "Orders",
        path: "/pharmacy/orders",
        icon: iconSet.orders,
        children: [
          { name: "New", path: "/pharmacy/orders?status=new" },
          { name: "Pending", path: "/pharmacy/orders?status=pending" },
          { name: "In Progress", path: "/pharmacy/orders?status=in_progress" },
          { name: "Completed", path: "/pharmacy/orders?status=completed" },
          { name: "Cancelled", path: "/pharmacy/orders?status=cancelled" },
        ],
      },
    ],
  },
  {
    title: "Commerce",
    items: [
      {
        name: "Storefront",
        path: "/pharmacy/storefront",
        icon: iconSet.storefront,
      },
      {
        name: "Insights",
        path: "/pharmacy/insights",
        icon: iconSet.insights,
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

const pageMeta: Record<string, { title: string; subtitle: string }> = {
  "/pharmacy/dashboard": {
    title: "Dashboard",
    subtitle: "Monitor revenue, stock pressure, fulfillment pace, and pharmacy demand signals.",
  },
  "/pharmacy/inventory": {
    title: "Inventory",
    subtitle: "Control live stock, watch shortages, and keep storefront availability healthy.",
  },
  "/pharmacy/orders": {
    title: "Orders",
    subtitle: "Coordinate pickup and delivery handoff with a cleaner fulfillment command view.",
  },
  "/pharmacy/storefront": {
    title: "Storefront",
    subtitle: "Control published marketplace products, visibility, and prescription-ready catalog coverage.",
  },
  "/pharmacy/insights": {
    title: "Insights",
    subtitle: "Read forecast pressure, order momentum, and stock risk with clearer operating signals.",
  },
};

export default function PharmacyLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const activeMeta =
    Object.entries(pageMeta)
      .filter(([path]) => location.pathname.startsWith(path))
      .sort((left, right) => right[0].length - left[0].length)[0]?.[1] ?? pageMeta["/pharmacy/dashboard"];

  const userSummary = useMemo(
    () => ({
      name: user?.name ?? "HealthLink Pharmacy",
      email: user?.email ?? "pharmacy@healthlink.com",
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
        activePath={`${location.pathname}${location.search}`}
        brandSubtitle="Pharmacy Panel"
        brandTitle="HealthLink"
        isOpen={isSidebarOpen}
        navLabel="Pharmacy navigation"
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

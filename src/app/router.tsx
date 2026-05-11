import { createBrowserRouter, Navigate, useLocation } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";
import AdminLayout from "../layouts/AdminLayout";
import AdminAuditLogsPage from "../pages/admin/AuditLogs";
import CenterLayout from "../layouts/CenterLayout";
import DoctorLayout from "../layouts/DoctorLayout";
import PharmacyLayout from "../layouts/PharmacyLayout";
import ReceptionLayout from "../layouts/ReceptionLayout";
import AdminClinicsPage from "../pages/admin/MedicalCentersList";
import AdminDoctorDetailsPage from "../pages/admin/DoctorDetails";
import AdminDoctorsPage from "../pages/admin/DoctorsList";
import AdminDashboardPage from "../pages/admin/Dashboard";
import AdminDashboardBannersPage from "../pages/admin/DashboardBanners";
import AdminMedicalCenterDetailsPage from "../pages/admin/MedicalCenterDetails";
import AdminPharmaciesPage from "../pages/admin/PharmaciesList";
import AdminPharmacyDetailsPage from "../pages/admin/PharmacyDetails";
import AdminSystemMonitoringPage from "../pages/admin/SystemMonitoring";
import AdminUserDetailsPage from "../pages/admin/UserDetails";
import AdminUsersPage from "../pages/admin/UsersList";
import AdminVerificationsPage from "../pages/admin/VerificationsList";
import VerificationDetailPage from "../pages/admin/VerificationDetails";
import CenterDashboardPage from "../pages/center/Dashboard";
import DoctorDashboardPage from "../pages/doctor/Dashboard";
import LoginPage from "../pages/auth/Login";
import PasswordSuccessPage from "../pages/auth/PasswordSuccess";
import ResetPasswordPage from "../pages/auth/ResetPassword";
import SetPasswordPage from "../pages/auth/SetPassword";
import WelcomePage from "../pages/auth/Welcome";
import ApprovalStatusPage from "../pages/auth/ApprovalStatus";
import PharmacyDashboardPage from "../pages/pharmacy/Dashboard";
import PharmacyInsightsPage from "../pages/pharmacy/Insights";
import InventoryPage from "../pages/pharmacy/Inventory";
import OrdersPage from "../pages/pharmacy/Orders";
import StorefrontPage from "../pages/pharmacy/Storefront";
import ReceptionDashboardPage from "../pages/reception/ReceptionDashboard";
import ReceptionBookingsPage from "../pages/reception/ReceptionBookings";
import ReceptionCheckInPage from "../pages/reception/ReceptionCheckIn";
import ReceptionCreateSessionPage from "../pages/reception/ReceptionCreateSession";
import ReceptionLateMissedPage from "../pages/reception/ReceptionLateMissed";
import ReceptionNotificationsPage from "../pages/reception/ReceptionNotifications";
import ReceptionPatientsPage from "../pages/reception/ReceptionPatients";
import ReceptionQueuesPage from "../pages/reception/ReceptionQueues";
import ReceptionReportsPage from "../pages/reception/ReceptionReports";
import ReceptionSettingsPage from "../pages/reception/ReceptionSettings";
import ReceptionSessionCoveragePage from "../pages/reception/ReceptionSessionCoverage";
import ReceptionSessionManagementPage from "../pages/reception/ReceptionSessionManagement";
import ReceptionWalkInsPage from "../pages/reception/ReceptionWalkIns";
import { getDefaultRouteForUser } from "../services/auth.service";
import { useAuth } from "../hooks/useAuth";

function ReceptionPlaceholderPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
      <p className="text-[12px] uppercase tracking-[0.28em] text-slate-500">Receptionist Panel</p>
      <h1 className="mt-3 text-3xl font-semibold text-slate-950">{title}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">{description}</p>
    </div>
  );
}

function ReceptionLegacyRedirect() {
  const location = useLocation();
  const query = location.search || "";

  const mappedPath =
    location.pathname === "/reception" || location.pathname === "/reception/"
      ? "/receptionist/dashboard"
      : location.pathname
          .replace("/reception/queues", query.includes("walkin=1") ? "/receptionist/walk-ins" : "/receptionist/live-queue")
          .replace("/reception/visits", "/receptionist/bookings")
          .replace("/reception/patients", "/receptionist/patients")
          .replace("/reception/sessions", "/receptionist/sessions")
          .replace("/reception/dashboard", "/receptionist/dashboard")
          .replace("/reception/", "/receptionist/");

  return <Navigate to={`${mappedPath}${query}`} replace />;
}

function RootRedirect() {
  const { isAuthenticated, isInitializing, user } = useAuth();

  if (isInitializing) {
    return <div className="route-state">Loading your workspace...</div>;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getDefaultRouteForUser(user)} replace />;
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootRedirect />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/reset-password",
    element: <ResetPasswordPage />,
  },
  {
    path: "/set-password",
    element: <SetPasswordPage />,
  },
  {
    path: "/set-password/success",
    element: <PasswordSuccessPage />,
  },
  {
    path: "/setup-password",
    element: <SetPasswordPage />,
  },
  {
    path: "/welcome",
    element: <WelcomePage />,
  },
  {
    element: <ProtectedRoute allowedRoles={["medical_center_admin", "pharmacist", "doctor"]} />,
    children: [
      {
        path: "/approval-status",
        element: <ApprovalStatusPage />,
      },
    ],
  },
  {
    element: <ProtectedRoute allowedRoles={["admin"]} />,
    children: [
      {
        path: "/admin",
        element: <Navigate to="/admin/dashboard" replace />,
      },
      {
        path: "/admin/dashboard",
        element: (
          <AdminLayout title="Dashboard" subtitle="System overview and activity">
            <AdminDashboardPage />
          </AdminLayout>
        ),
      },
      {
        path: "/admin/dashboard-banners",
        element: (
          <AdminLayout
            title="Dashboard Banners"
            subtitle="Manage patient dashboard carousel campaigns"
          >
            <AdminDashboardBannersPage />
          </AdminLayout>
        ),
      },
      {
        path: "/admin/users",
        element: (
          <AdminLayout
            title="Users"
            subtitle="Manage platform access across all roles"
          >
            <AdminUsersPage />
          </AdminLayout>
        ),
      },
      {
        path: "/admin/users/:id",
        element: (
          <AdminLayout
            title="User Detail"
            subtitle="Inspect role context, ownership, linked records, and account state"
          >
            <AdminUserDetailsPage />
          </AdminLayout>
        ),
      },
      {
        path: "/admin/audit-logs",
        element: (
          <AdminLayout
            title="Audit Logs"
            subtitle="Inspect traceable governance, verification, and system accountability events"
          >
            <AdminAuditLogsPage />
          </AdminLayout>
        ),
      },
      {
        path: "/admin/verifications",
        element: (
          <AdminLayout
            title="Verifications"
            subtitle="Review pending clinic, doctor, and pharmacy approvals"
          >
            <AdminVerificationsPage />
          </AdminLayout>
        ),
      },
      {
        path: "/admin/verifications/:type/:id",
        element: (
          <AdminLayout
            title="Verification Detail"
            subtitle="Review submitted documents, metadata, and approval history"
          >
            <VerificationDetailPage />
          </AdminLayout>
        ),
      },
      {
        path: "/admin/clinics",
        element: (
          <AdminLayout
            title="Medical Centers"
            subtitle="Monitor medical center status, staffing, schedules, and activity"
          >
            <AdminClinicsPage />
          </AdminLayout>
        ),
      },
      {
        path: "/admin/clinics/:id",
        element: (
          <AdminLayout
            title="Medical Center Detail"
            subtitle="Inspect operations, staffing, schedules, queues, and activity"
          >
            <AdminMedicalCenterDetailsPage />
          </AdminLayout>
        ),
      },
      {
        path: "/admin/doctors",
        element: (
          <AdminLayout
            title="Doctors"
            subtitle="Monitor doctor relationships, visibility, verification, and activity"
          >
            <AdminDoctorsPage />
          </AdminLayout>
        ),
      },
      {
        path: "/admin/doctors/:id",
        element: (
          <AdminLayout
            title="Doctor Detail"
            subtitle="Inspect clinic associations, schedules, verification state, and activity"
          >
            <AdminDoctorDetailsPage />
          </AdminLayout>
        ),
      },
      {
        path: "/admin/pharmacies",
        element: (
          <AdminLayout
            title="Pharmacies"
            subtitle="Monitor pharmacy trust, dispensing throughput, inventory health, and demand"
          >
            <AdminPharmaciesPage />
          </AdminLayout>
        ),
      },
      {
        path: "/admin/pharmacies/:id",
        element: (
          <AdminLayout
            title="Pharmacy Detail"
            subtitle="Inspect pharmacists, inventory anomalies, dispensing activity, and verification"
          >
            <AdminPharmacyDetailsPage />
          </AdminLayout>
        ),
      },
      {
        path: "/admin/monitoring",
        element: (
          <AdminLayout
            title="System Monitoring"
            subtitle="Watch live queues, session throughput, bookings, and prescription flow"
          >
            <AdminSystemMonitoringPage />
          </AdminLayout>
        ),
      },
    ],
  },
  {
    element: <ProtectedRoute allowedRoles={["medical_center_admin"]} />,
    children: [
      {
        path: "/center",
        element: <CenterLayout />,
        children: [
          {
            index: true,
            element: <Navigate to="dashboard" replace />,
          },
          {
            path: "dashboard",
            element: <CenterDashboardPage />,
          },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute allowedRoles={["pharmacist"]} />,
    children: [
      {
        path: "/pharmacy",
        element: <PharmacyLayout />,
        children: [
          {
            index: true,
            element: <Navigate to="dashboard" replace />,
          },
          {
            path: "dashboard",
            element: <PharmacyDashboardPage />,
          },
          {
            path: "inventory",
            element: <InventoryPage />,
          },
          {
            path: "orders",
            element: <OrdersPage />,
          },
          {
            path: "storefront",
            element: <StorefrontPage />,
          },
          {
            path: "insights",
            element: <PharmacyInsightsPage />,
          },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute allowedRoles={["doctor"]} />,
    children: [
      {
        path: "/doctor",
        element: <DoctorLayout />,
        children: [
          {
            index: true,
            element: <Navigate to="dashboard" replace />,
          },
          {
            path: "dashboard",
            element: <DoctorDashboardPage />,
          },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute allowedRoles={["receptionist"]} />,
    children: [
      {
        path: "/reception/*",
        element: <ReceptionLegacyRedirect />,
      },
      {
        path: "/receptionist",
        element: <ReceptionLayout />,
        children: [
          {
            index: true,
            element: <Navigate to="dashboard" replace />,
          },
          {
            path: "dashboard",
            element: <ReceptionDashboardPage />,
          },
          {
            path: "sessions",
            element: <ReceptionSessionCoveragePage />,
          },
          {
            path: "create-session",
            element: <ReceptionCreateSessionPage />,
          },
          {
            path: "sessions/:sessionId",
            element: <ReceptionSessionManagementPage />,
          },
          {
            path: "live-queue",
            element: <ReceptionQueuesPage />,
          },
          {
            path: "queue/:sessionId",
            element: <ReceptionQueuesPage />,
          },
          {
            path: "check-in",
            element: <ReceptionCheckInPage />,
          },
          {
            path: "walk-ins",
            element: <ReceptionWalkInsPage />,
          },
          {
            path: "bookings",
            element: <ReceptionBookingsPage />,
          },
          {
            path: "patients",
            element: <ReceptionPatientsPage />,
          },
          {
            path: "patients/:patientId",
            element: (
              <ReceptionPlaceholderPage
                title="Patient Detail"
                description="Detailed receptionist patient profile will appear here as the patient record workflow expands."
              />
            ),
          },
          {
            path: "late-missed",
            element: <ReceptionLateMissedPage />,
          },
          {
            path: "reports",
            element: <ReceptionReportsPage />,
          },
          {
            path: "notifications",
            element: <ReceptionNotificationsPage />,
          },
          {
            path: "settings",
            element: <ReceptionSettingsPage />,
          },
        ],
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);

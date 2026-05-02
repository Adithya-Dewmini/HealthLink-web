import { createBrowserRouter, Navigate } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";
import AdminLayout from "../layouts/AdminLayout";
import CenterLayout from "../layouts/CenterLayout";
import DoctorLayout from "../layouts/DoctorLayout";
import PharmacyLayout from "../layouts/PharmacyLayout";
import ReceptionLayout from "../layouts/ReceptionLayout";
import AdminClinicsPage from "../pages/admin/MedicalCentersList";
import AdminDashboardPage from "../pages/admin/Dashboard";
import AdminMedicalCenterDetailsPage from "../pages/admin/MedicalCenterDetails";
import AdminUsersPage from "../pages/admin/Users";
import AdminVerificationsPage from "../pages/admin/VerificationsList";
import VerificationDetailPage from "../pages/admin/VerificationDetails";
import CenterDashboardPage from "../pages/center/Dashboard";
import DoctorDashboardPage from "../pages/doctor/Dashboard";
import LoginPage from "../pages/auth/Login";
import ResetPasswordPage from "../pages/auth/ResetPassword";
import SetPasswordPage from "../pages/auth/SetPassword";
import PharmacyDashboardPage from "../pages/pharmacy/Dashboard";
import InventoryPage from "../pages/pharmacy/Inventory";
import OrdersPage from "../pages/pharmacy/Orders";
import ReceptionDashboardPage from "../pages/reception/Dashboard";
import { getDefaultRouteForRole } from "../services/auth.service";
import { useAuth } from "../hooks/useAuth";

function RootRedirect() {
  const { isAuthenticated, isInitializing, user } = useAuth();

  if (isInitializing) {
    return <div className="route-state">Loading your workspace...</div>;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getDefaultRouteForRole(user.role)} replace />;
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
    path: "/setup-password",
    element: <SetPasswordPage />,
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
        path: "/reception",
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
        ],
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);

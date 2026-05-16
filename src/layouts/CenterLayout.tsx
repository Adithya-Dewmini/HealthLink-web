import DashboardLayout from "./DashboardLayout";
import { CENTER_ADMIN_NAV_ITEMS } from "../utils/constants";

export default function CenterLayout() {
  return (
    <DashboardLayout
      badge="HealthLink Clinic"
      title="Medical Center Panel"
      description="Manage doctors, desk staff, schedules, appointments, and live queue visibility for your clinic."
      headerEyebrow="Medical center panel"
      headerTitle="Clinic operations"
      navigation={CENTER_ADMIN_NAV_ITEMS}
      variant="center"
    />
  );
}

import DashboardLayout from "./DashboardLayout";
import { CENTER_ADMIN_NAV_ITEMS } from "../utils/constants";

export default function CenterLayout() {
  return (
    <DashboardLayout
      badge="HealthLink Center"
      title="Medical Center Management"
      description="Manage clinic operations, staff, and schedules for your medical center."
      headerEyebrow="Medical center panel"
      headerTitle="Center operations"
      navigation={CENTER_ADMIN_NAV_ITEMS}
    />
  );
}

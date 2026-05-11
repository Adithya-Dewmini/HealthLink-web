import DashboardLayout from "./DashboardLayout";
import { DOCTOR_NAV_ITEMS } from "../utils/constants";

export default function DoctorLayout() {
  return (
    <DashboardLayout
      badge="HealthLink Doctor"
      title="Doctor Workspace"
      description="Track sessions, patient flow, and consultation activity from one workspace."
      headerEyebrow="Doctor panel"
      headerTitle="Clinical dashboard"
      navigation={DOCTOR_NAV_ITEMS}
    />
  );
}

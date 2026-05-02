export default function DoctorDashboardPage() {
  return (
    <section className="dashboard-page">
      <div className="section-card">
        <div className="section-header">
          <div>
            <p className="section-eyebrow">Doctor</p>
            <h1>Doctor dashboard</h1>
          </div>
        </div>
        <p className="section-description">
          Your account is authenticated as a doctor. Doctor workflow pages can be attached to this
          route tree without weakening role isolation.
        </p>
      </div>
    </section>
  );
}

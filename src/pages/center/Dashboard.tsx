export default function CenterDashboardPage() {
  return (
    <section className="dashboard-page">
      <div className="section-card">
        <div className="section-header">
          <div>
            <p className="section-eyebrow">Medical center admin</p>
            <h1>Center dashboard</h1>
          </div>
        </div>
        <p className="section-description">
          Your account is authenticated as a medical center administrator. Center-specific
          management modules can be mounted here safely behind role-based routing.
        </p>
      </div>
    </section>
  );
}

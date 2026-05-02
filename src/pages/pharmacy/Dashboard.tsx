import Card from "../../components/ui/Card";

const metrics = [
  { label: "Orders pending", value: "18", detail: "4 urgent pickups" },
  { label: "Low stock items", value: "12", detail: "3 need reordering" },
  { label: "Prescriptions filled", value: "146", detail: "Since 8:00 AM" },
];

const actions = [
  { title: "Review urgent refill queue", detail: "4 patients waiting" },
  { title: "Approve supplier delivery", detail: "ETA 10:45 AM" },
  { title: "Check cold storage logs", detail: "Next reading in 15 minutes" },
];

const throughputHeights = [
  "chart-bar-h-42",
  "chart-bar-h-58",
  "chart-bar-h-49",
  "chart-bar-h-67",
  "chart-bar-h-71",
  "chart-bar-h-63",
];

export default function PharmacyDashboardPage() {
  return (
    <div className="page-stack">
      <section className="stats-grid">
        {metrics.map((metric) => (
          <Card key={metric.label} accent>
            <span className="metric-label">{metric.label}</span>
            <strong className="metric-value">{metric.value}</strong>
            <span className="metric-detail">{metric.detail}</span>
          </Card>
        ))}
      </section>

      <section className="content-grid">
        <Card title="Next actions" subtitle="Operational queue" accent>
          <div className="detail-list">
            {actions.map((action) => (
              <div key={action.title} className="detail-row">
                <div>
                  <strong>{action.title}</strong>
                  <span>{action.detail}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Dispense throughput" subtitle="Daily flow">
          <div className="chart-bars" aria-label="Throughput chart">
            {throughputHeights.map((barClassName, index) => (
              <div key={barClassName} className="chart-column">
                <div className={`chart-bar ${barClassName}`} />
                <span>{9 + index}h</span>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}

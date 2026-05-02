import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Table, { type TableColumn } from "../../components/ui/Table";

type OrderRow = {
  id: string;
  patient: string;
  pickup: string;
  status: string;
};

const orders: OrderRow[] = [
  { id: "RX-1042", patient: "A. Perera", pickup: "10:30 AM", status: "Ready" },
  { id: "RX-1045", patient: "S. Silva", pickup: "11:00 AM", status: "Preparing" },
  { id: "RX-1051", patient: "M. Fernando", pickup: "11:40 AM", status: "Awaiting stock" },
];

const columns: TableColumn<OrderRow>[] = [
  { key: "id", header: "Order ID" },
  { key: "patient", header: "Patient" },
  { key: "pickup", header: "Pickup" },
  {
    key: "status",
    header: "Status",
    render: (row) => <span className="status-chip">{row.status}</span>,
  },
];

export default function OrdersPage() {
  return (
    <Card title="Orders" subtitle="Fulfillment queue" action={<Button>Create order</Button>}>
      <Table columns={columns} data={orders} getRowKey={(row) => row.id} />
    </Card>
  );
}

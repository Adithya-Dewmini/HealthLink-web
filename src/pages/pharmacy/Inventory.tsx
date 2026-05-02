import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Table, { type TableColumn } from "../../components/ui/Table";

type InventoryRow = {
  id: string;
  item: string;
  stock: string;
  threshold: string;
  status: string;
};

const inventoryRows: InventoryRow[] = [
  { id: "1", item: "Amoxicillin 500mg", stock: "24", threshold: "40", status: "Low stock" },
  { id: "2", item: "Metformin 850mg", stock: "118", threshold: "60", status: "Healthy" },
  { id: "3", item: "Insulin pens", stock: "12", threshold: "20", status: "Reorder" },
  { id: "4", item: "Paracetamol syrup", stock: "53", threshold: "30", status: "Healthy" },
];

const columns: TableColumn<InventoryRow>[] = [
  { key: "item", header: "Item" },
  { key: "stock", header: "In stock" },
  { key: "threshold", header: "Threshold" },
  {
    key: "status",
    header: "Status",
    render: (row) => <span className="status-chip">{row.status}</span>,
  },
];

export default function InventoryPage() {
  return (
    <Card title="Inventory" subtitle="Stock control" action={<Button>Record delivery</Button>}>
      <Table columns={columns} data={inventoryRows} getRowKey={(row) => row.id} />
    </Card>
  );
}

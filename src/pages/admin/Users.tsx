import Table, { type TableColumn } from "../../components/ui/Table";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";

type UserRow = {
  id: string;
  name: string;
  role: string;
  clinic: string;
  status: string;
};

const users: UserRow[] = [
  { id: "1", name: "Dr. Sarah Fernando", role: "Admin", clinic: "Central Hospital", status: "Active" },
  { id: "2", name: "Amila Perera", role: "Pharmacist", clinic: "North Clinic", status: "Pending" },
  { id: "3", name: "Kavindi Silva", role: "Pharmacist", clinic: "Lakeside Center", status: "Active" },
  { id: "4", name: "Nimal Jayasekara", role: "Admin", clinic: "West Care", status: "Suspended" },
];

const columns: TableColumn<UserRow>[] = [
  { key: "name", header: "Name" },
  { key: "role", header: "Role" },
  { key: "clinic", header: "Clinic" },
  {
    key: "status",
    header: "Status",
    render: (row) => <span className="status-chip">{row.status}</span>,
  },
];

export default function AdminUsersPage() {
  return (
    <Card title="Users" subtitle="Identity management" action={<Button>Invite user</Button>}>
      <Table columns={columns} data={users} getRowKey={(row) => row.id} />
    </Card>
  );
}

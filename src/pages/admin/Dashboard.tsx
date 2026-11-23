import { useOap } from "../../context/useOap";

export default function Dashboard() {
  const { data } = useOap();

  return (
    <section>
      <h1>Admin Dashboard</h1>
      <ul>
        <li>Users: {data.users.length}</li>
        <li>Dormers: {data.dormers.length}</li>
        <li>Buildings: {data.buildings.length}</li>
        <li>Rooms: {data.rooms.length}</li>
        <li>Pending Applicants: {data.applicants.filter((a) => a.status === "pending").length}</li>
        <li>Active Assignments: {data.roomAssignments.filter((r) => r.status === "active").length}</li>
        <li>Unread Notifications: {data.notifications.filter((n) => !n.isRead).length}</li>
      </ul>
    </section>
  );
}

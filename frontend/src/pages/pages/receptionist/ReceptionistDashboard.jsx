import { Routes, Route } from 'react-router-dom';
import DashboardShell from '../../components/dashboard/DashboardShell.jsx';
import ReceptionistRenewals from './ReceptionistRenewals.jsx';
import ReceptionistAttendance from './ReceptionistAttendance.jsx';

const NAV_ITEMS = [
  { to: '/receptionist', label: 'Renewals', end: true },
  { to: '/receptionist/attendance', label: 'Attendance' },
];

export default function ReceptionistDashboard() {
  return (
    <DashboardShell navItems={NAV_ITEMS}>
      <Routes>
        <Route index element={<ReceptionistRenewals />} />
        <Route path="attendance" element={<ReceptionistAttendance />} />
      </Routes>
    </DashboardShell>
  );
}

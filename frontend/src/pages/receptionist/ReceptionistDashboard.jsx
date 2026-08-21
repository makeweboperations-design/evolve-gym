import { Routes, Route } from 'react-router-dom';
import DashboardShell from '../../components/dashboard/DashboardShell.jsx';
import ReceptionistRenewals from './ReceptionistRenewals.jsx';
import ReceptionistAttendance from './ReceptionistAttendance.jsx';
import Community from '../shared/Community.jsx';
import Profile from '../shared/Profile.jsx';
import EquipmentManager from '../shared/EquipmentManager.jsx';

const NAV_ITEMS = [
  { to: '/receptionist', label: 'Renewals', end: true },
  { to: '/receptionist/attendance', label: 'Attendance' },
  { to: '/receptionist/equipment', label: 'Equipment' },
  { to: '/receptionist/community', label: 'Community' },
];

export default function ReceptionistDashboard() {
  return (
    <DashboardShell navItems={NAV_ITEMS} profilePath="/receptionist/profile">
      <Routes>
        <Route index element={<ReceptionistRenewals />} />
        <Route path="attendance" element={<ReceptionistAttendance />} />
        <Route path="equipment" element={<EquipmentManager />} />
        <Route path="community" element={<Community />} />
        <Route path="profile" element={<Profile />} />
      </Routes>
    </DashboardShell>
  );
}

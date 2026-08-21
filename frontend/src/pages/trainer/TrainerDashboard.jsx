import { Routes, Route } from 'react-router-dom';
import DashboardShell from '../../components/dashboard/DashboardShell.jsx';
import TrainerClients from './TrainerClients.jsx';
import Community from '../shared/Community.jsx';
import Profile from '../shared/Profile.jsx';

const NAV_ITEMS = [
  { to: '/trainer', label: 'Clients', end: true },
  { to: '/trainer/community', label: 'Community' },
  // A session-booking calendar tab can be added here later.
];

export default function TrainerDashboard() {
  return (
    <DashboardShell navItems={NAV_ITEMS} profilePath="/trainer/profile">
      <Routes>
        <Route index element={<TrainerClients />} />
        <Route path="community" element={<Community />} />
        <Route path="profile" element={<Profile />} />
      </Routes>
    </DashboardShell>
  );
}

import { Routes, Route } from 'react-router-dom';
import DashboardShell from '../../components/dashboard/DashboardShell.jsx';
import AdminOverview from './AdminOverview.jsx';
import AdminPlans from './AdminPlans.jsx';
import AdminUsers from './AdminUsers.jsx';
import AdminAuditLog from './AdminAuditLog.jsx';
import AdminChatbot from './AdminChatbot.jsx';
import Community from '../shared/Community.jsx';
import Profile from '../shared/Profile.jsx';
import EquipmentManager from '../shared/EquipmentManager.jsx';

const NAV_ITEMS = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/plans', label: 'Membership plans' },
  { to: '/admin/users', label: 'Staff & members' },
  { to: '/admin/equipment', label: 'Equipment' },
  { to: '/admin/chatbot', label: 'Chatbot FAQs' },
  { to: '/admin/community', label: 'Community' },
  { to: '/admin/audit-log', label: 'Audit log' },
];

export default function AdminDashboard() {
  return (
    <DashboardShell navItems={NAV_ITEMS} profilePath="/admin/profile">
      <Routes>
        <Route index element={<AdminOverview />} />
        <Route path="plans" element={<AdminPlans />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="equipment" element={<EquipmentManager />} />
        <Route path="chatbot" element={<AdminChatbot />} />
        <Route path="community" element={<Community />} />
        <Route path="audit-log" element={<AdminAuditLog />} />
        <Route path="profile" element={<Profile />} />
      </Routes>
    </DashboardShell>
  );
}

import { Routes, Route } from 'react-router-dom';
import DashboardShell from '../../components/dashboard/DashboardShell.jsx';
import CustomerOverview from './CustomerOverview.jsx';
import CustomerPayments from './CustomerPayments.jsx';
import CustomerAttendance from './CustomerAttendance.jsx';
import ChatWidget from '../../components/chatbot/ChatWidget.jsx';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Overview', end: true },
  { to: '/dashboard/attendance', label: 'Attendance' },
  { to: '/dashboard/payments', label: 'Membership & payments' },
  // A Calendar tab can be added here later.
];

export default function CustomerDashboard() {
  return (
    <DashboardShell navItems={NAV_ITEMS}>
      <Routes>
        <Route index element={<CustomerOverview />} />
        <Route path="attendance" element={<CustomerAttendance />} />
        <Route path="payments" element={<CustomerPayments />} />
      </Routes>
      <ChatWidget />
    </DashboardShell>
  );
}

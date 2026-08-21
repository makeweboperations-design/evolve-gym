import { Routes, Route } from 'react-router-dom';
import DashboardShell from '../../components/dashboard/DashboardShell.jsx';
import CustomerOverview from './CustomerOverview.jsx';
import CustomerPayments from './CustomerPayments.jsx';
import CustomerAttendance from './CustomerAttendance.jsx';
import CustomerCommunity from './CustomerCommunity.jsx';
import CustomerProgress from './CustomerProgress.jsx';
import Profile from '../shared/Profile.jsx';
import ChatWidget from '../../components/chatbot/ChatWidget.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Overview', end: true },
  { to: '/dashboard/attendance', label: 'Attendance' },
  { to: '/dashboard/payments', label: 'Membership & payments' },
  { to: '/dashboard/community', label: 'Community' },
  { to: '/dashboard/progress', label: 'Progress Tracker' },
];

export default function CustomerDashboard() {
  const { user } = useAuth();

  return (
    <DashboardShell navItems={NAV_ITEMS} profilePath="/dashboard/profile">
      {user && user.is_active === false && (
        <div className="dash-deactivated-banner">
          Your account isn't active yet — you can log in, but community, the progress tracker, and other
          features are unavailable until an admin approves your account. If you just signed up, this usually
          just takes a short while; otherwise please contact the front desk.
        </div>
      )}
      <Routes>
        <Route index element={<CustomerOverview />} />
        <Route path="attendance" element={<CustomerAttendance />} />
        <Route path="payments" element={<CustomerPayments />} />
        <Route path="community" element={<CustomerCommunity />} />
        <Route path="progress" element={<CustomerProgress />} />
        <Route path="profile" element={<Profile />} />
      </Routes>
      <ChatWidget />
    </DashboardShell>
  );
}

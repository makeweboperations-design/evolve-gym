import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { usePageViewTracking } from './utils/usePageViewTracking.js';

// Public marketing pages
import Home from './pages/public/Home.jsx';
import Login from './pages/public/Login.jsx';
import Register from './pages/public/Register.jsx';

// Role dashboards (placeholders — build out per role)
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import ReceptionistDashboard from './pages/receptionist/ReceptionistDashboard.jsx';
import TrainerDashboard from './pages/trainer/TrainerDashboard.jsx';
import CustomerDashboard from './pages/customer/CustomerDashboard.jsx';

// Hidden, dev-only analytics dashboard — intentionally not linked from any nav.
import DevAnalytics from './pages/dev/DevAnalytics.jsx';

export default function App() {
  usePageViewTracking();

  return (
    <Routes>
      {/* Public / brand pages */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Role-based dashboards */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/receptionist/*"
        element={
          <ProtectedRoute roles={['receptionist']}>
            <ReceptionistDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/trainer/*"
        element={
          <ProtectedRoute roles={['trainer']}>
            <TrainerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/*"
        element={
          <ProtectedRoute roles={['customer']}>
            <CustomerDashboard />
          </ProtectedRoute>
        }
      />

      {/* Hidden dev-only route — no nav link anywhere, admin login required */}
      <Route
        path="/dev/analytics"
        element={
          <ProtectedRoute roles={['admin']}>
            <DevAnalytics />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

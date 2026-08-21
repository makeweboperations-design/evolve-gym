import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import NotificationBell from './NotificationBell.jsx';
import ProfileMenu from './ProfileMenu.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import EvolveLogo from '../brand/EvolveLogo.jsx';
import './dashboard.css';

// navItems: [{ to, label, end }]
// profilePath defaults to `${navItems[0] base}/profile` if not passed explicitly,
// but callers should pass it to be safe (e.g. '/dashboard/profile').
export default function DashboardShell({ navItems, profilePath, children }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  // Close the mobile drawer automatically whenever the route changes.
  const closeDrawer = () => setDrawerOpen(false);

  const resolvedProfilePath = profilePath || `${navItems[0]?.to?.split('/').slice(0, 2).join('/') || ''}/profile`;

  return (
    <div className="dash" data-theme={theme}>
      {drawerOpen && <div className="dash-backdrop" onClick={closeDrawer} />}

      <aside className={`dash-sidebar ${drawerOpen ? 'open' : ''}`}>
        <div className="dash-logo">
          <EvolveLogo variant="compact" tone={theme === 'dark' ? 'light' : 'dark'} />
        </div>
        <nav className="dash-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={closeDrawer}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="dash-body">
        <header className="dash-topbar">
          <button
            className="dash-menu-toggle"
            onClick={() => setDrawerOpen((o) => !o)}
            aria-label="Toggle navigation menu"
          >
            ☰
          </button>
          <div className="dash-topbar-spacer" />
          <button
            className="dash-theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <NotificationBell />
          <ProfileMenu profilePath={resolvedProfilePath} />
        </header>

        <main className="dash-main">
          {children}
        </main>
      </div>
    </div>
  );
}

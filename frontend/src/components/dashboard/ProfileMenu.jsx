import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

function initials(name = '') {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

// profilePath: where "Edit profile" should navigate for this role's dashboard
// (e.g. '/dashboard/profile', '/admin/profile').
export default function ProfileMenu({ profilePath }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="profile-menu" ref={ref}>
      <button className="profile-menu-trigger" onClick={() => setOpen((o) => !o)} aria-haspopup="true" aria-expanded={open}>
        <span className="profile-menu-avatar">{initials(user?.name)}</span>
      </button>

      {open && (
        <div className="profile-menu-dropdown">
          <div className="profile-menu-info">
            <div className="profile-menu-name">{user?.name}</div>
            <div className="profile-menu-role">{user?.role}</div>
          </div>
          <button
            className="profile-menu-item"
            onClick={() => {
              setOpen(false);
              navigate(profilePath);
            }}
          >
            Edit profile
          </button>
          <button className="profile-menu-item danger" onClick={handleLogout}>
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

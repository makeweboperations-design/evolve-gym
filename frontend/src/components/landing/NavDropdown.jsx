import { useEffect, useRef, useState } from 'react';
import './nav-dropdown.css';

// items: [{ label, href }]
export default function NavDropdown({ label, items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <li
      className="nav-dropdown"
      ref={ref}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="nav-dropdown-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        {label}
        <span className="nav-dropdown-caret">▾</span>
      </button>

      {open && (
        <ul className="nav-dropdown-menu">
          {items.map((item) => (
            <li key={item.href}>
              <a href={item.href} onClick={() => setOpen(false)}>{item.label}</a>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

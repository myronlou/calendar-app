// AdminLayout.js
import { Outlet, Link, useLocation } from 'react-router-dom';
import './AdminLayout.css';

export default function AdminLayout() {
  const location = useLocation();
  
  const menuItems = [
    { path: 'calendar', label: 'Calendar' },
    { path: 'availability', label: 'Availability' },
    { path: 'booking-types', label: 'Booking Types' }
  ];

  return (
    <div className="admin-layout">
      {/* TOP HEADER */}
      <header className="admin-header">
        <h1 className="app-title">Admin Dashboard</h1>
        <div className="header-actions">
          {/* e.g. sign out or user menu */}
          <button className="header-btn">Sign Out</button>
        </div>
      </header>

      <div className="layout-content">
        <aside className="sidebar">
          <h3 className="sidebar-title">Admin Menu</h3>
          <nav className="sidebar-nav">
            {menuItems.map((item) => {
              const isActive = location.pathname.includes(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`sidebar-link ${isActive ? 'active' : ''}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
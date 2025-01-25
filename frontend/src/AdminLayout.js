// AdminLayout.js
import { Outlet, Link, useLocation } from 'react-router-dom';

export default function AdminLayout() {
  const location = useLocation();
  
  const menuItems = [
    { path: 'calendar', label: 'Calendar' },
    { path: 'availability', label: 'Availability' },
    { path: 'booking-types', label: 'Booking Types' }
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <div style={{ width: '200px', backgroundColor: '#f0f0f0', padding: '20px' }}>
        <h3>Admin Menu</h3>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              style={{
                fontWeight: location.pathname.includes(item.path) ? 'bold' : 'normal',
                color: location.pathname.includes(item.path) ? '#1890ff' : '#000',
                textDecoration: 'none'
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      
      <div style={{ flex: 1, padding: '20px' }}>
        <Outlet />
      </div>
    </div>
  );
}
import { useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { FaCalendarAlt, FaClock, FaListAlt, FaSignOutAlt, FaColumns } from "react-icons/fa";
import "./AdminLayout.css";

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  // Sidebar toggle state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Menu items with icons
  const menuItems = [
    { path: "calendar", label: "Calendar", icon: <FaCalendarAlt /> },
    { path: "availability", label: "Availability", icon: <FaClock /> },
    { path: "booking-types", label: "Booking Types", icon: <FaListAlt /> },
  ];

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  return (
    <div className={`admin-layout ${isSidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
      {/* Sidebar */}
      <aside className="sidebar">
        {/* Sidebar top (toggle button) */}
        <div className="sidebar-top">
          <button className="sidebar-toggle" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            <FaColumns />
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            const isActive = location.pathname.includes(item.path);
            return (
              <Link key={item.path} to={item.path} className={`sidebar-link ${isActive ? "active" : ""}`}>
                {item.icon} {isSidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar bottom (logout) */}
        <div className="sidebar-bottom">
          <button className="logout-button" onClick={handleLogout}>
            <FaSignOutAlt /> {isSidebarOpen && <span>Log out</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

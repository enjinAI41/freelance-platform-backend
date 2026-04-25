import { NavLink, Outlet } from 'react-router-dom'

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/jobs', label: 'Jobs' },
  { to: '/jobs/create', label: 'Create Job' },
  { to: '/projects', label: 'Projects' },
  { to: '/login', label: 'Login' },
  { to: '/register', label: 'Register' },
]

export function MainLayout() {
  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="sidebar-brand">
          <h2>Freelance Panel</h2>
          <p>Project Workspace</p>
        </div>

        <nav className="nav-list">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'active' : ''}`.trim()
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <small>JWT auth active</small>
        </div>
      </aside>

      <main className="app-content">
        <div className="content-wrap">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

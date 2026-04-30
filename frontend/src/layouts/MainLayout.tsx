import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { RoleName } from '../types/auth'

type NavItem = {
  to: string
  label: string
  icon: string
}

function getPrimaryRole(roles: string[]): RoleName {
  if (roles.includes('CUSTOMER')) {
    return 'CUSTOMER'
  }

  if (roles.includes('FREELANCER')) {
    return 'FREELANCER'
  }

  return 'ARBITER'
}

function getRoleLabel(role: RoleName): string {
  if (role === 'CUSTOMER') {
    return 'MÃ¼ÅŸteri'
  }

  if (role === 'FREELANCER') {
    return 'Freelancer'
  }

  return 'Hakem'
}

function getNavItems(primaryRole: RoleName): NavItem[] {
  const items: NavItem[] = [
    { to: '/dashboard', label: 'Kontrol Paneli', icon: '■' },
    { to: '/jobs', label: 'İş İlanları', icon: '□' },
    { to: '/projects', label: 'Projeler', icon: '◆' },
    { to: '/disputes', label: 'Uyuşmazlıklar', icon: '⚠' },
    { to: '/reports', label: 'Raporlar', icon: '▣' },
  ]

  if (primaryRole === 'CUSTOMER') {
    items.push({ to: '/jobs/create', label: 'İlan Yayınla', icon: '✚' })
  }

  if (primaryRole === 'ARBITER') {
    items.push({ to: '/arbiter-desk', label: 'Hakem Masası', icon: '⚖' })
  } else {
    items.push({ to: '/wallet', label: 'Ödeme ve Cüzdan', icon: '◉' })
  }

  return items
}

export function MainLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const roles = user?.roles ?? []
  const primaryRole = getPrimaryRole(roles)
  const navItems = getNavItems(primaryRole)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="app-shell">
      <aside className={`app-sidebar sidebar-${primaryRole.toLowerCase()}`}>
        <div className="sidebar-brand">
          <p className="brand-kicker">Freelance Ä°ÅŸ AkÄ±ÅŸÄ± Platformu</p>
          <h2>Freelancer</h2>
          <span className="role-chip">{getRoleLabel(primaryRole)}</span>
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
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-balance">
          <span>KullanÄ±cÄ±</span>
          <strong>{user?.email ?? 'Hesap'}</strong>
        </div>

        <div className="sidebar-footer">
          <small>Platform Oturumu</small>
          <button className="button button-subtle button-sidebar" type="button" onClick={handleLogout}>
            Oturumu Kapat
          </button>
        </div>
      </aside>

      <main className="app-content">
        <header className="app-topbar">
          <div className="topbar-search">
            <input type="text" placeholder="Ara..." readOnly />
          </div>
          <div className="topbar-right">
            <div className="topbar-role-switch">
              <span className={primaryRole === 'CUSTOMER' ? 'active' : ''}>MÃ¼ÅŸteri</span>
              <span className={primaryRole === 'FREELANCER' ? 'active' : ''}>Freelancer</span>
              <span className={primaryRole === 'ARBITER' ? 'active' : ''}>Hakem</span>
            </div>
            <div className="topbar-user">
              <strong>{user?.email?.split('@')[0] ?? 'KullanÄ±cÄ±'}</strong>
              <small>{getRoleLabel(primaryRole)}</small>
            </div>
          </div>
        </header>

        <div className="content-wrap">
          <Outlet />
        </div>
      </main>
    </div>
  )
}



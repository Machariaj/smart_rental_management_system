import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import ChatbotWidget from './ChatbotWidget'

const landlordLinks = [
  { to: '/landlord', label: 'Dashboard', icon: '🏠' },
  { to: '/landlord/properties', label: 'Properties', icon: '🏢' },
  { to: '/landlord/tenants', label: 'Tenants', icon: '👥' },
  { to: '/landlord/payments', label: 'Payments', icon: '💳' },
  { to: '/landlord/maintenance', label: 'Maintenance', icon: '🔧' },
  { to: '/landlord/reports', label: 'Reports', icon: '📊' },
]

const tenantLinks = [
  { to: '/tenant', label: 'Dashboard', icon: '🏠' },
  { to: '/tenant/payments', label: 'My Bills', icon: '💳' },
  { to: '/tenant/maintenance', label: 'Maintenance', icon: '🔧' },
]

const adminLinks = [
  { to: '/admin', label: 'Dashboard', icon: '🛡️' },
  { to: '/admin/landlords', label: 'Landlords', icon: '👤' },
  { to: '/admin/tenants', label: 'Tenants', icon: '🏘️' },
]

function Layout({ children }) {
  const { user, isAuthenticated, logout } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const links =
    user?.role === 'landlord'
      ? landlordLinks
      : user?.role === 'admin'
      ? adminLinks
      : tenantLinks

  if (!isAuthenticated) return children

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-blue-800 text-white flex flex-col fixed h-full z-10">
        {/* Brand */}
        <div className="p-6 border-b border-blue-700">
          <h1 className="text-xl font-bold">SMART Rental</h1>
          <p className="text-blue-300 text-xs mt-1">Management System</p>
        </div>

        {/* Nav links */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {links.map(({ to, label, icon }) => {
            const active =
              to === '/landlord' || to === '/tenant' || to === '/admin'
                ? location.pathname === to
                : location.pathname.startsWith(to)
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-blue-600 text-white'
                    : 'text-blue-200 hover:bg-blue-700 hover:text-white'
                }`}
              >
                <span>{icon}</span>
                {label}
              </Link>
            )
          })}
        </nav>

        {/* User info + logout */}
        <div className="p-4 border-t border-blue-700">
          <div className="mb-3">
            <p className="text-sm font-semibold truncate">{user?.full_name}</p>
            <p className="text-xs text-blue-300 capitalize">{user?.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full bg-red-600 hover:bg-red-700 text-white text-sm py-2 rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 flex-1 overflow-y-auto">
        {children}
      </main>

      {/* Chatbot — only for tenants */}
      {user?.role === 'tenant' && <ChatbotWidget />}
    </div>
  )
}

export default Layout

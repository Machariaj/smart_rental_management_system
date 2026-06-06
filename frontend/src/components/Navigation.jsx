import React from 'react'
import { Link } from 'react-router-dom'
import useAuthStore from '../store/authStore'

function Navigation() {
  const { isAuthenticated, logout, user } = useAuthStore()

  return (
    <nav className="bg-blue-600 text-white p-4 shadow-lg">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold">
          Real Estate Manager
        </Link>

        <div className="flex items-center gap-6">
          {isAuthenticated && user && (
            <>
              <span className="text-sm">
                {user.full_name} ({user.role})
              </span>
              {user.role === 'landlord' && (
                <>
                  <Link to="/landlord" className="hover:bg-blue-700 px-3 py-2 rounded">
                    Dashboard
                  </Link>
                  <Link to="/landlord/properties" className="hover:bg-blue-700 px-3 py-2 rounded">
                    Properties
                  </Link>
                </>
              )}
              {user.role === 'tenant' && (
                <>
                  <Link to="/tenant" className="hover:bg-blue-700 px-3 py-2 rounded">
                    Dashboard
                  </Link>
                  <Link to="/tenant/payments" className="hover:bg-blue-700 px-3 py-2 rounded">
                    Payments
                  </Link>
                </>
              )}
              <button
                onClick={logout}
                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
              >
                Logout
              </button>
            </>
          )}
          {!isAuthenticated && (
            <Link to="/login" className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded">
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navigation

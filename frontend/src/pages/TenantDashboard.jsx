import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { tenantAPI } from '../services/api'
import useAuthStore from '../store/authStore'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// ─── Main Dashboard ──────────────────────────────────────────────────────────
export default function TenantDashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [balance, setBalance] = useState(null)
  const [bills, setBills] = useState([])
  const [notifications, setNotifications] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [balRes, billRes, notifRes] = await Promise.all([
        tenantAPI.getBalance(),
        tenantAPI.getBills(),
        tenantAPI.getNotifications(),
      ])
      setBalance(balRes.data)
      setBills(billRes.data)
      setNotifications(notifRes.data)
    } catch {
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const recentBills = [...bills].slice(0, 4)

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <p className="text-gray-500">Loading your dashboard...</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Welcome, {user?.full_name?.split(' ')[0]}</h1>
        <p className="text-gray-500 text-sm mt-1">Tenant portal</p>
      </div>

      {error && <div className="bg-red-100 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

      {/* Notification Banner */}
      {notifications && (notifications.upcoming_bills > 0 || notifications.pending_maintenance > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <span className="text-amber-500 text-lg">⚠</span>
          <div className="text-sm text-amber-800">
            {notifications.upcoming_bills > 0 && (
              <p>You have <strong>{notifications.upcoming_bills}</strong> upcoming/unpaid bill{notifications.upcoming_bills > 1 ? 's' : ''}.</p>
            )}
            {notifications.pending_maintenance > 0 && (
              <p>You have <strong>{notifications.pending_maintenance}</strong> maintenance request{notifications.pending_maintenance > 1 ? 's' : ''} in progress.</p>
            )}
          </div>
        </div>
      )}

      {/* Balance Cards */}
      {balance && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-xl shadow-sm border">
            <p className="text-sm text-gray-500">Outstanding Rent</p>
            <p className={`text-2xl font-bold mt-1 ${balance.outstanding_rent > 0 ? 'text-red-600' : 'text-green-600'}`}>
              KShs {balance.outstanding_rent?.toLocaleString()}
            </p>
            {balance.outstanding_rent === 0 && <p className="text-xs text-green-500 mt-1">All paid up!</p>}
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border">
            <p className="text-sm text-gray-500">Utilities (3 mo.)</p>
            <p className="text-2xl font-bold mt-1">KShs {balance.utility_balance?.toLocaleString()}</p>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border">
            <p className="text-sm text-gray-500">Arrears</p>
            <p className={`text-2xl font-bold mt-1 ${(balance.arrears?.amount || 0) > 0 ? 'text-orange-600' : 'text-gray-600'}`}>
              KShs {(balance.arrears?.amount || 0).toLocaleString()}
            </p>
            {balance.arrears?.months_outstanding > 0 && (
              <p className="text-xs text-orange-500 mt-1">{balance.arrears.months_outstanding} mo. overdue</p>
            )}
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border">
            <p className="text-sm text-gray-500">Total Due</p>
            <p className="text-2xl font-bold text-blue-700 mt-1">KShs {balance.total_balance?.toLocaleString()}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Bills */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="flex justify-between items-center p-5 border-b">
            <h2 className="font-bold text-gray-800">Recent Bills</h2>
            <button onClick={() => navigate('/tenant/payments')} className="text-xs text-blue-600 hover:underline">
              View all →
            </button>
          </div>
          {recentBills.length === 0 ? (
            <p className="text-center text-gray-400 py-8 text-sm">No bills found</p>
          ) : (
            <div className="divide-y">
              {recentBills.map(b => (
                <div key={b.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="font-medium text-sm">{MONTHS[b.month - 1]} {b.year}</p>
                    <p className="text-xs text-gray-400">Due {new Date(b.due_date).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">KShs {b.amount?.toLocaleString()}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${b.is_paid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {b.is_paid ? 'Paid' : 'Unpaid'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h2 className="font-bold text-gray-800 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/tenant/payments')}
              className="w-full flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-xl text-sm font-medium transition-colors">
              <span>💳</span> Make a Payment
            </button>
            <button
              onClick={() => navigate('/tenant/maintenance')}
              className="w-full flex items-center gap-3 bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-xl text-sm font-medium transition-colors">
              <span>🔧</span> Report Maintenance Issue
            </button>
            <button
              onClick={() => navigate('/tenant/payments')}
              className="w-full flex items-center gap-3 border border-gray-200 hover:bg-gray-50 text-gray-700 py-3 px-4 rounded-xl text-sm font-medium transition-colors">
              <span>📋</span> View Payment History
            </button>
          </div>
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-gray-400 text-center">
              Need help? Use the chat button at the bottom-right
            </p>
          </div>
        </div>

        {/* Maintenance Summary */}
        {notifications && notifications.items?.maintenance?.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border md:col-span-2">
            <div className="flex justify-between items-center p-5 border-b">
              <h2 className="font-bold text-gray-800">Active Maintenance Requests</h2>
              <button onClick={() => navigate('/tenant/maintenance')} className="text-xs text-blue-600 hover:underline">
                View all →
              </button>
            </div>
            <div className="divide-y">
              {notifications.items.maintenance.map(req => (
                <div key={req.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{req.description?.substring(0, 60)}</p>
                    <p className="text-xs text-gray-400 mt-0.5 capitalize">{req.category?.replace('_', ' ')} · {req.priority} priority</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    req.status === 'submitted' ? 'bg-blue-100 text-blue-700' :
                    req.status === 'approved' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>{req.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  )
}

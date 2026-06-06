import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { landlordAPI, landlordExtAPI } from '../services/api'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function StatCard({ label, value, sub, color = 'text-gray-800', bg = 'bg-white' }) {
  return (
    <div className={`${bg} p-5 rounded-xl shadow-sm border`}>
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

const STATUS_COLORS = {
  submitted: 'bg-blue-100 text-blue-700',
  approved: 'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
}

const PRIORITY_COLORS = {
  urgent: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-600',
  low: 'bg-gray-100 text-gray-600',
}

export default function LandlordDashboard() {
  const navigate = useNavigate()
  const [properties, setProperties] = useState([])
  const [tenants, setTenants] = useState([])
  const [maintenance, setMaintenance] = useState([])
  const [utilityAnomalies, setUtilityAnomalies] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchDashboard() }, [])

  const fetchDashboard = async () => {
    setLoading(true)
    try {
      const [propsRes, tenantsRes] = await Promise.all([
        landlordAPI.getProperties(),
        landlordExtAPI.getTenants(),
      ])
      const props = propsRes.data
      const tenantList = tenantsRes.data
      setProperties(props)
      setTenants(tenantList)

      if (props.length > 0) {
        const [maintenanceResults, utilityResults] = await Promise.all([
          Promise.all(props.map(p => landlordAPI.getMaintenanceRequests(p.id).catch(() => ({ data: [] })))),
          Promise.all(props.map(p => landlordExtAPI.getUtilityBills(p.id).catch(() => ({ data: [] })))),
        ])
        const allMaintenance = maintenanceResults.flatMap(r => r.data)
        setMaintenance(allMaintenance.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
        const allUtility = utilityResults.flatMap(r => r.data)
        setUtilityAnomalies(allUtility.filter(b => b.is_anomalous))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const totalMonthlyRent = tenants.reduce((s, t) => s + (t.monthly_rent || 0), 0)
  const activeTenants = tenants.filter(t => t.is_active)
  const pendingMaintenance = maintenance.filter(m => m.status === 'submitted')
  const occupancyPct = properties.length > 0 && properties.some(p => p.total_units > 0)
    ? Math.round((activeTenants.length / properties.reduce((s, p) => s + p.total_units, 0)) * 100)
    : 0

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <p className="text-gray-500">Loading dashboard...</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Portfolio overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Properties"
          value={properties.length}
          sub={`${properties.reduce((s, p) => s + p.total_units, 0)} total units`}
        />
        <StatCard
          label="Active Tenants"
          value={activeTenants.length}
          sub={`${occupancyPct}% occupancy`}
          color="text-blue-600"
        />
        <StatCard
          label="Monthly Rent (Potential)"
          value={`KShs ${totalMonthlyRent.toLocaleString()}`}
          sub="From occupied units"
          color="text-green-600"
        />
        <StatCard
          label="Pending Maintenance"
          value={pendingMaintenance.length}
          sub="Awaiting approval"
          color={pendingMaintenance.length > 0 ? 'text-orange-600' : 'text-gray-800'}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pending Maintenance Requests */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="flex justify-between items-center p-5 border-b">
            <h2 className="font-bold text-gray-800">Pending Maintenance</h2>
            <button onClick={() => navigate('/landlord/maintenance')}
              className="text-xs text-blue-600 hover:underline">View all →</button>
          </div>
          {pendingMaintenance.length === 0 ? (
            <div className="p-5 text-center text-gray-400 text-sm">No pending requests</div>
          ) : (
            <div className="divide-y">
              {pendingMaintenance.slice(0, 5).map(req => (
                <div key={req.id} className="p-4 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{req.description?.substring(0, 60)}</p>
                    <div className="flex gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[req.priority] || ''}`}>
                        {req.priority}
                      </span>
                      <span className="text-xs text-gray-400 capitalize">{req.category?.replace('_', ' ')}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{new Date(req.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[req.status] || ''}`}>
                    {req.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Properties Overview */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="flex justify-between items-center p-5 border-b">
            <h2 className="font-bold text-gray-800">Properties</h2>
            <button onClick={() => navigate('/landlord/properties')}
              className="text-xs text-blue-600 hover:underline">Manage →</button>
          </div>
          {properties.length === 0 ? (
            <div className="p-5 text-center">
              <p className="text-gray-400 text-sm mb-3">No properties yet</p>
              <button onClick={() => navigate('/landlord/properties')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
                Add Property
              </button>
            </div>
          ) : (
            <div className="divide-y">
              {properties.map(p => {
                const propTenants = activeTenants.filter(t => t.property_id === p.id)
                const occ = p.total_units > 0 ? Math.round((propTenants.length / p.total_units) * 100) : 0
                return (
                  <div key={p.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-800">{p.name}</p>
                        <p className="text-xs text-gray-500">{p.city}, {p.state}</p>
                      </div>
                      <span className="text-xs text-gray-500">{propTenants.length}/{p.total_units} units</span>
                    </div>
                    <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${occ}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{occ}% occupancy</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent Tenants */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="flex justify-between items-center p-5 border-b">
            <h2 className="font-bold text-gray-800">Recent Tenants</h2>
            <button onClick={() => navigate('/landlord/tenants')}
              className="text-xs text-blue-600 hover:underline">View all →</button>
          </div>
          {activeTenants.length === 0 ? (
            <div className="p-5 text-center text-gray-400 text-sm">No tenants yet</div>
          ) : (
            <div className="divide-y">
              {activeTenants.slice(0, 5).map(t => (
                <div key={t.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm text-gray-800">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.property} · Unit {t.unit}</p>
                  </div>
                  <p className="text-sm font-medium text-green-700">KShs {(t.monthly_rent || 0).toLocaleString()}/mo</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h2 className="font-bold text-gray-800 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Add Property', path: '/landlord/properties', color: 'bg-blue-600 hover:bg-blue-700' },
              { label: 'Add Tenant', path: '/landlord/tenants', color: 'bg-green-600 hover:bg-green-700' },
              { label: 'Create Bill', path: '/landlord/payments', color: 'bg-purple-600 hover:bg-purple-700' },
              { label: 'View Reports', path: '/landlord/reports', color: 'bg-orange-600 hover:bg-orange-700' },
            ].map(a => (
              <button key={a.path} onClick={() => navigate(a.path)}
                className={`${a.color} text-white py-3 rounded-xl text-sm font-medium transition-colors`}>
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Utility Anomaly Alerts */}
      {utilityAnomalies.length > 0 && (
        <div className="mt-6 bg-white rounded-xl shadow-sm border">
          <div className="flex justify-between items-center p-5 border-b">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <h2 className="font-bold text-gray-800">Utility Anomaly Alerts</h2>
              <span className="ml-1 bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                {utilityAnomalies.length}
              </span>
            </div>
            <button onClick={() => navigate('/landlord/payments')}
              className="text-xs text-blue-600 hover:underline">View Bills →</button>
          </div>
          <div className="divide-y">
            {utilityAnomalies.slice(0, 6).map(b => (
              <div key={b.id} className="p-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800 capitalize">
                      {b.utility_type} — Unit {b.unit}
                    </span>
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                      Anomaly
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {MONTHS[(b.month || 1) - 1]} {b.year} · {b.usage_value} units · KShs {(b.amount || 0).toLocaleString()}
                  </p>
                  {b.anomaly_reason && (
                    <p className="text-xs text-orange-600 mt-0.5">{b.anomaly_reason}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
          {utilityAnomalies.length > 6 && (
            <div className="p-3 text-center border-t">
              <button onClick={() => navigate('/landlord/payments')}
                className="text-xs text-blue-600 hover:underline">
                View {utilityAnomalies.length - 6} more anomalies →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

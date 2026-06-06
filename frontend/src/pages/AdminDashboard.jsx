import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { adminAPI } from '../services/api'

const emptyForm = { full_name: '', email: '', phone: '', password: '', role: 'landlord' }

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex justify-between items-center p-5 border-b">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function AdminDashboard() {
  const location = useLocation()
  const navigate = useNavigate()

  const activeTab = location.pathname === '/admin/tenants' ? 'tenants'
    : location.pathname === '/admin/landlords' ? 'landlords'
    : 'overview'

  const [landlords, setLandlords] = useState([])
  const [tenants, setTenants] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [search, setSearch] = useState('')

  useEffect(() => { fetchData() }, [activeTab])

  const fetchData = async () => {
    setLoading(true); setError('')
    try {
      if (activeTab === 'overview') {
        const [lRes, sRes] = await Promise.all([adminAPI.getLandlords(), adminAPI.getStats()])
        setLandlords(lRes.data); setStats(sRes.data)
      } else if (activeTab === 'landlords') {
        const [lRes, sRes] = await Promise.all([adminAPI.getLandlords(), adminAPI.getStats()])
        setLandlords(lRes.data); setStats(sRes.data)
      } else {
        const [tRes, sRes] = await Promise.all([adminAPI.getTenants(), adminAPI.getStats()])
        setTenants(tRes.data); setStats(sRes.data)
      }
    } catch { setError('Failed to load data') }
    finally { setLoading(false) }
  }

  const handleCreate = async (e) => {
    e.preventDefault(); setSaving(true); setError(''); setSuccess('')
    try {
      await adminAPI.createLandlord(form)
      setSuccess(`Landlord account created for ${form.full_name}`)
      setShowAdd(false); setForm(emptyForm); fetchData()
    } catch (err) { setError(err.response?.data?.detail || 'Failed to create account') }
    finally { setSaving(false) }
  }

  const handleToggle = async (landlord) => {
    try {
      landlord.is_active ? await adminAPI.deactivateLandlord(landlord.id) : await adminAPI.activateLandlord(landlord.id)
      fetchData()
    } catch { setError('Failed to update landlord status') }
  }

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const filteredTenants = tenants.filter(t =>
    t.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.email?.toLowerCase().includes(search.toLowerCase()) ||
    t.property?.toLowerCase().includes(search.toLowerCase())
  )

  const filteredLandlords = landlords.filter(l =>
    l.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    l.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">System-wide management</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {[['overview','Overview'],['landlords','Landlords'],['tenants','Tenants']].map(([key, label]) => (
          <button key={key}
            onClick={() => navigate(key === 'overview' ? '/admin' : `/admin/${key}`)}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === key ? 'bg-white shadow text-blue-700' : 'text-gray-600 hover:text-gray-800'}`}>
            {label}
          </button>
        ))}
      </div>

      {error && <div className="bg-red-100 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}
      {success && <div className="bg-green-100 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">{success}</div>}

      {/* ===== OVERVIEW TAB ===== */}
      {activeTab === 'overview' && (
        <>
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white p-5 rounded-xl shadow-sm border">
                <p className="text-sm text-gray-500">Total Landlords</p>
                <p className="text-3xl font-bold mt-1">{stats.total_landlords}</p>
              </div>
              <div className="bg-white p-5 rounded-xl shadow-sm border">
                <p className="text-sm text-gray-500">Active Landlords</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{stats.active_landlords}</p>
              </div>
              <div className="bg-white p-5 rounded-xl shadow-sm border">
                <p className="text-sm text-gray-500">Inactive Landlords</p>
                <p className="text-3xl font-bold text-red-500 mt-1">{stats.inactive_landlords}</p>
              </div>
              <div className="bg-white p-5 rounded-xl shadow-sm border">
                <p className="text-sm text-gray-500">Total Tenants</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{stats.total_tenants}</p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="font-bold text-gray-800 mb-4">Recent Landlords</h3>
              {landlords.slice(0, 5).map(l => (
                <div key={l.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium text-sm">{l.full_name}</p>
                    <p className="text-xs text-gray-500">{l.email}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${l.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {l.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))}
              {landlords.length === 0 && !loading && <p className="text-gray-400 text-sm">No landlords yet.</p>}
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="font-bold text-gray-800 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button onClick={() => { setForm(emptyForm); navigate('/admin/landlords'); setShowAdd(true) }}
                  className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 text-sm font-medium">
                  + Create Landlord Account
                </button>
                <button onClick={() => navigate('/admin/tenants')}
                  className="w-full border border-gray-300 text-gray-700 py-2.5 rounded-lg hover:bg-gray-50 text-sm font-medium">
                  View All Tenants
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ===== LANDLORDS TAB ===== */}
      {activeTab === 'landlords' && (
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="flex justify-between items-center p-5 border-b">
            <div className="flex items-center gap-3">
              <h2 className="font-bold text-gray-800">Landlord Accounts</h2>
              {stats && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{stats.total_landlords} total</span>}
            </div>
            <div className="flex gap-3">
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search..." className="border rounded-lg px-3 py-2 text-sm w-48" />
              <button onClick={() => { setForm(emptyForm); setShowAdd(true) }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
                + New Landlord
              </button>
            </div>
          </div>
          {loading ? (
            <p className="text-center text-gray-500 py-10">Loading...</p>
          ) : filteredLandlords.length === 0 ? (
            <p className="text-center text-gray-400 py-10">No landlords found.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500 text-xs uppercase bg-gray-50">
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Phone</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLandlords.map(l => (
                  <tr key={l.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-5 py-4 font-medium">{l.full_name}</td>
                    <td className="px-5 py-4 text-gray-600">{l.email}</td>
                    <td className="px-5 py-4 text-gray-600">{l.phone || '—'}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${l.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {l.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <button onClick={() => handleToggle(l)}
                        className={`text-xs font-medium px-3 py-1 rounded-lg border ${l.is_active ? 'text-red-600 border-red-200 hover:bg-red-50' : 'text-green-600 border-green-200 hover:bg-green-50'}`}>
                        {l.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ===== TENANTS TAB ===== */}
      {activeTab === 'tenants' && (
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="flex justify-between items-center p-5 border-b">
            <div className="flex items-center gap-3">
              <h2 className="font-bold text-gray-800">All Tenants</h2>
              {stats && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{stats.total_tenants} total</span>}
            </div>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search name, email, property..." className="border rounded-lg px-3 py-2 text-sm w-64" />
          </div>
          {loading ? (
            <p className="text-center text-gray-500 py-10">Loading...</p>
          ) : filteredTenants.length === 0 ? (
            <p className="text-center text-gray-400 py-10">No tenants found.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500 text-xs uppercase bg-gray-50">
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Property</th>
                  <th className="px-5 py-3">Unit</th>
                  <th className="px-5 py-3">Lease Start</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredTenants.map(t => (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-5 py-4 font-medium">{t.name}</td>
                    <td className="px-5 py-4 text-gray-600">{t.email}</td>
                    <td className="px-5 py-4 text-gray-600">{t.property || '—'}</td>
                    <td className="px-5 py-4"><span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">{t.unit || '—'}</span></td>
                    <td className="px-5 py-4 text-gray-600">{t.lease_start ? new Date(t.lease_start).toLocaleDateString() : '—'}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${t.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {t.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Create Landlord Modal */}
      {showAdd && (
        <Modal title="Create Landlord Account" onClose={() => setShowAdd(false)}>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.full_name} onChange={e => setField('full_name', e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.email} onChange={e => setField('email', e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.phone} onChange={e => setField('phone', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input type="password" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.password} onChange={e => setField('password', e.target.value)} required minLength={6} />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Creating...' : 'Create Account'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

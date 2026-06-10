import React, { useState, useEffect } from 'react'
import { landlordExtAPI, landlordAPI, mlAPI } from '../services/api'

const emptyForm = {
  full_name: '', email: '', phone: '', password: '',
  unit_id: '', property_id: '',
  lease_start_date: '', lease_end_date: '',
  deposit_amount: ''
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex justify-between items-center p-5 border-b">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="p-5 max-h-[70vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

const RISK_COLORS = {
  Low: { bar: 'bg-green-500', text: 'text-green-700', badge: 'bg-green-100 text-green-700' },
  Medium: { bar: 'bg-yellow-500', text: 'text-yellow-700', badge: 'bg-yellow-100 text-yellow-700' },
  High: { bar: 'bg-red-500', text: 'text-red-700', badge: 'bg-red-100 text-red-700' },
}

function RiskModal({ tenant, onClose }) {
  const [risk, setRisk] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    mlAPI.predictRisk(tenant.id)
      .then(r => setRisk(r.data))
      .catch(() => setError('Could not load risk data'))
      .finally(() => setLoading(false))
  }, [tenant.id])

  const colors = risk ? RISK_COLORS[risk.risk_level] || RISK_COLORS.Low : null

  return (
    <Modal title={`Risk Assessment — ${tenant.name}`} onClose={onClose}>
      {loading && <p className="text-center text-gray-500 py-6">Analysing...</p>}
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {risk && (
        <div className="space-y-4">
          {/* Score gauge */}
          <div className="text-center">
            <p className="text-6xl font-bold mt-2" style={{ color: colors.bar.replace('bg-', '').includes('green') ? '#16a34a' : colors.bar.includes('yellow') ? '#ca8a04' : '#dc2626' }}>
              {risk.risk_score}
            </p>
            <p className="text-sm text-gray-400 mb-2">Risk Score (0 – 100)</p>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full ${colors.bar} rounded-full transition-all`} style={{ width: `${risk.risk_score}%` }} />
            </div>
            <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-semibold ${colors.badge}`}>
              {risk.risk_level} Risk
            </span>
          </div>

          {/* Breakdown */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-2xl font-bold text-red-600">{risk.missed_payments}</p>
              <p className="text-xs text-gray-500 mt-1">Missed Payments</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-2xl font-bold text-gray-700">{risk.total_bills}</p>
              <p className="text-xs text-gray-500 mt-1">Total Bills</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-2xl font-bold text-orange-600">{risk.arrears_months}</p>
              <p className="text-xs text-gray-500 mt-1">Arrears Months</p>
            </div>
          </div>

          {/* Recommendation */}
          <div className={`rounded-lg p-3 ${risk.risk_level === 'High' ? 'bg-red-50 border border-red-100' : risk.risk_level === 'Medium' ? 'bg-yellow-50 border border-yellow-100' : 'bg-green-50 border border-green-100'}`}>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Recommendation</p>
            <p className="text-sm font-medium">{risk.recommendation}</p>
          </div>
        </div>
      )}
    </Modal>
  )
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState([])
  const [properties, setProperties] = useState([])
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [riskTenant, setRiskTenant] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [search, setSearch] = useState('')
  const [filterProperty, setFilterProperty] = useState('')

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [tRes, pRes] = await Promise.all([landlordExtAPI.getTenants(), landlordAPI.getProperties()])
      setTenants(tRes.data)
      setProperties(pRes.data)
    } catch { setError('Failed to load tenants') }
    finally { setLoading(false) }
  }

  const handlePropertyChange = async (propertyId) => {
    setForm(f => ({ ...f, property_id: propertyId, unit_id: '' }))
    if (!propertyId) { setUnits([]); return }
    try {
      const res = await landlordAPI.getUnits(propertyId)
      setUnits(res.data.filter(u => !u.is_occupied))
    } catch { setUnits([]) }
  }

  const handleCreate = async (e) => {
    e.preventDefault(); setSaving(true); setError(''); setSuccess('')
    try {
      const payload = {
        full_name: form.full_name,
        email: form.email,
        phone: form.phone || null,
        password: form.password,
        unit_id: parseInt(form.unit_id),
        lease_start_date: form.lease_start_date,
        lease_end_date: form.lease_end_date || null,
        deposit_amount: form.deposit_amount ? parseFloat(form.deposit_amount) : null,
      }
      await landlordExtAPI.createTenant(payload)
      setSuccess(`Tenant ${form.full_name} added successfully`)
      setShowAdd(false); setForm(emptyForm); setUnits([]); fetchAll()
    } catch (err) { setError(err.response?.data?.detail || 'Failed to add tenant') }
    finally { setSaving(false) }
  }

  const handleRemove = async (tenantId, name) => {
    if (!window.confirm(`Remove ${name} from their house? Their account will be deactivated.`)) return
    setRemoving(tenantId)
    try {
      await landlordExtAPI.removeTenant(tenantId)
      setSuccess(`${name} removed successfully`)
      fetchAll()
    } catch { setError('Failed to remove tenant') }
    finally { setRemoving(null) }
  }

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const filtered = tenants
    .filter(t => !filterProperty || String(t.property_id) === String(filterProperty))
    .filter(t =>
      t.name?.toLowerCase().includes(search.toLowerCase()) ||
      t.email?.toLowerCase().includes(search.toLowerCase()) ||
      t.property?.toLowerCase().includes(search.toLowerCase()) ||
      t.unit?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const propCmp = (a.property || '').localeCompare(b.property || '')
      if (propCmp !== 0) return propCmp
      return (a.unit || '').localeCompare(b.unit || '', undefined, { numeric: true, sensitivity: 'base' })
    })

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Tenants</h1>
        <p className="text-gray-500 text-sm mt-1">Manage tenant accounts and lease assignments</p>
      </div>

      {error && <div className="bg-red-100 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}
      {success && <div className="bg-green-100 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">{success}</div>}

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border text-center">
          <p className="text-2xl font-bold">{filtered.length}</p>
          <p className="text-xs text-gray-500 mt-1">{filterProperty ? 'Tenants (filtered)' : 'Total Tenants'}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border text-center">
          <p className="text-2xl font-bold text-green-600">{filtered.filter(t => t.is_active).length}</p>
          <p className="text-xs text-gray-500 mt-1">Active</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border text-center">
          <p className="text-2xl font-bold text-blue-600">
            KShs {filtered.reduce((s, t) => s + (t.monthly_rent || 0), 0).toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">Monthly Rent Total</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border">
        <div className="flex justify-between items-center p-5 border-b">
          <h2 className="font-bold text-gray-800">Tenant List</h2>
          <div className="flex gap-3">
            <select
              value={filterProperty}
              onChange={e => setFilterProperty(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">All Properties</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search tenants..." className="border rounded-lg px-3 py-2 text-sm w-48" />
            <button onClick={() => { setForm(emptyForm); setUnits([]); setShowAdd(true) }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
              + Add Tenant
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-center text-gray-500 py-12">Loading tenants...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">No tenants found</p>
            <p className="text-gray-400 text-sm mt-1">Add a tenant to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500 text-xs uppercase bg-gray-50">
                  <th className="px-5 py-3">House No.</th>
                  <th className="px-5 py-3">Tenant Name</th>
                  <th className="px-5 py-3">Contact</th>
                  <th className="px-5 py-3">Monthly Rent</th>
                  <th className="px-5 py-3">Lease Period</th>
                  <th className="px-5 py-3">Deposit</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <span className="inline-block bg-blue-600 text-white px-2.5 py-1 rounded-lg text-sm font-bold">{t.unit || '—'}</span>
                      <p className="text-xs text-gray-400 mt-1">{t.property || '—'}</p>
                    </td>
                    <td className="px-5 py-4 font-medium">{t.name}</td>
                    <td className="px-5 py-4">
                      <p className="text-gray-700">{t.email}</p>
                      <p className="text-gray-400 text-xs">{t.phone || '—'}</p>
                    </td>
                    <td className="px-5 py-4 font-medium">KShs {(t.monthly_rent || 0).toLocaleString()}</td>
                    <td className="px-5 py-4 text-gray-600 text-xs">
                      <p>{t.lease_start ? new Date(t.lease_start).toLocaleDateString() : '—'}</p>
                      <p>{t.lease_end ? new Date(t.lease_end).toLocaleDateString() : 'Open ended'}</p>
                    </td>
                    <td className="px-5 py-4 text-gray-600">
                      {t.deposit ? `KShs ${t.deposit.toLocaleString()}` : '—'}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${t.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {t.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setRiskTenant(t)}
                          className="text-xs text-blue-600 border border-blue-200 px-3 py-1 rounded-lg hover:bg-blue-50">
                          Risk
                        </button>
                        {t.is_active && (
                          <button
                            onClick={() => handleRemove(t.id, t.name)}
                            disabled={removing === t.id}
                            className="text-xs text-red-600 border border-red-200 px-3 py-1 rounded-lg hover:bg-red-50 disabled:opacity-50">
                            {removing === t.id ? '...' : 'Remove'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {riskTenant && <RiskModal tenant={riskTenant} onClose={() => setRiskTenant(null)} />}

      {showAdd && (
        <Modal title="Add New Tenant" onClose={() => { setShowAdd(false); setUnits([]) }}>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.full_name} onChange={e => setField('full_name', e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input type="email" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.email} onChange={e => setField('email', e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.phone} onChange={e => setField('phone', e.target.value)} placeholder="e.g. 0712345678" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Login Password *</label>
                <input type="password" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.password} onChange={e => setField('password', e.target.value)} required minLength={6} placeholder="Min. 6 characters" />
              </div>

              <div className="col-span-2 border-t pt-3">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">House Assignment</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Property *</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.property_id} onChange={e => handlePropertyChange(e.target.value)} required>
                  <option value="">Select property</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">House Number *</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.unit_id} onChange={e => setField('unit_id', e.target.value)} required disabled={!form.property_id}>
                  <option value="">Select house number</option>
                  {units.map(u => (
                    <option key={u.id} value={u.id}>{u.unit_number} — KShs {u.monthly_rent?.toLocaleString()}/mo</option>
                  ))}
                </select>
                {form.property_id && units.length === 0 && <p className="text-xs text-orange-500 mt-1">No vacant houses in this property</p>}
              </div>

              <div className="col-span-2 border-t pt-3">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Lease Details</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lease Start *</label>
                <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.lease_start_date} onChange={e => setField('lease_start_date', e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lease End</label>
                <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.lease_end_date} onChange={e => setField('lease_end_date', e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Security Deposit (KShs)</label>
                <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.deposit_amount} onChange={e => setField('deposit_amount', e.target.value)} min="0" step="0.01" />
              </div>
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => { setShowAdd(false); setUnits([]) }} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Creating...' : 'Add Tenant'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

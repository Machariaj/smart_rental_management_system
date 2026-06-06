import React, { useState, useEffect } from 'react'
import useAuthStore from '../store/authStore'
import { landlordAPI, tenantAPI } from '../services/api'

const PRIORITIES = ['low', 'medium', 'high', 'urgent']
const CATEGORIES = ['plumbing', 'electrical', 'structural', 'pest_control', 'cleaning', 'appliance', 'other']
const STATUS_COLORS = {
  submitted: 'bg-blue-100 text-blue-700',
  approved: 'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
}
const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-5 border-b">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

// ─── LANDLORD VIEW ─────────────────────────────────────────────────────────────
function LandlordMaintenance() {
  const [properties, setProperties] = useState([])
  const [selectedProp, setSelectedProp] = useState('')
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(false)
  const [approving, setApproving] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    landlordAPI.getProperties().then(r => setProperties(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedProp) { setRequests([]); return }
    setLoading(true)
    landlordAPI.getMaintenanceRequests(selectedProp)
      .then(r => setRequests(r.data))
      .catch(() => setError('Failed to load maintenance requests'))
      .finally(() => setLoading(false))
  }, [selectedProp])

  const handleApprove = async (requestId) => {
    setApproving(requestId); setError('')
    try {
      await landlordAPI.approveMaintenanceRequest(requestId)
      setSuccess('Request approved')
      const r = await landlordAPI.getMaintenanceRequests(selectedProp)
      setRequests(r.data)
    } catch { setError('Failed to approve request') }
    finally { setApproving(null) }
  }

  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter)

  const counts = {
    all: requests.length,
    submitted: requests.filter(r => r.status === 'submitted').length,
    approved: requests.filter(r => r.status === 'approved').length,
    completed: requests.filter(r => r.status === 'completed').length,
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Maintenance Requests</h1>
        <p className="text-gray-500 text-sm mt-1">Review and approve tenant maintenance requests</p>
      </div>

      {error && <div className="bg-red-100 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}
      {success && <div className="bg-green-100 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">{success}</div>}

      {/* Property Selector */}
      <div className="bg-white rounded-xl shadow-sm border p-4 mb-6 flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Select Property:</label>
        <select className="border rounded-lg px-3 py-2 text-sm flex-1 max-w-xs"
          value={selectedProp} onChange={e => setSelectedProp(e.target.value)}>
          <option value="">-- Choose a property --</option>
          {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {selectedProp && (
        <>
          {/* Status filter tabs */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {[['all','All'],['submitted','Submitted'],['approved','Approved'],['completed','Completed']].map(([key, label]) => (
              <button key={key} onClick={() => setFilter(key)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${filter === key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}>
                {label} {counts[key] > 0 && <span className="ml-1 bg-white bg-opacity-30 text-xs px-1.5 rounded-full">{counts[key]}</span>}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-xl shadow-sm border">
            {loading ? (
              <p className="text-center text-gray-500 py-10">Loading...</p>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400">No maintenance requests found</p>
              </div>
            ) : (
              <div className="divide-y">
                {filtered.map(req => (
                  <div key={req.id} className="p-5 hover:bg-gray-50">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[req.status] || 'bg-gray-100 text-gray-600'}`}>
                            {req.status?.replace('_', ' ')}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[req.priority] || ''}`}>
                            {req.priority}
                          </span>
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full capitalize">
                            {req.category?.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="font-medium text-gray-800">{req.title || req.description?.substring(0, 60)}</p>
                        <p className="text-sm text-gray-600 mt-1">{req.description}</p>
                        <div className="flex gap-4 mt-2 text-xs text-gray-400">
                          <span>Unit: <strong className="text-gray-600">{req.unit_id}</strong></span>
                          <span>Submitted: {new Date(req.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        {req.status === 'submitted' && (
                          <button onClick={() => handleApprove(req.id)} disabled={approving === req.id}
                            className="text-sm bg-green-600 text-white px-4 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50">
                            {approving === req.id ? '...' : 'Approve'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ─── TENANT VIEW ───────────────────────────────────────────────────────────────
function TenantMaintenance() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState({ description: '', category: 'plumbing', priority: 'medium' })

  useEffect(() => { fetchRequests() }, [])

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const r = await tenantAPI.getMaintenanceRequests()
      setRequests(r.data)
    } catch { setError('Failed to load requests') }
    finally { setLoading(false) }
  }

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setError('')
    try {
      await tenantAPI.submitMaintenance(form)
      setSuccess('Maintenance request submitted successfully')
      setShowNew(false); setForm({ description: '', category: 'plumbing', priority: 'medium' })
      fetchRequests()
    } catch (err) { setError(err.response?.data?.detail || 'Failed to submit request') }
    finally { setSaving(false) }
  }

  const StatusTimeline = ({ status }) => {
    const steps = ['submitted', 'approved', 'in_progress', 'completed']
    const currentIdx = steps.indexOf(status)
    return (
      <div className="flex items-center gap-1 mt-2">
        {steps.map((s, i) => (
          <React.Fragment key={s}>
            <div className={`flex items-center gap-1 text-xs ${i <= currentIdx ? 'text-green-600' : 'text-gray-300'}`}>
              <div className={`w-3 h-3 rounded-full ${i <= currentIdx ? 'bg-green-500' : 'bg-gray-200'} ${i === currentIdx ? 'ring-2 ring-green-300' : ''}`} />
              <span className="hidden md:inline capitalize">{s.replace('_', ' ')}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-0.5 w-6 ${i < currentIdx ? 'bg-green-400' : 'bg-gray-200'}`} />
            )}
          </React.Fragment>
        ))}
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Maintenance Requests</h1>
          <p className="text-gray-500 text-sm mt-1">Submit and track maintenance issues</p>
        </div>
        <button onClick={() => setShowNew(true)} className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 font-medium text-sm">
          + New Request
        </button>
      </div>

      {error && <div className="bg-red-100 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}
      {success && <div className="bg-green-100 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">{success}</div>}

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {['submitted','approved','in_progress','completed'].map(s => (
          <div key={s} className="bg-white p-4 rounded-xl shadow-sm border text-center">
            <p className="text-2xl font-bold">{requests.filter(r => r.status === s).length}</p>
            <p className="text-xs text-gray-500 mt-1 capitalize">{s.replace('_', ' ')}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <p className="text-center text-gray-500 py-12">Loading...</p>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border">
          <p className="text-gray-400 text-lg">No maintenance requests yet</p>
          <p className="text-gray-400 text-sm mt-1">Click "New Request" to report an issue</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map(req => (
            <div key={req.id} className="bg-white rounded-xl shadow-sm border p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[req.status] || ''}`}>
                      {req.status?.replace('_', ' ')}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[req.priority] || ''}`}>
                      {req.priority} priority
                    </span>
                    <span className="text-xs text-gray-400 capitalize">{req.category?.replace('_', ' ')}</span>
                  </div>
                  <h3 className="font-semibold text-gray-800">{req.title || 'Maintenance Request'}</h3>
                  <p className="text-sm text-gray-600 mt-1">{req.description}</p>
                  <p className="text-xs text-gray-400 mt-2">Submitted {new Date(req.created_at).toLocaleString()}</p>
                </div>
              </div>
              <StatusTimeline status={req.status} />
            </div>
          ))}
        </div>
      )}

      {showNew && (
        <Modal title="New Maintenance Request" onClose={() => setShowNew(false)}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority *</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                  {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
              <textarea rows={4} className="w-full border rounded-lg px-3 py-2 text-sm resize-none" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the issue in detail..." required />
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setShowNew(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

export default function MaintenancePage() {
  const { user } = useAuthStore()
  return user?.role === 'landlord' ? <LandlordMaintenance /> : <TenantMaintenance />
}

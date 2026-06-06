import React, { useState, useEffect } from 'react'
import useAuthStore from '../store/authStore'
import { landlordAPI, landlordExtAPI, tenantAPI } from '../services/api'

const UTILITY_TYPES = ['water', 'electricity', 'gas', 'internet', 'garbage']

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

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
function LandlordPayments() {
  const [properties, setProperties] = useState([])
  const [selectedProp, setSelectedProp] = useState('')
  const [units, setUnits] = useState([])
  const [tenants, setTenants] = useState([])
  const [bills, setBills] = useState([])
  const [payments, setPayments] = useState([])
  const [tab, setTab] = useState('bills')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [utilityBills, setUtilityBills] = useState([])
  const [showBill, setShowBill] = useState(false)
  const [showRecordPay, setShowRecordPay] = useState(false)
  const [showUtility, setShowUtility] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [billForm, setBillForm] = useState({ unit_id: '', month: '', year: '', amount: '', due_date: '' })
  const [payForm, setPayForm] = useState({ tenant_id: '', rent_bill_id: '', amount: '', payment_method: 'cash', reference_number: '' })
  const [utilForm, setUtilForm] = useState({ unit_id: '', utility_type: 'water', month: '', year: '', amount: '', usage_value: '' })
  const [saving, setSaving] = useState(false)
  const [verifying, setVerifying] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const now = new Date()

  useEffect(() => {
    landlordAPI.getProperties().then(r => setProperties(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedProp) { setBills([]); setPayments([]); setUnits([]); setTenants([]); return }
    setLoading(true)
    Promise.all([
      landlordExtAPI.getRentBills(selectedProp),
      landlordExtAPI.getPayments(selectedProp),
      landlordAPI.getUnits(selectedProp),
      landlordExtAPI.getTenants(),
      landlordExtAPI.getUtilityBills(selectedProp).catch(() => ({ data: [] })),
    ]).then(([bRes, pRes, uRes, tRes, uBillRes]) => {
      setBills(bRes.data); setPayments(pRes.data); setUnits(uRes.data)
      setUtilityBills(uBillRes.data)
      const propTenants = tRes.data.filter(t => String(t.property_id) === String(selectedProp))
      setTenants(propTenants)
    }).catch(() => setError('Failed to load payment data'))
    .finally(() => setLoading(false))
  }, [selectedProp])

  const handleCreateBill = async (e) => {
    e.preventDefault(); setSaving(true); setError('')
    try {
      await landlordExtAPI.createRentBill({
        unit_id: parseInt(billForm.unit_id),
        month: parseInt(billForm.month),
        year: parseInt(billForm.year),
        amount: parseFloat(billForm.amount),
        due_date: billForm.due_date
      })
      setSuccess('Rent bill created'); setShowBill(false)
      setBillForm({ unit_id: '', month: '', year: '', amount: '', due_date: '' })
      const bRes = await landlordExtAPI.getRentBills(selectedProp)
      setBills(bRes.data)
    } catch (err) { setError(err.response?.data?.detail || 'Failed to create bill') }
    finally { setSaving(false) }
  }

  const handleSeedData = async () => {
    if (!window.confirm('This will create up to 10 test tenants and generate 6 months of bills, payments, and utility data. Continue?')) return
    setSeeding(true); setError('')
    try {
      const res = await landlordExtAPI.seedTestData(selectedProp)
      const d = res.data
      setSuccess(`Seeded: ${d.tenants_created} tenants created, ${d.rent_bills_created} bills, ${d.payments_created} payments, ${d.utility_bills_created} utility records (${d.anomalies_detected} anomalies). Tenant password: Test@1234`)
      const [bRes, pRes, uBillRes] = await Promise.all([
        landlordExtAPI.getRentBills(selectedProp),
        landlordExtAPI.getPayments(selectedProp),
        landlordExtAPI.getUtilityBills(selectedProp),
      ])
      setBills(bRes.data); setPayments(pRes.data); setUtilityBills(uBillRes.data)
    } catch (err) { setError(err.response?.data?.detail || 'Failed to seed data') }
    finally { setSeeding(false) }
  }

  const handleCreateUtility = async (e) => {
    e.preventDefault(); setSaving(true); setError('')
    try {
      const res = await landlordExtAPI.createUtilityBill({
        unit_id: parseInt(utilForm.unit_id),
        utility_type: utilForm.utility_type,
        month: parseInt(utilForm.month),
        year: parseInt(utilForm.year),
        amount: parseFloat(utilForm.amount),
        usage_value: parseFloat(utilForm.usage_value),
      })
      if (res.data.is_anomalous) {
        setSuccess(`Utility bill saved. ⚠ Anomaly detected: ${res.data.anomaly_reason}`)
      } else {
        setSuccess('Utility bill recorded')
      }
      setShowUtility(false)
      setUtilForm({ unit_id: '', utility_type: 'water', month: '', year: '', amount: '', usage_value: '' })
      const uBillRes = await landlordExtAPI.getUtilityBills(selectedProp)
      setUtilityBills(uBillRes.data)
    } catch (err) { setError(err.response?.data?.detail || 'Failed to save utility bill') }
    finally { setSaving(false) }
  }

  const handleDeleteUtility = async (id) => {
    setDeleting(id)
    try {
      await landlordExtAPI.deleteUtilityBill(id)
      setUtilityBills(u => u.filter(b => b.id !== id))
    } catch { setError('Failed to delete') }
    finally { setDeleting(null) }
  }

  const handleRecordPayment = async (e) => {
    e.preventDefault(); setSaving(true); setError('')
    try {
      await landlordExtAPI.recordPayment({
        tenant_id: parseInt(payForm.tenant_id),
        rent_bill_id: payForm.rent_bill_id ? parseInt(payForm.rent_bill_id) : null,
        amount: parseFloat(payForm.amount),
        payment_method: payForm.payment_method,
        reference_number: payForm.reference_number || null,
        mark_bill_paid: true,
      })
      setSuccess('Payment recorded and bill marked as paid')
      setShowRecordPay(false)
      setPayForm({ tenant_id: '', rent_bill_id: '', amount: '', payment_method: 'cash', reference_number: '' })
      const [bRes, pRes] = await Promise.all([
        landlordExtAPI.getRentBills(selectedProp),
        landlordExtAPI.getPayments(selectedProp),
      ])
      setBills(bRes.data); setPayments(pRes.data)
    } catch (err) { setError(err.response?.data?.detail || 'Failed to record payment') }
    finally { setSaving(false) }
  }

  const handleVerify = async (paymentId) => {
    setVerifying(paymentId)
    try {
      await landlordExtAPI.verifyPayment(paymentId)
      setSuccess('Payment verified')
      const pRes = await landlordExtAPI.getPayments(selectedProp)
      setPayments(pRes.data)
    } catch { setError('Failed to verify payment') }
    finally { setVerifying(null) }
  }

  const totalBilled = bills.reduce((s, b) => s + b.amount, 0)
  const totalPaid = bills.filter(b => b.is_paid).reduce((s, b) => s + b.amount, 0)
  const collectionRate = totalBilled > 0 ? ((totalPaid / totalBilled) * 100).toFixed(0) : 0

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Payments</h1>
        <p className="text-gray-500 text-sm mt-1">Rent bills and payment collection</p>
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
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl shadow-sm border">
              <p className="text-xs text-gray-500">Total Billed</p>
              <p className="text-xl font-bold mt-1">KShs {totalBilled.toLocaleString()}</p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border">
              <p className="text-xs text-gray-500">Collected</p>
              <p className="text-xl font-bold text-green-600 mt-1">KShs {totalPaid.toLocaleString()}</p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border">
              <p className="text-xs text-gray-500">Collection Rate</p>
              <p className="text-xl font-bold text-blue-600 mt-1">{collectionRate}%</p>
            </div>
          </div>

          {/* Tabs + Seed button */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              {[['bills','Rent Bills'],['payments','Payments Received'],['utilities','Utility Bills']].map(([key, label]) => (
                <button key={key} onClick={() => setTab(key)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === key ? 'bg-white shadow text-blue-700' : 'text-gray-600'}`}>
                  {label}
                  {key === 'utilities' && utilityBills.filter(b => b.is_anomalous).length > 0 && (
                    <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full px-1.5">{utilityBills.filter(b => b.is_anomalous).length}</span>
                  )}
                </button>
              ))}
            </div>
            <button onClick={handleSeedData} disabled={seeding}
              className="text-xs border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-50">
              {seeding ? 'Generating...' : '⚙ Generate Test Data'}
            </button>
          </div>

          {/* Bills Tab */}
          {tab === 'bills' && (
            <div className="bg-white rounded-xl shadow-sm border">
              <div className="flex justify-between items-center p-5 border-b">
                <h2 className="font-bold text-gray-800">Rent Bills</h2>
                <button onClick={() => setShowBill(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
                  + Create Bill
                </button>
              </div>
              {loading ? (
                <p className="text-center text-gray-500 py-10">Loading...</p>
              ) : bills.length === 0 ? (
                <p className="text-center text-gray-400 py-10">No bills yet. Create one above.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500 text-xs uppercase bg-gray-50">
                      <th className="px-5 py-3">House No.</th>
                      <th className="px-5 py-3">Tenant</th>
                      <th className="px-5 py-3">Period</th>
                      <th className="px-5 py-3">Amount</th>
                      <th className="px-5 py-3">Due Date</th>
                      <th className="px-5 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bills.map(b => (
                      <tr key={b.id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="px-5 py-4"><span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">{b.unit}</span></td>
                        <td className="px-5 py-4 text-gray-600">{b.tenant_name}</td>
                        <td className="px-5 py-4 text-gray-600">{MONTHS[b.month - 1]} {b.year}</td>
                        <td className="px-5 py-4 font-medium">KShs {b.amount?.toLocaleString()}</td>
                        <td className="px-5 py-4 text-gray-600">{new Date(b.due_date).toLocaleDateString()}</td>
                        <td className="px-5 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${b.is_paid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                            {b.is_paid ? `Paid ${b.paid_date ? new Date(b.paid_date).toLocaleDateString() : ''}` : 'Unpaid'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Payments Tab */}
          {tab === 'payments' && (
            <div className="bg-white rounded-xl shadow-sm border">
              <div className="flex justify-between items-center p-5 border-b">
                <h2 className="font-bold text-gray-800">Payment Records</h2>
                <button onClick={() => setShowRecordPay(true)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-medium">
                  + Record Payment
                </button>
              </div>
              {loading ? (
                <p className="text-center text-gray-500 py-10">Loading...</p>
              ) : payments.length === 0 ? (
                <p className="text-center text-gray-400 py-10">No payments recorded yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500 text-xs uppercase bg-gray-50">
                      <th className="px-5 py-3">Tenant</th>
                      <th className="px-5 py-3">House No.</th>
                      <th className="px-5 py-3">Amount</th>
                      <th className="px-5 py-3">Method</th>
                      <th className="px-5 py-3">Reference</th>
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3">Verified</th>
                      <th className="px-5 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map(p => (
                      <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="px-5 py-4 font-medium">{p.tenant_name}</td>
                        <td className="px-5 py-4"><span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs">{p.unit || '—'}</span></td>
                        <td className="px-5 py-4 font-medium">KShs {p.amount?.toLocaleString()}</td>
                        <td className="px-5 py-4 text-gray-600 capitalize">{p.method || '—'}</td>
                        <td className="px-5 py-4 text-gray-600 font-mono text-xs">{p.reference || '—'}</td>
                        <td className="px-5 py-4 text-gray-600">{new Date(p.date).toLocaleDateString()}</td>
                        <td className="px-5 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.is_verified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {p.is_verified ? 'Verified' : 'Pending'}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          {!p.is_verified && (
                            <button onClick={() => handleVerify(p.id)} disabled={verifying === p.id}
                              className="text-xs text-green-700 border border-green-300 px-3 py-1 rounded-lg hover:bg-green-50 disabled:opacity-50">
                              {verifying === p.id ? '...' : 'Verify'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
          {/* Utilities Tab */}
          {tab === 'utilities' && (
            <div className="bg-white rounded-xl shadow-sm border">
              <div className="flex justify-between items-center p-5 border-b">
                <div className="flex items-center gap-3">
                  <h2 className="font-bold text-gray-800">Utility Bills</h2>
                  {utilityBills.filter(b => b.is_anomalous).length > 0 && (
                    <span className="bg-red-100 text-red-700 text-xs font-medium px-2.5 py-1 rounded-full">
                      ⚠ {utilityBills.filter(b => b.is_anomalous).length} anomaly alert{utilityBills.filter(b => b.is_anomalous).length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <button onClick={() => setShowUtility(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
                  + Record Utility Bill
                </button>
              </div>

              {/* Anomaly alerts banner */}
              {utilityBills.filter(b => b.is_anomalous).length > 0 && (
                <div className="mx-5 mt-4 bg-red-50 border border-red-100 rounded-lg p-3">
                  <p className="text-sm font-semibold text-red-700 mb-2">Irregular Consumption Detected</p>
                  {utilityBills.filter(b => b.is_anomalous).map(b => (
                    <div key={b.id} className="flex items-center gap-2 text-sm text-red-600 mb-1">
                      <span>⚠</span>
                      <span><strong>{b.unit}</strong> — {b.utility_type} ({MONTHS[b.month-1]} {b.year}): {b.anomaly_reason}</span>
                    </div>
                  ))}
                </div>
              )}

              {utilityBills.length === 0 ? (
                <p className="text-center text-gray-400 py-10">No utility bills recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-500 text-xs uppercase bg-gray-50">
                        <th className="px-5 py-3">House No.</th>
                        <th className="px-5 py-3">Type</th>
                        <th className="px-5 py-3">Period</th>
                        <th className="px-5 py-3">Usage</th>
                        <th className="px-5 py-3">Amount</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {utilityBills.map(b => (
                        <tr key={b.id} className={`border-b last:border-0 hover:bg-gray-50 ${b.is_anomalous ? 'bg-red-50' : ''}`}>
                          <td className="px-5 py-3"><span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">{b.unit}</span></td>
                          <td className="px-5 py-3 capitalize font-medium">{b.utility_type}</td>
                          <td className="px-5 py-3 text-gray-600">{MONTHS[b.month - 1]} {b.year}</td>
                          <td className="px-5 py-3 text-gray-600">{b.usage_value} units</td>
                          <td className="px-5 py-3 font-medium">KShs {b.amount?.toLocaleString()}</td>
                          <td className="px-5 py-3">
                            {b.is_anomalous ? (
                              <div>
                                <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-medium">⚠ Anomaly</span>
                                <p className="text-xs text-red-500 mt-0.5">{b.anomaly_reason}</p>
                              </div>
                            ) : (
                              <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">Normal</span>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            <button onClick={() => handleDeleteUtility(b.id)} disabled={deleting === b.id}
                              className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50">
                              {deleting === b.id ? '...' : 'Delete'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Create Bill Modal */}
      {showBill && (
        <Modal title="Create Rent Bill" onClose={() => setShowBill(false)}>
          <form onSubmit={handleCreateBill} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">House Number *</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={billForm.unit_id} onChange={e => setBillForm(f => ({ ...f, unit_id: e.target.value }))} required>
                <option value="">Select house</option>
                {units.map(u => <option key={u.id} value={u.id}>{u.unit_number} — KShs {u.monthly_rent?.toLocaleString()}/mo</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Month *</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm" value={billForm.month} onChange={e => setBillForm(f => ({ ...f, month: e.target.value }))} required>
                  <option value="">Month</option>
                  {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year *</label>
                <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={billForm.year} onChange={e => setBillForm(f => ({ ...f, year: e.target.value }))} required defaultValue={now.getFullYear()} min="2020" max="2030" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (KShs) *</label>
              <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={billForm.amount} onChange={e => setBillForm(f => ({ ...f, amount: e.target.value }))} required min="0" step="0.01" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date *</label>
              <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={billForm.due_date} onChange={e => setBillForm(f => ({ ...f, due_date: e.target.value }))} required />
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setShowBill(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Creating...' : 'Create Bill'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Utility Bill Modal */}
      {showUtility && (
        <Modal title="Record Utility Bill" onClose={() => setShowUtility(false)}>
          <form onSubmit={handleCreateUtility} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">House Number *</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm" value={utilForm.unit_id} onChange={e => setUtilForm(f => ({ ...f, unit_id: e.target.value }))} required>
                  <option value="">Select house</option>
                  {units.map(u => <option key={u.id} value={u.id}>{u.unit_number}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Utility Type *</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm" value={utilForm.utility_type} onChange={e => setUtilForm(f => ({ ...f, utility_type: e.target.value }))}>
                  {UTILITY_TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Month *</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm" value={utilForm.month} onChange={e => setUtilForm(f => ({ ...f, month: e.target.value }))} required>
                  <option value="">Month</option>
                  {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year *</label>
                <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={utilForm.year} onChange={e => setUtilForm(f => ({ ...f, year: e.target.value }))} defaultValue={new Date().getFullYear()} min="2020" max="2030" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Usage (units) *</label>
                <input type="number" step="0.1" className="w-full border rounded-lg px-3 py-2 text-sm" value={utilForm.usage_value} onChange={e => setUtilForm(f => ({ ...f, usage_value: e.target.value }))} placeholder="e.g. 12.5" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (KShs) *</label>
                <input type="number" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm" value={utilForm.amount} onChange={e => setUtilForm(f => ({ ...f, amount: e.target.value }))} required />
              </div>
            </div>
            <p className="text-xs text-gray-400">The system will automatically flag unusual consumption against the house's history.</p>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div className="flex gap-2 justify-end pt-1">
              <button type="button" onClick={() => setShowUtility(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Bill'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Record Payment Modal */}
      {showRecordPay && (
        <Modal title="Record Payment Received" onClose={() => setShowRecordPay(false)}>
          <form onSubmit={handleRecordPayment} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tenant *</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm"
                value={payForm.tenant_id}
                onChange={e => {
                  const tid = e.target.value
                  setPayForm(f => ({ ...f, tenant_id: tid, rent_bill_id: '', amount: '' }))
                }} required>
                <option value="">Select tenant</option>
                {tenants.map(t => (
                  <option key={t.id} value={t.user_id}>
                    {t.name} — {t.unit}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Apply to Bill (optional)</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm"
                value={payForm.rent_bill_id}
                onChange={e => {
                  const billId = e.target.value
                  const bill = bills.find(b => String(b.id) === billId)
                  setPayForm(f => ({ ...f, rent_bill_id: billId, amount: bill ? String(bill.amount) : f.amount }))
                }}>
                <option value="">General payment (no specific bill)</option>
                {bills.filter(b => !b.is_paid).map(b => (
                  <option key={b.id} value={b.id}>
                    {b.unit} · {MONTHS[b.month - 1]} {b.year} — KShs {b.amount?.toLocaleString()} (unpaid)
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">Selecting a bill will auto-fill the amount and mark it as paid.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (KShs) *</label>
              <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm"
                value={payForm.amount}
                onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))}
                required min="1" step="0.01" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method *</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm"
                value={payForm.payment_method}
                onChange={e => setPayForm(f => ({ ...f, payment_method: e.target.value }))}>
                <option value="cash">Cash</option>
                <option value="mpesa">M-Pesa</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reference / Transaction No.</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
                value={payForm.reference_number}
                onChange={e => setPayForm(f => ({ ...f, reference_number: e.target.value }))}
                placeholder="e.g. M-Pesa code, receipt no." />
            </div>

            <div className="bg-green-50 border border-green-100 rounded-lg px-3 py-2 text-xs text-green-800">
              Payment recorded by landlord is automatically marked as <strong>verified</strong>.
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setShowRecordPay(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                {saving ? 'Recording...' : 'Record Payment'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

// ─── TENANT VIEW ───────────────────────────────────────────────────────────────
function TenantPayments() {
  const [balance, setBalance] = useState(null)
  const [bills, setBills] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('bills')
  const [showPay, setShowPay] = useState(false)
  const [payForm, setPayForm] = useState({ amount: '', payment_method: 'mpesa', reference_number: '', rent_bill_id: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [balRes, billRes, histRes] = await Promise.all([
        tenantAPI.getBalance(), tenantAPI.getBills(), tenantAPI.getPaymentHistory()
      ])
      setBalance(balRes.data); setBills(billRes.data)
      setHistory(histRes.data.payments || [])
    } catch { setError('Failed to load payment data') }
    finally { setLoading(false) }
  }

  const handlePay = async (e) => {
    e.preventDefault(); setSaving(true); setError('')
    try {
      await tenantAPI.makePayment({
        amount: parseFloat(payForm.amount),
        payment_method: payForm.payment_method,
        reference_number: payForm.reference_number || null,
        rent_bill_id: payForm.rent_bill_id ? parseInt(payForm.rent_bill_id) : null,
      })
      setSuccess('Payment recorded successfully')
      setShowPay(false); setPayForm({ amount: '', payment_method: 'mpesa', reference_number: '', rent_bill_id: '' })
      fetchAll()
    } catch (err) { setError(err.response?.data?.detail || 'Failed to record payment') }
    finally { setSaving(false) }
  }

  const unpaidBills = bills.filter(b => !b.is_paid)

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">My Bills & Payments</h1>
      </div>

      {error && <div className="bg-red-100 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}
      {success && <div className="bg-green-100 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">{success}</div>}

      {/* Balance Cards */}
      {balance && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl shadow-sm border">
            <p className="text-xs text-gray-500">Outstanding Rent</p>
            <p className={`text-xl font-bold mt-1 ${balance.outstanding_rent > 0 ? 'text-red-600' : 'text-green-600'}`}>
              KShs {balance.outstanding_rent?.toLocaleString()}
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border">
            <p className="text-xs text-gray-500">Utilities (3 months)</p>
            <p className="text-xl font-bold mt-1">KShs {balance.utility_balance?.toLocaleString()}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border">
            <p className="text-xs text-gray-500">Arrears</p>
            <p className={`text-xl font-bold mt-1 ${balance.arrears?.amount > 0 ? 'text-orange-600' : 'text-gray-800'}`}>
              KShs {balance.arrears?.amount?.toLocaleString() || 0}
            </p>
            {balance.arrears?.months_outstanding > 0 && (
              <p className="text-xs text-orange-500">{balance.arrears.months_outstanding} month(s) overdue</p>
            )}
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border">
            <p className="text-xs text-gray-500">Total Due</p>
            <p className="text-xl font-bold text-blue-700 mt-1">KShs {balance.total_balance?.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Pay button */}
      <div className="mb-4">
        <button onClick={() => setShowPay(true)} className="bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700 font-medium text-sm">
          + Record Payment
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg w-fit">
        {[['bills','Rent Bills'],['history','Payment History']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${tab === key ? 'bg-white shadow text-blue-700' : 'text-gray-600'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Bills */}
      {tab === 'bills' && (
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-5 border-b"><h2 className="font-bold text-gray-800">My Rent Bills</h2></div>
          {loading ? <p className="text-center py-10 text-gray-500">Loading...</p> : bills.length === 0 ? (
            <p className="text-center py-10 text-gray-400">No bills found.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500 text-xs uppercase bg-gray-50">
                  <th className="px-5 py-3">Period</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Due Date</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {bills.map(b => (
                  <tr key={b.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-5 py-4 font-medium">{MONTHS[b.month - 1]} {b.year}</td>
                    <td className="px-5 py-4">KShs {b.amount?.toLocaleString()}</td>
                    <td className="px-5 py-4 text-gray-600">{new Date(b.due_date).toLocaleDateString()}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${b.is_paid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {b.is_paid ? 'Paid' : 'Unpaid'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* History */}
      {tab === 'history' && (
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-5 border-b"><h2 className="font-bold text-gray-800">Payment History</h2></div>
          {loading ? <p className="text-center py-10 text-gray-500">Loading...</p> : history.length === 0 ? (
            <p className="text-center py-10 text-gray-400">No payments recorded yet.</p>
          ) : (
            <div className="divide-y">
              {history.map((p, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <span className="text-green-600 text-sm font-bold">P</span>
                    </div>
                    <div>
                      <p className="font-medium text-sm capitalize">{p.payment_method || 'Payment'}</p>
                      <p className="text-xs text-gray-400">{p.payment_date ? new Date(p.payment_date).toLocaleString() : '—'}</p>
                      {p.reference_number && <p className="text-xs text-gray-500 font-mono">Ref: {p.reference_number}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-700">KShs {p.amount?.toLocaleString()}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${p.is_verified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {p.is_verified ? 'Verified' : 'Pending'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Make Payment Modal */}
      {showPay && (
        <Modal title="Record Payment" onClose={() => setShowPay(false)}>
          <form onSubmit={handlePay} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">For Bill (optional)</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={payForm.rent_bill_id} onChange={e => setPayForm(f => ({ ...f, rent_bill_id: e.target.value }))}>
                <option value="">General payment</option>
                {unpaidBills.map(b => <option key={b.id} value={b.id}>{MONTHS[b.month - 1]} {b.year} — KShs {b.amount?.toLocaleString()}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (KShs) *</label>
              <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} required min="1" step="0.01" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method *</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={payForm.payment_method} onChange={e => setPayForm(f => ({ ...f, payment_method: e.target.value }))}>
                <option value="mpesa">M-Pesa</option>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reference / Transaction No.</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm font-mono" value={payForm.reference_number} onChange={e => setPayForm(f => ({ ...f, reference_number: e.target.value }))} placeholder="e.g. QA12B3C4DE" />
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setShowPay(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                {saving ? 'Saving...' : 'Record Payment'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

// ─── ROLE ROUTER ───────────────────────────────────────────────────────────────
export default function PaymentsPage() {
  const { user } = useAuthStore()
  return user?.role === 'landlord' ? <LandlordPayments /> : <TenantPayments />
}

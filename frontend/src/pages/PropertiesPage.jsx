import React, { useState, useEffect } from 'react'
import { landlordAPI } from '../services/api'

const emptyProperty = { name: '', address: '', city: '', state: '', zip_code: '', total_units: '', description: '' }
const emptyUnit = { unit_number: '', bedrooms: '', bathrooms: '', square_feet: '', monthly_rent: '' }

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        <div className="flex justify-between items-center p-5 border-b">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

function PropertyForm({ data, onChange, onSubmit, onCancel, loading }) {
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Property Name</label>
          <input className="w-full border rounded-lg px-3 py-2 text-sm" value={data.name} onChange={e => onChange('name', e.target.value)} required />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <input className="w-full border rounded-lg px-3 py-2 text-sm" value={data.address} onChange={e => onChange('address', e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
          <input className="w-full border rounded-lg px-3 py-2 text-sm" value={data.city} onChange={e => onChange('city', e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
          <input className="w-full border rounded-lg px-3 py-2 text-sm" value={data.state} onChange={e => onChange('state', e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
          <input className="w-full border rounded-lg px-3 py-2 text-sm" value={data.zip_code} onChange={e => onChange('zip_code', e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Total Units</label>
          <input type="number" min="1" className="w-full border rounded-lg px-3 py-2 text-sm" value={data.total_units} onChange={e => onChange('total_units', e.target.value)} required />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" value={data.description} onChange={e => onChange('description', e.target.value)} />
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancel</button>
        <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {loading ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  )
}

function UnitForm({ data, onChange, onSubmit, onCancel, loading }) {
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Unit Number</label>
          <input className="w-full border rounded-lg px-3 py-2 text-sm" value={data.unit_number} onChange={e => onChange('unit_number', e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Rent (KShs)</label>
          <input type="number" min="0" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm" value={data.monthly_rent} onChange={e => onChange('monthly_rent', e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bedrooms</label>
          <input type="number" min="0" className="w-full border rounded-lg px-3 py-2 text-sm" value={data.bedrooms} onChange={e => onChange('bedrooms', e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bathrooms</label>
          <input type="number" min="0" step="0.5" className="w-full border rounded-lg px-3 py-2 text-sm" value={data.bathrooms} onChange={e => onChange('bathrooms', e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Square Feet</label>
          <input type="number" min="0" className="w-full border rounded-lg px-3 py-2 text-sm" value={data.square_feet} onChange={e => onChange('square_feet', e.target.value)} />
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancel</button>
        <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {loading ? 'Saving...' : 'Save Unit'}
        </button>
      </div>
    </form>
  )
}

const emptyBulk = { prefix: 'House ', start: '1', count: '', monthly_rent: '', bedrooms: '1', bathrooms: '1' }

export default function PropertiesPage() {
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [bulkProgress, setBulkProgress] = useState(null)
  const [error, setError] = useState('')
  const [showAddProperty, setShowAddProperty] = useState(false)
  const [editProperty, setEditProperty] = useState(null)
  const [deleteProperty, setDeleteProperty] = useState(null)
  const [viewProperty, setViewProperty] = useState(null)
  const [units, setUnits] = useState([])
  const [loadingUnits, setLoadingUnits] = useState(false)
  const [showAddUnit, setShowAddUnit] = useState(false)
  const [showBulk, setShowBulk] = useState(false)
  const [bulkForm, setBulkForm] = useState(emptyBulk)
  const [editUnit, setEditUnit] = useState(null)
  const [deleteUnit, setDeleteUnit] = useState(null)
  const [propertyForm, setPropertyForm] = useState(emptyProperty)
  const [unitForm, setUnitForm] = useState(emptyUnit)

  useEffect(() => { fetchProperties() }, [])

  const fetchProperties = async () => {
    try {
      setLoading(true)
      const res = await landlordAPI.getProperties()
      setProperties(res.data)
    } catch {
      setError('Failed to load properties')
    } finally { setLoading(false) }
  }

  const fetchUnits = async (propertyId) => {
    setLoadingUnits(true)
    try {
      const res = await landlordAPI.getUnits(propertyId)
      setUnits(res.data)
    } catch { setUnits([]) }
    finally { setLoadingUnits(false) }
  }

  const openView = (prop) => { setViewProperty(prop); fetchUnits(prop.id) }

  const handleAddProperty = async (e) => {
    e.preventDefault(); setSaving(true); setError('')
    try {
      await landlordAPI.createProperty({ ...propertyForm, total_units: parseInt(propertyForm.total_units) })
      setShowAddProperty(false); setPropertyForm(emptyProperty); fetchProperties()
    } catch (err) { setError(err.response?.data?.detail || 'Failed to create property') }
    finally { setSaving(false) }
  }

  const handleEditProperty = async (e) => {
    e.preventDefault(); setSaving(true); setError('')
    try {
      await landlordAPI.updateProperty(editProperty.id, { ...propertyForm, total_units: parseInt(propertyForm.total_units) })
      setEditProperty(null); fetchProperties()
    } catch (err) { setError(err.response?.data?.detail || 'Failed to update property') }
    finally { setSaving(false) }
  }

  const handleDeleteProperty = async () => {
    setSaving(true)
    try {
      await landlordAPI.deleteProperty(deleteProperty.id)
      setDeleteProperty(null); fetchProperties()
    } catch (err) { setError(err.response?.data?.detail || 'Failed to delete property') }
    finally { setSaving(false) }
  }

  const handleAddUnit = async (e) => {
    e.preventDefault(); setSaving(true); setError('')
    try {
      await landlordAPI.createUnit({ ...unitForm, property_id: viewProperty.id, bedrooms: parseInt(unitForm.bedrooms), bathrooms: parseFloat(unitForm.bathrooms), monthly_rent: parseFloat(unitForm.monthly_rent), square_feet: unitForm.square_feet ? parseInt(unitForm.square_feet) : null })
      setShowAddUnit(false); setUnitForm(emptyUnit); fetchUnits(viewProperty.id)
    } catch (err) { setError(err.response?.data?.detail || 'Failed to add unit') }
    finally { setSaving(false) }
  }

  const handleEditUnit = async (e) => {
    e.preventDefault(); setSaving(true); setError('')
    try {
      await landlordAPI.updateUnit(editUnit.id, { ...unitForm, property_id: viewProperty.id, bedrooms: parseInt(unitForm.bedrooms), bathrooms: parseFloat(unitForm.bathrooms), monthly_rent: parseFloat(unitForm.monthly_rent), square_feet: unitForm.square_feet ? parseInt(unitForm.square_feet) : null })
      setEditUnit(null); fetchUnits(viewProperty.id)
    } catch (err) { setError(err.response?.data?.detail || 'Failed to update unit') }
    finally { setSaving(false) }
  }

  const handleDeleteUnit = async () => {
    setSaving(true)
    try {
      await landlordAPI.deleteUnit(deleteUnit.id)
      setDeleteUnit(null); fetchUnits(viewProperty.id)
    } catch (err) { setError(err.response?.data?.detail || 'Failed to delete unit') }
    finally { setSaving(false) }
  }

  const handleBulkGenerate = async (e) => {
    e.preventDefault()
    const start = parseInt(bulkForm.start)
    const count = parseInt(bulkForm.count)
    const rent = parseFloat(bulkForm.monthly_rent)
    const beds = parseInt(bulkForm.bedrooms)
    const baths = parseFloat(bulkForm.bathrooms)
    if (!count || count < 1 || count > 200) { setError('Count must be between 1 and 200'); return }

    setSaving(true); setError('')
    let created = 0
    for (let i = 0; i < count; i++) {
      const num = start + i
      setBulkProgress(`Creating ${bulkForm.prefix}${num} (${i + 1}/${count})...`)
      try {
        await landlordAPI.createUnit({
          unit_number: `${bulkForm.prefix}${num}`,
          property_id: viewProperty.id,
          monthly_rent: rent,
          bedrooms: beds,
          bathrooms: baths,
          square_feet: null,
        })
        created++
      } catch { /* skip duplicates */ }
    }
    setBulkProgress(null)
    setSaving(false)
    setShowBulk(false)
    setBulkForm(emptyBulk)
    fetchUnits(viewProperty.id)
    setError(created < count ? `Created ${created}/${count} units (some may already exist)` : '')
  }

  const setPropField = (k, v) => setPropertyForm(f => ({ ...f, [k]: v }))
  const setUnitField = (k, v) => setUnitForm(f => ({ ...f, [k]: v }))
  const setBulkField = (k, v) => setBulkForm(f => ({ ...f, [k]: v }))

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Properties</h1>
          <p className="text-gray-500 text-sm mt-1">{properties.length} propert{properties.length === 1 ? 'y' : 'ies'}</p>
        </div>
        <button onClick={() => { setPropertyForm(emptyProperty); setShowAddProperty(true) }} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">+ Add Property</button>
      </div>

      {error && <div className="bg-red-100 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

      {loading ? (
        <div className="text-center py-16 text-gray-500">Loading properties...</div>
      ) : properties.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm">
          <p className="text-4xl mb-3">🏢</p>
          <p className="text-gray-500">No properties yet. Add your first property.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {properties.map(prop => (
            <div key={prop.id} className="bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow">
              <div className="p-5">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-gray-800 text-lg">{prop.name}</h3>
                  <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">{prop.total_units} units</span>
                </div>
                <p className="text-gray-500 text-sm">{prop.address}</p>
                <p className="text-gray-500 text-sm">{prop.city}, {prop.state} {prop.zip_code}</p>
                {prop.description && <p className="text-gray-400 text-xs mt-2 line-clamp-2">{prop.description}</p>}
              </div>
              <div className="border-t px-5 py-3 flex gap-2">
                <button onClick={() => openView(prop)} className="flex-1 text-sm text-blue-600 hover:text-blue-800 font-medium">View Units</button>
                <button onClick={() => { setPropertyForm({ ...prop, total_units: String(prop.total_units), description: prop.description || '' }); setEditProperty(prop) }} className="flex-1 text-sm text-green-600 hover:text-green-800 font-medium">Edit</button>
                <button onClick={() => setDeleteProperty(prop)} className="flex-1 text-sm text-red-600 hover:text-red-800 font-medium">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddProperty && <Modal title="Add Property" onClose={() => setShowAddProperty(false)}><PropertyForm data={propertyForm} onChange={setPropField} onSubmit={handleAddProperty} onCancel={() => setShowAddProperty(false)} loading={saving} /></Modal>}
      {editProperty && <Modal title="Edit Property" onClose={() => setEditProperty(null)}><PropertyForm data={propertyForm} onChange={setPropField} onSubmit={handleEditProperty} onCancel={() => setEditProperty(null)} loading={saving} /></Modal>}

      {deleteProperty && (
        <Modal title="Delete Property" onClose={() => setDeleteProperty(null)}>
          <p className="text-gray-600 mb-5">Delete <strong>{deleteProperty.name}</strong>? This will also delete all its units.</p>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setDeleteProperty(null)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={handleDeleteProperty} disabled={saving} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">{saving ? 'Deleting...' : 'Delete'}</button>
          </div>
        </Modal>
      )}

      {viewProperty && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center p-5 border-b">
              <div>
                <h2 className="text-lg font-bold">{viewProperty.name} — Units</h2>
                <p className="text-sm text-gray-500">{viewProperty.address}, {viewProperty.city}</p>
              </div>
              <button onClick={() => setViewProperty(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-5 overflow-y-auto flex-1">
              <div className="flex justify-end gap-2 mb-4">
                <button onClick={() => { setBulkForm(emptyBulk); setShowBulk(true) }}
                  className="border border-blue-300 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-50 text-sm font-medium">
                  Bulk Generate
                </button>
                <button onClick={() => { setUnitForm(emptyUnit); setShowAddUnit(true) }}
                  className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 text-sm">
                  + Add Unit
                </button>
              </div>
              {bulkProgress && (
                <div className="mb-3 bg-blue-50 text-blue-700 text-sm px-3 py-2 rounded-lg">{bulkProgress}</div>
              )}
              {loadingUnits ? <p className="text-center text-gray-500 py-8">Loading units...</p>
                : units.length === 0 ? <p className="text-center text-gray-400 py-8">No units added yet.</p>
                : (
                  <table className="w-full text-sm">
                    <thead><tr className="border-b text-left text-gray-500 text-xs uppercase"><th className="pb-2">Unit</th><th className="pb-2">Beds/Baths</th><th className="pb-2">Rent</th><th className="pb-2">Status</th><th className="pb-2"></th></tr></thead>
                    <tbody>
                      {units.map(unit => (
                        <tr key={unit.id} className="border-b last:border-0">
                          <td className="py-3 font-medium">{unit.unit_number}</td>
                          <td className="py-3 text-gray-600">{unit.bedrooms}bd / {unit.bathrooms}ba</td>
                          <td className="py-3 font-semibold">KShs {unit.monthly_rent.toLocaleString()}</td>
                          <td className="py-3"><span className={`px-2 py-0.5 rounded-full text-xs ${unit.is_occupied ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{unit.is_occupied ? 'Occupied' : 'Vacant'}</span></td>
                          <td className="py-3">
                            <div className="flex gap-3 justify-end">
                              <button onClick={() => { setUnitForm({ unit_number: unit.unit_number, bedrooms: String(unit.bedrooms), bathrooms: String(unit.bathrooms), square_feet: String(unit.square_feet || ''), monthly_rent: String(unit.monthly_rent) }); setEditUnit(unit) }} className="text-green-600 hover:text-green-800 text-xs">Edit</button>
                              <button onClick={() => setDeleteUnit(unit)} className="text-red-600 hover:text-red-800 text-xs">Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
            </div>
          </div>
        </div>
      )}

      {showAddUnit && <Modal title="Add Unit" onClose={() => setShowAddUnit(false)}><UnitForm data={unitForm} onChange={setUnitField} onSubmit={handleAddUnit} onCancel={() => setShowAddUnit(false)} loading={saving} /></Modal>}

      {showBulk && (
        <Modal title="Bulk Generate Units" onClose={() => setShowBulk(false)}>
          <form onSubmit={handleBulkGenerate} className="space-y-4">
            <p className="text-sm text-gray-500">
              Automatically creates multiple units with sequential numbers (e.g. House 1, House 2 … House 40).
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit Name Prefix</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm" value={bulkForm.prefix}
                  onChange={e => setBulkField('prefix', e.target.value)}
                  placeholder="e.g. House , Unit , Apt " />
                <p className="text-xs text-gray-400 mt-1">
                  Preview: <strong>{bulkForm.prefix || ''}1</strong>, <strong>{bulkForm.prefix || ''}2</strong>, <strong>{bulkForm.prefix || ''}3</strong>…
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Starting Number</label>
                <input type="number" min="1" className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={bulkForm.start} onChange={e => setBulkField('start', e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Number of Units *</label>
                <input type="number" min="1" max="200" className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={bulkForm.count} onChange={e => setBulkField('count', e.target.value)}
                  placeholder="e.g. 40" required />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Rent (KShs) *</label>
                <input type="number" min="0" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={bulkForm.monthly_rent} onChange={e => setBulkField('monthly_rent', e.target.value)}
                  placeholder="Same rent for all units" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bedrooms</label>
                <input type="number" min="0" className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={bulkForm.bedrooms} onChange={e => setBulkField('bedrooms', e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bathrooms</label>
                <input type="number" min="0" step="0.5" className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={bulkForm.bathrooms} onChange={e => setBulkField('bathrooms', e.target.value)} required />
              </div>
            </div>
            {bulkForm.count && (
              <div className="bg-blue-50 text-blue-800 text-sm px-3 py-2 rounded-lg">
                Will create <strong>{bulkForm.count}</strong> units: <strong>{bulkForm.prefix}{bulkForm.start}</strong> to <strong>{bulkForm.prefix}{parseInt(bulkForm.start || 1) + parseInt(bulkForm.count || 0) - 1}</strong>
              </div>
            )}
            <div className="flex gap-2 justify-end pt-1">
              <button type="button" onClick={() => setShowBulk(false)}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? bulkProgress || 'Creating...' : `Generate ${bulkForm.count || ''} Units`}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {editUnit && <Modal title="Edit Unit" onClose={() => setEditUnit(null)}><UnitForm data={unitForm} onChange={setUnitField} onSubmit={handleEditUnit} onCancel={() => setEditUnit(null)} loading={saving} /></Modal>}

      {deleteUnit && (
        <Modal title="Delete Unit" onClose={() => setDeleteUnit(null)}>
          <p className="text-gray-600 mb-5">Delete unit <strong>{deleteUnit.unit_number}</strong>?</p>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setDeleteUnit(null)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={handleDeleteUnit} disabled={saving} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">{saving ? 'Deleting...' : 'Delete'}</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

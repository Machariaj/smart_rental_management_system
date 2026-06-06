import { useState, useEffect } from 'react'
import { landlordAPI, mlAPI } from '../services/api'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function ReportsPage() {
  const [properties, setProperties] = useState([])
  const [selectedProp, setSelectedProp] = useState('')
  const [financial, setFinancial] = useState(null)
  const [forecast, setForecast] = useState(null)
  const [utilityAlerts, setUtilityAlerts] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    landlordAPI.getProperties().then(r => setProperties(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedProp) {
      setFinancial(null); setForecast(null); setUtilityAlerts(null); return
    }
    setLoading(true); setError('')
    Promise.all([
      landlordAPI.getFinancialReport(selectedProp),
      mlAPI.predictIncome(selectedProp, 6),
      mlAPI.getUtilityAlerts(selectedProp),
    ])
      .then(([fRes, incRes, uRes]) => {
        setFinancial(fRes.data)
        setForecast(incRes.data)
        setUtilityAlerts(uRes.data)
      })
      .catch(() => setError('Failed to load reports'))
      .finally(() => setLoading(false))
  }, [selectedProp])

  const collectionPct = financial?.collection_rate?.toFixed(1) || 0

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Reports & Analytics</h1>
        <p className="text-gray-500 text-sm mt-1">Financial summaries and ML-powered insights</p>
      </div>

      {/* Property Selector */}
      <div className="bg-white rounded-xl shadow-sm border p-4 mb-6 flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Select Property:</label>
        <select className="border rounded-lg px-3 py-2 text-sm flex-1 max-w-xs"
          value={selectedProp} onChange={e => setSelectedProp(e.target.value)}>
          <option value="">-- Choose a property --</option>
          {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {error && <div className="bg-red-100 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

      {!selectedProp && (
        <div className="text-center py-16 bg-white rounded-xl border">
          <p className="text-gray-400 text-lg">Select a property to view its reports</p>
        </div>
      )}

      {loading && (
        <p className="text-center text-gray-500 py-10">Loading reports...</p>
      )}

      {selectedProp && !loading && financial && (
        <>
          {/* Financial Summary */}
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-3">Financial Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-xl shadow-sm border">
                <p className="text-xs text-gray-500">Total Billed</p>
                <p className="text-2xl font-bold mt-1">KShs {financial.total_rent_billed?.toLocaleString()}</p>
              </div>
              <div className="bg-white p-5 rounded-xl shadow-sm border">
                <p className="text-xs text-gray-500">Total Collected</p>
                <p className="text-2xl font-bold text-green-600 mt-1">KShs {financial.total_rent_paid?.toLocaleString()}</p>
              </div>
              <div className="bg-white p-5 rounded-xl shadow-sm border">
                <p className="text-xs text-gray-500">Outstanding</p>
                <p className={`text-2xl font-bold mt-1 ${financial.total_pending > 0 ? 'text-red-600' : 'text-gray-800'}`}>
                  KShs {financial.total_pending?.toLocaleString()}
                </p>
              </div>
              <div className="bg-white p-5 rounded-xl shadow-sm border">
                <p className="text-xs text-gray-500">Collection Rate</p>
                <p className={`text-2xl font-bold mt-1 ${parseFloat(collectionPct) >= 80 ? 'text-green-600' : parseFloat(collectionPct) >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {collectionPct}%
                </p>
                <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${collectionPct}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Occupancy & Forecast */}
          {forecast && (
            <div className="bg-white rounded-xl shadow-sm border p-5 mb-6">
              <h2 className="text-lg font-bold text-gray-800 mb-1">Occupancy & Income Forecast</h2>
              <p className="text-xs text-gray-400 mb-5">How many houses are rented and what income to expect in the coming months</p>

              {/* Occupancy cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-blue-600">{forecast.occupancy_rate}%</p>
                  <p className="text-xs text-gray-500 mt-1 font-medium">Occupancy Rate</p>
                  <p className="text-xs text-gray-400 mt-0.5">{forecast.occupied_units} of {forecast.total_units} houses rented</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-gray-700">{forecast.total_units}</p>
                  <p className="text-xs text-gray-500 mt-1 font-medium">Total Houses</p>
                  <p className="text-xs text-gray-400 mt-0.5">In this property</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">KShs {forecast.monthly_actual?.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-1 font-medium">Avg Monthly Collected</p>
                  <p className="text-xs text-gray-400 mt-0.5">Based on past payments</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-purple-600">KShs {forecast.monthly_potential?.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-1 font-medium">Full Potential</p>
                  <p className="text-xs text-gray-400 mt-0.5">If all houses were paid</p>
                </div>
              </div>

              {/* Income Chart: history + forecast */}
              {forecast.forecast?.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-gray-700">Rent Income: Last 6 Months (Actual) + Next {forecast.forecast.length} Months (Predicted)</p>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">Predicted avg: KShs {forecast.average_forecast?.toLocaleString()}/mo</span>
                  </div>
                  <p className="text-xs text-gray-400 mb-4">Grey bars = what was actually collected. Blue bars = predicted based on that history.</p>

                  {(() => {
                    const now = new Date()
                    const historical = forecast.historical_monthly || []
                    const histBars = historical.map((val, i) => {
                      const mIdx = ((now.getMonth() - 5 + i) + 12) % 12
                      return { val, label: MONTHS[mIdx], type: 'actual' }
                    })
                    const forecastBars = forecast.forecast.map((val, i) => {
                      const mIdx = (now.getMonth() + i + 1) % 12
                      return { val, label: MONTHS[mIdx], type: 'forecast' }
                    })
                    const allBars = [...histBars, ...forecastBars]
                    const maxVal = Math.max(...allBars.map(b => b.val), 1)
                    return (
                      <div className="flex items-end gap-2 h-40 bg-gray-50 rounded-xl px-4 pb-3 pt-4">
                        {allBars.map((bar, i) => {
                          const heightPct = Math.max(4, Math.round((bar.val / maxVal) * 100))
                          const isActual = bar.type === 'actual'
                          return (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1">
                              <span className="text-xs text-gray-500">{bar.val > 0 ? `${(bar.val/1000).toFixed(0)}k` : '—'}</span>
                              <div
                                className={`w-full rounded-t-md transition-all ${isActual ? 'bg-gray-400' : 'bg-blue-500'}`}
                                style={{ height: `${heightPct}%` }}
                              />
                              <span className={`text-xs font-medium ${isActual ? 'text-gray-400' : 'text-blue-500'}`}>{bar.label}</span>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()}

                  <div className="flex gap-4 mt-2 justify-center">
                    <span className="flex items-center gap-1 text-xs text-gray-500"><span className="inline-block w-3 h-3 rounded-sm bg-gray-400" /> Actual collected</span>
                    <span className="flex items-center gap-1 text-xs text-gray-500"><span className="inline-block w-3 h-3 rounded-sm bg-blue-500" /> Predicted</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2 text-center">
                    Predictions are based on your actual payment history — no guesswork.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Utility Anomalies */}
          {utilityAlerts && (
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-800">Utility Anomalies</h2>
                {utilityAlerts.anomaly_count > 0 && (
                  <span className="bg-red-100 text-red-700 text-xs font-medium px-2.5 py-1 rounded-full">
                    {utilityAlerts.anomaly_count} alert{utilityAlerts.anomaly_count > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {utilityAlerts.anomaly_count === 0 ? (
                <div className="text-center py-6">
                  <p className="text-green-600 font-medium">No anomalies detected</p>
                  <p className="text-gray-400 text-sm mt-1">All utility usage looks normal</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {utilityAlerts.anomalies.map((a, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                      <div>
                        <p className="font-medium text-sm text-red-800">
                          House {a.unit} — {a.utility_type}
                        </p>
                        <p className="text-xs text-red-600 mt-0.5">{a.reason}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{MONTHS[a.month - 1]} {a.year}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-700">KShs {a.amount?.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">Usage: {a.usage}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

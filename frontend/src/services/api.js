import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auth endpoints
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (email, password) => api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout')
}

// Landlord endpoints
export const landlordAPI = {
  getProperties: () => api.get('/landlord/properties'),
  createProperty: (data) => api.post('/landlord/properties', data),
  updateProperty: (id, data) => api.put(`/landlord/properties/${id}`, data),
  deleteProperty: (id) => api.delete(`/landlord/properties/${id}`),
  getProperty: (id) => api.get(`/landlord/properties/${id}`),
  getUnits: (propertyId) => api.get(`/landlord/properties/${propertyId}/units`),
  createUnit: (data) => api.post('/landlord/units', data),
  updateUnit: (id, data) => api.put(`/landlord/units/${id}`, data),
  deleteUnit: (id) => api.delete(`/landlord/units/${id}`),
  getFinancialReport: (propertyId) => api.get('/landlord/reports/financial', { params: { property_id: propertyId } }),
  getUtilityAlerts: (propertyId) => api.get('/landlord/alerts/utility', { params: { property_id: propertyId } }),
  getArrearsAlerts: (propertyId) => api.get('/landlord/alerts/arrears', { params: { property_id: propertyId } }),
  getMaintenanceRequests: (propertyId) => api.get('/landlord/maintenance-requests', { params: { property_id: propertyId } }),
  approveMaintenanceRequest: (requestId) => api.patch(`/landlord/maintenance-requests/${requestId}/approve`)
}

// Admin endpoints
export const adminAPI = {
  getLandlords: () => api.get('/admin/landlords'),
  createLandlord: (data) => api.post('/admin/landlords', data),
  deactivateLandlord: (id) => api.patch(`/admin/landlords/${id}/deactivate`),
  activateLandlord: (id) => api.patch(`/admin/landlords/${id}/activate`),
  getStats: () => api.get('/admin/stats'),
  getTenants: () => api.get('/admin/tenants'),
}

// ML endpoints
export const mlAPI = {
  predictRisk: (tenantId) => api.get(`/ml/predict/risk/${tenantId}`),
  predictIncome: (propertyId, months = 3) => api.get(`/ml/predict/income/${propertyId}`, { params: { months_ahead: months } }),
  getUtilityAlerts: (propertyId) => api.get(`/ml/alerts/utility/${propertyId}`),
}

// Extended landlord endpoints
export const landlordExtAPI = {
  getTenants: () => api.get('/landlord/tenants'),
  createTenant: (data) => api.post('/landlord/tenants', data),
  removeTenant: (id) => api.delete(`/landlord/tenants/${id}`),
  getRentBills: (propertyId) => api.get('/landlord/rent-bills', { params: { property_id: propertyId } }),
  createRentBill: (data) => api.post('/landlord/rent-bills', data),
  getPayments: (propertyId) => api.get('/landlord/payments', { params: { property_id: propertyId } }),
  recordPayment: (data) => api.post('/landlord/payments', data),
  verifyPayment: (id) => api.patch(`/landlord/payments/${id}/verify`),
  getUtilityBills: (propertyId) => api.get('/landlord/utility-bills', { params: { property_id: propertyId } }),
  createUtilityBill: (data) => api.post('/landlord/utility-bills', data),
  deleteUtilityBill: (id) => api.delete(`/landlord/utility-bills/${id}`),
  seedTestData: (propertyId) => api.post(`/landlord/seed-test-data/${propertyId}`),
}

// Tenant endpoints
export const tenantAPI = {
  getBalance: () => api.get('/tenant/balance'),
  getBills: () => api.get('/tenant/bills'),
  makePayment: (data) => api.post('/tenant/payment', data),
  getPaymentHistory: () => api.get('/tenant/payment-history'),
  getUtilities: () => api.get('/tenant/utilities'),
  submitMaintenance: (data) => api.post('/tenant/maintenance', data),
  getMaintenanceRequests: () => api.get('/tenant/maintenance'),
  getNotifications: () => api.get('/tenant/notifications')
}

// Chat endpoints (tenant chatbot)
export const chatAPI = {
  startSession: () => api.post('/tenant/chat/session'),
  sendMessage: (sessionId, message) => api.post(`/tenant/chat/${sessionId}/message`, { message_text: message }),
}

export default api

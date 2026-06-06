import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import LandlordDashboard from './pages/LandlordDashboard'
import TenantDashboard from './pages/TenantDashboard'
import PropertiesPage from './pages/PropertiesPage'
import TenantsPage from './pages/TenantsPage'
import PaymentsPage from './pages/PaymentsPage'
import MaintenancePage from './pages/MaintenancePage'
import ReportsPage from './pages/ReportsPage'
import AdminDashboard from './pages/AdminDashboard'

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/landlord" element={<LandlordDashboard />} />
          <Route path="/landlord/properties" element={<PropertiesPage />} />
          <Route path="/landlord/tenants" element={<TenantsPage />} />
          <Route path="/landlord/payments" element={<PaymentsPage />} />
          <Route path="/landlord/maintenance" element={<MaintenancePage />} />
          <Route path="/landlord/reports" element={<ReportsPage />} />
          <Route path="/tenant" element={<TenantDashboard />} />
          <Route path="/tenant/payments" element={<PaymentsPage />} />
          <Route path="/tenant/maintenance" element={<MaintenancePage />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/landlords" element={<AdminDashboard />} />
          <Route path="/admin/tenants" element={<AdminDashboard />} />
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App

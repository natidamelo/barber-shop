import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import { ReactQueryDevtools } from 'react-query/devtools'
import { Toaster } from 'react-hot-toast'

// Layout components
import Layout from './components/Layout/Layout'
import PublicLayout from './components/Layout/PublicLayout'

// Pages
import HomePage from './pages/HomePage'
import LoginPage from './pages/Auth/LoginPage'
import RegisterPage from './pages/Auth/RegisterPage'
import DashboardPage from './pages/Dashboard/DashboardPage'
import AppointmentsPage from './pages/Appointments/AppointmentsPage'
import BookingPage from './pages/Booking/BookingPage'
import ServicesPage from './pages/Services/ServicesPage'
import ProfilePage from './pages/Profile/ProfilePage'
import SchedulePage from './pages/Schedule/SchedulePage'
import ReviewsPage from './pages/Reviews/ReviewsPage'
import NotFoundPage from './pages/NotFoundPage'

// Admin pages
import AdminDashboard from './pages/Admin/AdminDashboard'
import UserManagement from './pages/Admin/UserManagement'
import CustomersPage from './pages/Admin/CustomersPage'
import BillingPage from './pages/Admin/BillingPage'
import ServiceManagement from './pages/Admin/ServiceManagement'
import InventoryManagement from './pages/Admin/InventoryManagement'
import ReportsPage from './pages/Admin/ReportsPage'
import SettingsPage from './pages/Admin/SettingsPage'
import LicensesPage from './pages/Admin/LicensesPage'
import LicenseAdminDashboard from './pages/Admin/LicenseAdminDashboard'

// License activation page
import LicenseActivationPage from './pages/Auth/LicenseActivationPage'

// Protected route wrapper
import ProtectedRoute from './components/Auth/ProtectedRoute'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <div className="App">
          <Routes>
            {/* License activation - standalone page */}
            <Route path="/activate" element={<LicenseActivationPage />} />

            {/* Public routes */}
            <Route path="/" element={<PublicLayout />}>
              <Route index element={<HomePage />} />
              <Route path="login" element={<LoginPage />} />
              <Route path="register" element={<RegisterPage />} />
              <Route path="services" element={<ServicesPage />} />
              <Route path="booking" element={<BookingPage />} />
            </Route>

            {/* Protected routes */}
            <Route path="/dashboard" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<DashboardPage />} />
              <Route path="appointments" element={<AppointmentsPage />} />
              <Route path="schedule" element={<ProtectedRoute roles={['barber', 'admin', 'superadmin']}><SchedulePage /></ProtectedRoute>} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="reviews" element={<ReviewsPage />} />
              
              {/* Customer Management */}
              <Route path="customers" element={<ProtectedRoute roles={['admin', 'superadmin', 'receptionist']}><CustomersPage /></ProtectedRoute>} />
              
              {/* Billing */}
              <Route path="billing" element={<ProtectedRoute roles={['admin', 'superadmin', 'receptionist']}><BillingPage /></ProtectedRoute>} />
              
              {/* Admin routes */}
              <Route path="admin" element={<ProtectedRoute roles={['admin', 'superadmin']}><AdminDashboard /></ProtectedRoute>} />
              <Route path="admin/users" element={<ProtectedRoute roles={['admin', 'superadmin', 'receptionist']}><UserManagement /></ProtectedRoute>} />
              <Route path="admin/services" element={<ProtectedRoute roles={['admin', 'superadmin', 'barber', 'receptionist']}><ServiceManagement /></ProtectedRoute>} />
              <Route path="admin/inventory" element={<ProtectedRoute roles={['admin', 'superadmin', 'barber']}><InventoryManagement /></ProtectedRoute>} />
              <Route path="admin/reports" element={<ProtectedRoute roles={['admin', 'superadmin']}><ReportsPage /></ProtectedRoute>} />
              <Route path="admin/settings" element={<ProtectedRoute roles={['admin', 'superadmin']}><SettingsPage /></ProtectedRoute>} />
              <Route path="admin/licenses" element={<ProtectedRoute roles={['superadmin']}><LicensesPage /></ProtectedRoute>} />
              <Route path="admin/license-dashboard" element={<ProtectedRoute roles={['superadmin']}><LicenseAdminDashboard /></ProtectedRoute>} />
            </Route>

            {/* 404 page */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>

          {/* Toast notifications */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                style: {
                  background: '#10b981',
                },
              },
              error: {
                duration: 5000,
                style: {
                  background: '#ef4444',
                },
              },
            }}
          />
        </div>
      </Router>
      
      {/* React Query DevTools */}
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}

export default App
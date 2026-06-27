import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import App                from './App'
import AuthPage           from './pages/AuthPage'
import UserDashboard      from './pages/UserDashboard'
import AdminDashboard     from './pages/AdminDashboard'
import HistoryPage        from './pages/HistoryPage'
import PricingPage        from './pages/PricingPage'
import AboutPage          from './pages/AboutPage'
import EmptyRoomDesigner  from './pages/EmptyRoomDesigner'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/"            element={<App />} />
          <Route path="/login"       element={<AuthPage />} />
          <Route path="/register"    element={<AuthPage />} />
          <Route path="/dashboard"   element={<UserDashboard />} />
          <Route path="/admin"       element={<AdminDashboard />} />
          <Route path="/history"     element={<HistoryPage />} />
          <Route path="/pricing"     element={<PricingPage />} />
          <Route path="/about"       element={<AboutPage />} />
          <Route path="/design-room" element={<EmptyRoomDesigner />} />
        </Routes>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#111111', color: '#FAFAF8',
              border: '1px solid #2A2A2A', borderRadius: 0,
              fontSize: 12, fontFamily: 'Inter,sans-serif',
              boxShadow: 'none',
            },
            success: { iconTheme: { primary: '#2F6F57', secondary: '#FAFAF8' } },
            error:   { iconTheme: { primary: '#B42318', secondary: '#FAFAF8' } },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
)

import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import Navbar from './Navbar.jsx'
import Login from './pages/Login.jsx'
import Overview from './pages/Overview.jsx'
import Members from './pages/Members.jsx'
import MemberDetail from './pages/MemberDetail.jsx'
import Cycles from './pages/Cycles.jsx'
import Flags from './pages/Flags.jsx'
import Settings from './pages/Settings.jsx'
import { getSession, onAuthStateChange, logout } from './authClient'
import { supabase } from './supabaseClient'
import { TenantProvider } from './context/TenantContext'

function App() {
  // undefined = checking, null = signed out, object = signed in
  const [session, setSession] = useState(undefined)
  const [tenant, setTenant] = useState(null)
  const [profile, setProfile] = useState(null)
  const [tenantError, setTenantError] = useState(null)
  const queryClient = useQueryClient()

  useEffect(() => {
    getSession()
      .then(setSession)
      .catch(() => setSession(null))

    const sub = onAuthStateChange((newSession) => {
      setSession(newSession)
      if (!newSession) {
        queryClient.clear()
        setTenant(null)
        setProfile(null)
        setTenantError(null)
      }
    })

    return () => sub.data.subscription.unsubscribe()
  }, [queryClient])

  useEffect(() => {
    if (!session) return

    supabase
      .from('tenants')
      .select('id, name, slug, currency')
      .single()
      .then(({ data, error }) => {
        if (error) setTenantError(error.message)
        else setTenant(data)
      })

    supabase
      .from('users')
      .select('full_name')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => setProfile(data ?? null))
  }, [session])

  async function handleLogout() {
    try {
      await logout()
    } catch {
      setSession(null)
      queryClient.clear()
    }
  }

  if (session === undefined || (session && !tenant && !tenantError)) {
    return (
      <div className="min-h-screen bg-[#F7F7F8] flex items-center justify-center">
        <p className="text-sm text-gray-400">Loading…</p>
      </div>
    )
  }

  if (!session) {
    return <Login onLogin={() => {}} />
  }

  if (tenantError) {
    return (
      <div className="min-h-screen bg-[#F7F7F8] flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-sm text-center">
          <p className="text-sm text-gray-700 mb-1">
            Your account isn't linked to an organisation.
          </p>
          <p className="text-xs text-gray-400 mb-4">{tenantError}</p>
          <button
            onClick={handleLogout}
            className="text-sm font-medium text-gray-800 underline"
          >
            Sign out
          </button>
        </div>
      </div>
    )
  }

  const userName = profile?.full_name ?? session.user?.email ?? 'Account'

  return (
    <TenantProvider tenant={tenant}>
      <BrowserRouter>
        <div className="min-h-screen bg-[#F7F7F8] flex flex-col">
          <Navbar userName={userName} onLogout={handleLogout} />
          <main className="max-w-7xl mx-auto px-6 py-8 w-full flex-1">
            <Routes>
              <Route path="/" element={<Navigate to="/overview" replace />} />
              <Route path="/overview" element={<Overview />} />
              <Route path="/members" element={<Members />} />
              <Route path="/members/:membershipId" element={<MemberDetail />} />
              <Route path="/cycles" element={<Cycles />} />
              <Route path="/flags" element={<Flags />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
          <footer className="border-t border-gray-200 bg-white py-4 sticky bottom-0">
            <p className="text-center text-xs text-gray-400">
              Owen — cooperative back-office
            </p>
          </footer>
        </div>
      </BrowserRouter>
    </TenantProvider>
  )
}

export default App

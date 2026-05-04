import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './Navbar.jsx'
import Overview from './pages/Overview.jsx'
import Members from './pages/Members.jsx'
import MemberDetail from './pages/MemberDetail.jsx'
import Cycles from './pages/Cycles.jsx'
import Flags from './pages/Flags.jsx'
import Settings from './pages/Settings.jsx'

const TENANT = {
  id: 'fb03c7b6-6d60-47aa-abd9-0d23fc765142',
  name: 'Demo Cooperative',
  slug: 'demo',
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#F7F7F8] flex flex-col">
        <Navbar />
        <main className="max-w-7xl mx-auto px-6 py-8 w-full flex-1">
          <Routes>
            <Route path="/" element={<Navigate to="/overview" replace />} />
            <Route path="/overview" element={<Overview tenant={TENANT} />} />
            <Route path="/members" element={<Members tenant={TENANT} />} />
            <Route path="/members/:membershipId" element={<MemberDetail />} />
            <Route path="/cycles" element={<Cycles tenant={TENANT} />} />
            <Route path="/flags" element={<Flags tenant={TENANT} />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
        <footer className="border-t border-gray-200 bg-white py-4 sticky bottom-0">
          <p className="text-center text-xs text-gray-400">{TENANT.name}</p>
        </footer>
      </div>
    </BrowserRouter>
  )
}

export default App
import { NavLink } from 'react-router-dom'

function Navbar({ userName, onLogout }) {
  const initial = (userName || '?').charAt(0).toUpperCase()

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-0">
      <div className="max-w-7xl mx-auto flex items-center justify-between">

        {/* Left — Logo */}
        <div className="flex items-center py-3">
          <img src="/logo.svg" alt="Owen" className="h-9 w-auto min-w-[120px]" />
        </div>

        {/* Centre — Nav links */}
        <div className="flex items-center gap-1">
          {[
            { to: '/overview', label: 'Overview' },
            { to: '/members',  label: 'Members'  },
            { to: '/cycles',   label: 'Cycles'   },
            { to: '/flags',    label: 'Flags'    },
            { to: '/settings', label: 'Settings' },
          ].map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `px-4 py-5 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-gray-800 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>

        {/* Right — User identity + sign out */}
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-medium text-sm">
            {initial}
          </div>
          <span className="hidden sm:block text-gray-700 text-sm font-medium">{userName}</span>
          <button
            onClick={onLogout}
            className="ml-1 px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-800 transition-colors"
          >
            Sign out
          </button>
        </div>

      </div>
    </nav>
  )
}

export default Navbar

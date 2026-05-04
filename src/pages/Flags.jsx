import PageHeader from '../components/ui/PageHeader'
import { useQuery } from '@tanstack/react-query'
import { getOpenFlags, getOpenFlagCount } from '../services/flagService'

const SEVERITY = {
  high:   { badge: 'bg-red-100 text-red-700',       label: 'High',   subtitle: 'severity' },
  medium: { badge: 'bg-yellow-100 text-yellow-700',  label: 'Medium', subtitle: 'severity' },
  low:    { badge: 'bg-gray-100 text-gray-600',      label: 'Low',    subtitle: 'severity' },
}

function Flags({ tenant }) {
  const { data: flags, isLoading, isError } = useQuery({
    queryKey: ['openFlags'],
    queryFn: getOpenFlags,
  })

  const { data: openCount } = useQuery({
    queryKey: ['openFlagCount'],
    queryFn: getOpenFlagCount,
  })

  const severityCounts = (flags ?? []).reduce(
    (acc, f) => { const s = f.severity ?? 'low'; acc[s] = (acc[s] || 0) + 1; return acc },
    { high: 0, medium: 0, low: 0 }
  )

  return (
    <div>
      <PageHeader title="Flags" subtitle={tenant?.name ?? ''} />

      {/* Stats row — matches StatCard exactly */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500 font-medium">Total Open</p>
          <p className="text-3xl font-bold mt-1 text-gray-900">{openCount ?? '—'}</p>
          <p className="text-sm text-gray-400 mt-1">flags</p>
        </div>
        {['high', 'medium', 'low'].map(s => (
          <div key={s} className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm text-gray-500 font-medium">{SEVERITY[s].label} Severity</p>
            <p className="text-3xl font-bold mt-1 text-gray-900">{severityCounts[s]}</p>
            <p className="text-sm text-gray-400 mt-1">open flags</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left">
              <th className="px-5 py-3 text-xs font-medium text-gray-500">Member</th>
              <th className="px-5 py-3 text-xs font-medium text-gray-500">Group</th>
              <th className="px-5 py-3 text-xs font-medium text-gray-500">Reason</th>
              <th className="px-5 py-3 text-xs font-medium text-gray-500">Severity</th>
              <th className="px-5 py-3 text-xs font-medium text-gray-500">Raised</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400">Loading flags...</td></tr>}
            {isError && <tr><td colSpan={5} className="px-5 py-8 text-center text-red-400">Failed to load flags.</td></tr>}
            {!isLoading && !isError && flags?.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400">No open flags.</td></tr>
            )}
            {flags?.map((flag) => (
              <tr key={flag.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3 font-medium text-gray-800">{flag.membership?.user?.full_name ?? '—'}</td>
                <td className="px-5 py-3 text-gray-500">{flag.membership?.thrift_group?.name ?? '—'}</td>
                <td className="px-5 py-3 text-gray-600 max-w-xs truncate">{flag.reason}</td>
                <td className="px-5 py-3 text-gray-600 capitalize">{flag.severity}</td>
                <td className="px-5 py-3 text-gray-400">
                  {new Date(flag.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Flags
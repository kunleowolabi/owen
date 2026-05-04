import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Legend } from 'recharts'
import { useKycBreakdown, useFlagSeverityBreakdown } from '../../hooks/useMembers'

const KYC_COLORS = {
  verified:   '#374151',
  pending:    '#9ca3af',
  unverified: '#d1d5db',
  rejected:   '#111827',
}

const FLAG_COLORS = {
  low:    '#d1d5db',
  medium: '#9ca3af',
  high:   '#374151',
}

const renderCustomLegend = (props) => {
  const { payload } = props
  return (
    <ul className="flex flex-wrap gap-3 justify-center mt-6">
      {payload.map((entry) => (
        <li key={entry.value} className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: entry.color }} />
          {entry.value}
        </li>
      ))}
    </ul>
  )
}

function MembersCharts() {
  const { data: kyc, isLoading: loadingKyc, isError: errorKyc } = useKycBreakdown()
  const { data: flags, isLoading: loadingFlags, isError: errorFlags } = useFlagSeverityBreakdown()

  const kycData = kyc
    ? Object.entries(kyc).map(([name, value]) => ({ name, value })).filter(d => d.value > 0)
    : []

  const flagData = flags
    ? Object.entries(flags).map(([name, value]) => ({ name, value })).filter(d => d.value > 0)
    : []

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">KYC Status</h2>
        {loadingKyc && <p className="text-sm text-gray-400">Loading...</p>}
        {errorKyc && <p className="text-sm text-red-400">Failed to load KYC data.</p>}
        {!loadingKyc && !errorKyc && kycData.length === 0 && (
          <p className="text-sm text-gray-400">No KYC data available.</p>
        )}
        {!loadingKyc && !errorKyc && kycData.length > 0 && (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={kycData} cx="50%" cy="50%" innerRadius={40} outerRadius={95} paddingAngle={2} dataKey="value">
                {kycData.map((entry) => (
                  <Cell key={entry.name} fill={KYC_COLORS[entry.name] ?? '#d1d5db'} />
                ))}
              </Pie>
              <Tooltip />
              <Legend content={renderCustomLegend} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Open Flags by Severity</h2>
        {loadingFlags && <p className="text-sm text-gray-400">Loading...</p>}
        {errorFlags && <p className="text-sm text-red-400">Failed to load flag data.</p>}
        {!loadingFlags && !errorFlags && flagData.length === 0 && (
          <p className="text-sm text-gray-400">No open flags.</p>
        )}
        {!loadingFlags && !errorFlags && flagData.length > 0 && (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={flagData} barSize={56} barCategoryGap="30%">
              <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: 'transparent' }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {flagData.map((entry) => (
                  <Cell key={entry.name} fill={FLAG_COLORS[entry.name] ?? '#d1d5db'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

export default MembersCharts
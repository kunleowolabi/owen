import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import { useContributionCompliance } from '../../hooks/useCycles'

function ComplianceChart() {
  const { data, isLoading, isError } = useContributionCompliance()

  return (
    <div className="mb-8">
      <h2 className="text-base font-semibold text-gray-800 mb-3">Contribution Compliance by Group</h2>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {isLoading && <p className="text-sm text-gray-400">Loading chart...</p>}
        {isError && <p className="text-sm text-red-400">Failed to load chart.</p>}
        {!isLoading && !isError && (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} barSize={24} barCategoryGap="35%">
              <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
              <Legend
                wrapperStyle={{ fontSize: '12px', paddingTop: '16px' }}
              />
              <Bar dataKey="paid" name="Paid" fill="#5ac499" radius={[4, 4, 0, 0]} />
              <Bar dataKey="pending" name="Pending" fill="#a8dfc4" radius={[4, 4, 0, 0]} />
              <Bar dataKey="defaulted" name="Defaulted" fill="#1a2340" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

export default ComplianceChart

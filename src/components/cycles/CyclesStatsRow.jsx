import StatCard from '../ui/StatCard'
import { useTotalCycleCount, useActiveCycleCount } from '../../hooks/useCycles'
import { useTotalContributions } from '../../hooks/useOverviewStats'

function CyclesStatsRow() {
  const { data: totalCycles, isLoading: loadingTotal } = useTotalCycleCount()
  const { data: openCycles, isLoading: loadingOpen } = useActiveCycleCount()
  const { data: totalContributions, isLoading: loadingContributions } = useTotalContributions()

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
      <StatCard title="Total Cycles" value={loadingTotal ? '...' : totalCycles} />
      <StatCard title="Open Cycles" value={loadingOpen ? '...' : openCycles} />
      <StatCard
        title="Total Amount Collected"
        value={loadingContributions ? '...' : `£${Number(totalContributions).toLocaleString()}`}
      />
    </div>
  )
}

export default CyclesStatsRow

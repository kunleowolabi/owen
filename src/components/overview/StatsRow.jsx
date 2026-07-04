import StatCard from '../ui/StatCard'
import { useTenant } from '../../context/TenantContext'
import { formatMoney } from '../../utils/money'
import {
  useActiveMemberCount,
  useActiveCycleCount,
  useTotalContributions,
  usePendingContributionsCount,
  useOpenFlagCount,
  usePendingDocumentCount,
} from '../../hooks/useOverviewStats'

function StatsRow() {
  const tenant = useTenant()
  const { data: memberCount, isLoading: loadingMembers } = useActiveMemberCount()
  const { data: cycleCount, isLoading: loadingCycles } = useActiveCycleCount()
  const { data: totalContributions, isLoading: loadingContributions } = useTotalContributions()
  const { data: pendingCount, isLoading: loadingPending } = usePendingContributionsCount()
  const { data: flagCount, isLoading: loadingFlags } = useOpenFlagCount()
  const { data: docCount, isLoading: loadingDocs } = usePendingDocumentCount()

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
      <StatCard title="Active Members" value={loadingMembers ? '...' : memberCount} />
      <StatCard title="Active Cycles" value={loadingCycles ? '...' : cycleCount} />
      <StatCard title="Total Contributions" value={loadingContributions ? '...' : formatMoney(totalContributions, tenant?.currency)} />
      <StatCard title="Pending Contributions" value={loadingPending ? '...' : pendingCount} highlight={pendingCount > 0} />
      <StatCard title="Open Flags" value={loadingFlags ? '...' : flagCount} highlight={flagCount > 0} />
      <StatCard title="Pending Document Requests" value={loadingDocs ? '...' : docCount} highlight={docCount > 0} />
    </div>
  )
}

export default StatsRow

import StatCard from '../ui/StatCard'
import { useTotalMemberCount, useMissedContributionsCount } from '../../hooks/useMembers'
import { useActiveMemberCount } from '../../hooks/useOverviewStats'

function MembersStatsRow() {
  const { data: totalCount, isLoading: loadingTotal } = useTotalMemberCount()
  const { data: activeCount, isLoading: loadingActive } = useActiveMemberCount()
  const { data: missedCount, isLoading: loadingMissed } = useMissedContributionsCount()

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
      <StatCard title="Total Members" value={loadingTotal ? '...' : totalCount} />
      <StatCard title="Active Members" value={loadingActive ? '...' : activeCount} />
      <StatCard
        title="Missed Contributions"
        value={loadingMissed ? '...' : missedCount}
        highlight={missedCount > 0}
      />
    </div>
  )
}

export default MembersStatsRow

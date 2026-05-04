import StatCard from '../ui/StatCard'
import { useTotalDocumentCount, usePendingDocumentCount, useResolvedDocumentCount } from '../../hooks/useDocuments'

function ReportsStatsRow() {
  const { data: total, isLoading: loadingTotal } = useTotalDocumentCount()
  const { data: pending, isLoading: loadingPending } = usePendingDocumentCount()
  const { data: resolved, isLoading: loadingResolved } = useResolvedDocumentCount()

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
      <StatCard title="Total Requests" value={loadingTotal ? '...' : total} />
      <StatCard title="Pending" value={loadingPending ? '...' : pending} highlight={pending > 0} />
      <StatCard title="Resolved" value={loadingResolved ? '...' : resolved} />
    </div>
  )
}

export default ReportsStatsRow

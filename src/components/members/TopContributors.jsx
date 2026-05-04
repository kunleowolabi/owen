import Table from '../ui/Table'
import { useTopContributors } from '../../hooks/useMembers'

const columns = [
  { key: 'full_name', label: 'Member' },
  { key: 'cycles', label: 'Paid Contributions' },
  {
    key: 'total',
    label: 'Total Contributed',
    render: (row) => `£${Number(row.total).toLocaleString()}`,
  },
]

function TopContributors() {
  const { data: contributors, isLoading, isError } = useTopContributors(5)

  return (
    <div className="mb-8">
      <h2 className="text-base font-semibold text-gray-800 mb-3">Top Contributors</h2>
      {isLoading && <p className="text-sm text-gray-400">Loading...</p>}
      {isError && <p className="text-sm text-red-400">Failed to load contributors.</p>}
      {!isLoading && !isError && <Table columns={columns} data={contributors ?? []} />}
    </div>
  )
}

export default TopContributors
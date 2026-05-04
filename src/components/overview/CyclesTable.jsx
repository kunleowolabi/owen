import Table from '../ui/Table'
import Badge from '../ui/Badge'
import { useActiveCycles } from '../../hooks/useOverviewStats'

const columns = [
  { key: 'name', label: 'Cycle Name', render: (row) => row.thrift_group?.name ?? '—' },
  {
    key: 'contribution',
    label: 'Contribution',
    render: (row) =>
      row.thrift_group?.contribution_amount
        ? `£${Number(row.thrift_group.contribution_amount).toLocaleString()}`
        : '—',
  },
  {
    key: 'frequency',
    label: 'Frequency',
    render: (row) => row.thrift_group?.contribution_frequency ?? '—',
  },
  {
    key: 'start_date',
    label: 'Start Date',
    render: (row) => new Date(row.start_date).toLocaleDateString('en-GB'),
  },
  {
    key: 'end_date',
    label: 'End Date',
    render: (row) => new Date(row.end_date).toLocaleDateString('en-GB'),
  },
  {
    key: 'status',
    label: 'Status',
    render: (row) => <Badge status={row.status} />,
  },
]

function CyclesTable() {
  const { data: cycles, isLoading, isError } = useActiveCycles()

  return (
    <div className="mb-8">
      <h2 className="text-base font-semibold text-gray-800 mb-3">
        Contribution Cycles
      </h2>
      {isLoading && <p className="text-sm text-gray-400">Loading cycles...</p>}
      {isError && <p className="text-sm text-red-400">Failed to load cycles.</p>}
      {!isLoading && !isError && <Table columns={columns} data={cycles} />}
    </div>
  )
}

export default CyclesTable

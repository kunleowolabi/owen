import Table from '../ui/Table'
import Badge from '../ui/Badge'
import { useActiveCycles } from '../../hooks/useOverviewStats'
import { useTenant } from '../../context/TenantContext'
import { formatMoney } from '../../utils/money'

function buildColumns(currency) {
  return [
    { key: 'name', label: 'Cycle Name', render: (row) => row.contribution_group?.name ?? '—' },
    {
      key: 'contribution',
      label: 'Contribution',
      render: (row) =>
        row.contribution_group?.contribution_amount
          ? formatMoney(row.contribution_group.contribution_amount, currency)
          : '—',
    },
    {
      key: 'frequency',
      label: 'Frequency',
      render: (row) => row.contribution_group?.contribution_frequency ?? '—',
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
}

function CyclesTable() {
  const tenant = useTenant()
  const { data: cycles, isLoading, isError } = useActiveCycles()
  const columns = buildColumns(tenant?.currency)

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

import Table from '../ui/Table'
import Badge from '../ui/Badge'
import { useRecentContributions } from '../../hooks/useOverviewStats'
import { useTenant } from '../../context/TenantContext'
import { formatMoney } from '../../utils/money'

function buildColumns(currency) {
  return [
    {
      key: 'payment_date',
      label: 'Date',
      render: (row) =>
        row.payment_date
          ? new Date(row.payment_date).toLocaleDateString('en-GB')
          : '—',
    },
    {
      key: 'member',
      label: 'Member',
      render: (row) => row.membership?.user?.full_name ?? '—',
    },
    {
      key: 'cycle',
      label: 'Cycle',
      render: (row) => row.membership?.contribution_group?.name ?? '—',
    },
    {
      key: 'amount_paid',
      label: 'Contribution',
      render: (row) => formatMoney(row.amount_paid, currency),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <Badge status={row.status} />,
    },
  ]
}

function RecentTransactions() {
  const tenant = useTenant()
  const { data: contributions, isLoading, isError } = useRecentContributions(10)
  const columns = buildColumns(tenant?.currency)

  return (
    <div>
      <h2 className="text-base font-semibold text-gray-800 mb-3">
        Recent Transactions
      </h2>
      {isLoading && <p className="text-sm text-gray-400">Loading transactions...</p>}
      {isError && <p className="text-sm text-red-400">Failed to load transactions.</p>}
      {!isLoading && !isError && <Table columns={columns} data={contributions} />}
    </div>
  )
}

export default RecentTransactions

import { useState } from 'react'
import Table from '../ui/Table'
import Badge from '../ui/Badge'
import { useAllCycles } from '../../hooks/useCycles'
import { useTenant } from '../../context/TenantContext'
import { formatMoney } from '../../utils/money'

function buildColumns(currency) {
  return [
    { key: 'name', label: 'Group Name', render: (row) => row.contribution_group?.name ?? '—' },
    { key: 'cycle_number', label: 'Cycle No.', render: (row) => `#${row.cycle_number}` },
    {
      key: 'contribution_amount',
      label: 'Contribution',
      render: (row) => row.contribution_group?.contribution_amount
        ? formatMoney(row.contribution_group.contribution_amount, currency)
        : '—',
    },
    { key: 'frequency', label: 'Frequency', render: (row) => row.contribution_group?.contribution_frequency ?? '—' },
    { key: 'start_date', label: 'Start Date', render: (row) => new Date(row.start_date).toLocaleDateString('en-GB') },
    { key: 'end_date', label: 'End Date', render: (row) => new Date(row.end_date).toLocaleDateString('en-GB') },
    { key: 'status', label: 'Status', render: (row) => <Badge status={row.status} /> },
  ]
}

const PAGE_SIZE = 10

function CyclesTable() {
  const tenant = useTenant()
  const { data: cycles, isLoading, isError } = useAllCycles()
  const [page, setPage] = useState(1)
  const columns = buildColumns(tenant?.currency)

  const totalPages = Math.ceil((cycles?.length ?? 0) / PAGE_SIZE)
  const paginated = cycles?.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) ?? []

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-gray-800">
          All Cycles{cycles?.length > 0 && <span className="text-gray-400 font-normal text-sm"> ({cycles.length})</span>}
        </h2>
      </div>
      {isLoading && <p className="text-sm text-gray-400">Loading cycles...</p>}
      {isError && <p className="text-sm text-red-400">Failed to load cycles.</p>}
      {!isLoading && !isError && (
        <>
          <Table columns={columns} data={paginated} />
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-400">Page {page} of {totalPages}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
                >
                  ← Prev
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default CyclesTable

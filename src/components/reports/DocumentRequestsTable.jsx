import { useState } from 'react'
import Table from '../ui/Table'
import Badge from '../ui/Badge'
import { useAllDocumentRequests } from '../../hooks/useDocuments'
import GenerateReportModal from './GenerateReportModal'

const columns = [
  { key: 'member', label: 'Member', render: (row) => row.membership?.user?.full_name ?? '—' },
  { key: 'email', label: 'Email', render: (row) => row.membership?.user?.email ?? '—' },
  { key: 'group', label: 'Group', render: (row) => row.membership?.thrift_group?.name ?? '—' },
  {
    key: 'type',
    label: 'Document Type',
    render: (row) => row.type === 'contribution_statement'
      ? 'Contribution Statement'
      : 'Loan Support Letter',
  },
  {
    key: 'requested_at',
    label: 'Requested',
    render: (row) => new Date(row.requested_at).toLocaleDateString('en-GB'),
  },
  { key: 'status', label: 'Status', render: (row) => <Badge status={row.status} /> },
]

const PAGE_SIZE = 10

function DocumentRequestsTable({ tenant }) {
  const { data: requests, isLoading, isError } = useAllDocumentRequests()
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)

  const totalPages = Math.ceil((requests?.length ?? 0) / PAGE_SIZE)
  const paginated = requests?.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) ?? []

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-gray-800">
          Document Requests
          {requests?.length > 0 && (
            <span className="text-gray-400 font-normal text-sm"> ({requests.length})</span>
          )}
        </h2>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Generate Report
        </button>
      </div>

      {isLoading && <p className="text-sm text-gray-400">Loading requests...</p>}
      {isError && <p className="text-sm text-red-400">Failed to load requests.</p>}
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

      {showModal && <GenerateReportModal onClose={() => setShowModal(false)} tenant={tenant} />}
    </div>
  )
}

export default DocumentRequestsTable

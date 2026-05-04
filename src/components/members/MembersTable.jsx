import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Table from '../ui/Table'
import Badge from '../ui/Badge'
import { useAllMembers } from '../../hooks/useMembers'

const columns = [
  { key: 'name', label: 'Name', render: (row) => row.user?.full_name ?? '—' },
  { key: 'email', label: 'Email', render: (row) => row.user?.email ?? '—' },
  { key: 'role', label: 'Role', render: (row) => <Badge status={row.role} /> },
  { key: 'kyc_status', label: 'KYC', render: (row) => <Badge status={row.user?.kyc_status} /> },
  { key: 'status', label: 'Status', render: (row) => <Badge status={row.status} /> },
  {
    key: 'join_date',
    label: 'Joined',
    render: (row) => new Date(row.join_date).toLocaleDateString('en-GB'),
  },
]

const PAGE_SIZE = 10

function MembersTable() {
  const { data: members, isLoading, isError } = useAllMembers()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const navigate = useNavigate()

  const filtered = members
    ? members.filter(m =>
        m.user?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        m.user?.email?.toLowerCase().includes(search.toLowerCase())
      )
    : []

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function handleSearch(e) {
    setSearch(e.target.value)
    setPage(1)
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-gray-800">
          All Members {filtered.length > 0 && <span className="text-gray-400 font-normal text-sm">({filtered.length})</span>}
        </h2>
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={handleSearch}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5ac499] w-64"
        />
      </div>

      {isLoading && <p className="text-sm text-gray-400">Loading members...</p>}
      {isError && <p className="text-sm text-red-400">Failed to load members.</p>}
      {!isLoading && !isError && (
        <>
          <Table
            columns={columns}
            data={paginated}
            onRowClick={(row) => navigate(`/members/${row.id}`)}
          />
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-400">
                Page {page} of {totalPages}
              </p>
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

export default MembersTable

import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getMemberById } from '../services/memberService'
import { getContributionsByMembership } from '../services/contributionService'
import Badge from '../components/ui/Badge'
import Table from '../components/ui/Table'

const contributionColumns = [
  { key: 'group', label: 'Group', render: (row) => row.cycle?.thrift_group?.name ?? '—' },
  { key: 'cycle', label: 'Cycle', render: (row) => row.cycle ? `#${row.cycle.cycle_number}` : '—' },
  { key: 'amount_due', label: 'Amount Due', render: (row) => `£${Number(row.amount_due).toLocaleString()}` },
  { key: 'amount_paid', label: 'Amount Paid', render: (row) => `£${Number(row.amount_paid).toLocaleString()}` },
  {
    key: 'payment_date',
    label: 'Payment Date',
    render: (row) => row.payment_date
      ? new Date(row.payment_date).toLocaleDateString('en-GB')
      : '—',
  },
  { key: 'status', label: 'Status', render: (row) => <Badge status={row.status} /> },
]

const flagColumns = [
  { key: 'reason', label: 'Reason' },
  { key: 'severity', label: 'Severity', render: (row) => <Badge status={row.severity} /> },
  {
    key: 'created_at',
    label: 'Date Raised',
    render: (row) => new Date(row.created_at).toLocaleDateString('en-GB'),
  },
  {
    key: 'resolved_at',
    label: 'Status',
    render: (row) => row.resolved_at
      ? <span className="text-green-600 text-xs font-medium">Resolved</span>
      : <span className="text-red-500 text-xs font-medium">Open</span>,
  },
]

const documentColumns = [
  {
    key: 'type',
    label: 'Document Type',
    render: (row) => row.type === 'contribution_statement'
      ? 'Contribution Statement'
      : 'Loan Support Letter',
  },
  { key: 'status', label: 'Status', render: (row) => <Badge status={row.status} /> },
  {
    key: 'requested_at',
    label: 'Requested',
    render: (row) => new Date(row.requested_at).toLocaleDateString('en-GB'),
  },
  {
    key: 'file_url',
    label: 'File',
    render: (row) => row.file_url
      ? <a href={row.file_url} target="_blank" rel="noreferrer" className="text-orange-500 text-xs underline">Download</a>
      : '—',
  },
]

function Section({ title, children }) {
  return (
    <div className="mb-8">
      <h2 className="text-base font-semibold text-gray-800 mb-3">{title}</h2>
      {children}
    </div>
  )
}

function MemberDetail() {
  const { membershipId } = useParams()
  const navigate = useNavigate()

  const { data: member, isLoading: loadingMember, isError: errorMember } = useQuery({
    queryKey: ['member', membershipId],
    queryFn: () => getMemberById(membershipId),
    enabled: !!membershipId,
  })

  const { data: contributions, isLoading: loadingContributions } = useQuery({
    queryKey: ['memberContributions', membershipId],
    queryFn: () => getContributionsByMembership(membershipId),
    enabled: !!membershipId,
  })

  console.log('membershipId:', membershipId)
  console.log('member data:', member)
  console.log('member error:', errorMember)

  if (loadingMember) return <p className="text-sm text-gray-400">Loading member...</p>
  if (errorMember) return <p className="text-sm text-red-400">Failed to load member.</p>

  const user = member?.user

  return (
    <div>
      {/* Back button */}
      <button
        onClick={() => navigate('/members')}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors mb-6"
      >
        ← Back to Members
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{user?.full_name ?? '—'}</h1>
            <p className="text-sm text-gray-500 mt-1">{user?.email ?? '—'}</p>
            {user?.phone && <p className="text-sm text-gray-500">{user.phone}</p>}
          </div>
          <div className="flex items-center gap-2">
            <Badge status={user?.kyc_status} />
            <Badge status={member?.role} />
            <Badge status={member?.status} />
          </div>
        </div>
        <div className="flex gap-6 mt-4 pt-4 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-400">Gender</p>
            <p className="text-sm text-gray-700 capitalize">{user?.gender ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Date of Birth</p>
            <p className="text-sm text-gray-700">
              {user?.date_of_birth
                ? new Date(user.date_of_birth).toLocaleDateString('en-GB')
                : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Joined</p>
            <p className="text-sm text-gray-700">
              {member?.join_date
                ? new Date(member.join_date).toLocaleDateString('en-GB')
                : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Contribution History */}
      <Section title="Contribution History">
        {loadingContributions
          ? <p className="text-sm text-gray-400">Loading contributions...</p>
          : <Table columns={contributionColumns} data={contributions} />
        }
      </Section>

      {/* Flags */}
      <Section title="Flags">
        {member?.flags?.length > 0
          ? <Table columns={flagColumns} data={member.flags} />
          : <p className="text-sm text-gray-400">No flags raised for this member.</p>
        }
      </Section>

      {/* Document Requests */}
      <Section title="Document Requests">
        {member?.document_requests?.length > 0
          ? <Table columns={documentColumns} data={member.document_requests} />
          : <p className="text-sm text-gray-400">No document requests for this member.</p>
        }
      </Section>
    </div>
  )
}

export default MemberDetail

import { useState } from 'react'
import { useAllMembers } from '../../hooks/useMembers'
import { getContributionsByMembership } from '../../services/contributionService'
import { getMemberById } from '../../services/memberService'
import { generateContributionStatement } from '../../utils/generatePDF'

function GenerateReportModal({ onClose, tenant }) {
  const { data: members, isLoading: loadingMembers } = useAllMembers()
  const [membershipId, setMembershipId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleDownload() {
    if (!membershipId) {
      setError('Please select a member')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [member, contributions] = await Promise.all([
        getMemberById(membershipId),
        getContributionsByMembership(membershipId),
      ])
      generateContributionStatement({
        member,
        contributions,
        organizationName: tenant?.name ?? 'Thriftly',
      })
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl border border-gray-200 p-6 w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-semibold text-gray-900">Generate Contribution Statement</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Member</label>
            <select
              value={membershipId}
              onChange={(e) => setMembershipId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5ac499]"
            >
              <option value="">Search and select a member...</option>
              {loadingMembers && <option disabled>Loading members...</option>}
              {members?.map(m => (
                <option key={m.id} value={m.id}>
                  {m.user?.full_name} — {m.user?.email}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDownload}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-[#5ac499] hover:bg-[#3da87d] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Download PDF'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GenerateReportModal

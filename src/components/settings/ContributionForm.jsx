import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createContribution } from '../../services/contributionService'
import { useContributionGroups } from '../../hooks/useGroups'
import { getMembersByGroup, getCyclesByGroup } from '../../services/groupService'
import { supabase } from '../../supabaseClient'
import { friendlyError } from '../../utils/friendlyError'
import { useTenant } from '../../context/TenantContext'
import { currencySymbol } from '../../utils/money'

function ContributionForm() {
  const queryClient = useQueryClient()
  const symbol = currencySymbol(useTenant()?.currency)
  const { data: groups, isLoading: loadingGroups } = useContributionGroups()

  const [form, setForm] = useState({
    contributionGroupId: '',
    membershipId: '',
    cycleId: '',
    amountDue: '',
    amountPaid: '',
    paymentDate: '',
  })
  const [members, setMembers] = useState([])
  const [cycles, setCycles] = useState([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [loadingCycles, setLoadingCycles] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  async function handleGroupChange(e) {
    const groupId = e.target.value
    setForm(f => ({ ...f, contributionGroupId: groupId, membershipId: '', cycleId: '' }))
    if (!groupId) { setMembers([]); setCycles([]); return }

    setLoadingMembers(true)
    setLoadingCycles(true)
    try {
      const [m, c] = await Promise.all([
        getMembersByGroup(groupId),
        getCyclesByGroup(groupId),
      ])
      setMembers(m)
      setCycles(c)
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setLoadingMembers(false)
      setLoadingCycles(false)
    }
  }

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit() {
    if (!form.membershipId || !form.cycleId || !form.amountDue || !form.amountPaid) {
      setError('Group, member, cycle, amount due and amount paid are required')
      return
    }
    setLoading(true)
    setError(null)
    setSuccess(false)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      await createContribution({
        membershipId: form.membershipId,
        cycleId: form.cycleId,
        amountDue: parseFloat(form.amountDue),
        amountPaid: parseFloat(form.amountPaid),
        paymentDate: form.paymentDate || null,
        recordedBy: user.id,
      })
      setSuccess(true)
      setForm({ contributionGroupId: '', membershipId: '', cycleId: '', amountDue: '', amountPaid: '', paymentDate: '' })
      setMembers([])
      setCycles([])
      queryClient.invalidateQueries({ queryKey: ['recentContributions'] })
      queryClient.invalidateQueries({ queryKey: ['totalContributions'] })
      queryClient.invalidateQueries({ queryKey: ['pendingContributionsCount'] })
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg">
      <h2 className="text-base font-semibold text-gray-800 mb-6">Add Contribution Record</h2>
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contribution Group</label>
          <select
            name="contributionGroupId"
            value={form.contributionGroupId}
            onChange={handleGroupChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5ac499]"
          >
            <option value="">Select contribution group...</option>
            {loadingGroups && <option disabled>Loading...</option>}
            {groups?.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Member</label>
          <select
            name="membershipId"
            value={form.membershipId}
            onChange={handleChange}
            disabled={!form.contributionGroupId}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5ac499] disabled:opacity-50"
          >
            <option value="">Select member...</option>
            {loadingMembers && <option disabled>Loading...</option>}
            {members?.map(m => (
              <option key={m.id} value={m.id}>{m.user?.full_name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cycle</label>
          <select
            name="cycleId"
            value={form.cycleId}
            onChange={handleChange}
            disabled={!form.contributionGroupId}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5ac499] disabled:opacity-50"
          >
            <option value="">Select cycle...</option>
            {loadingCycles && <option disabled>Loading...</option>}
            {cycles?.map(c => (
              <option key={c.id} value={c.id}>Cycle #{c.cycle_number} — {c.status}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount Due ({symbol})</label>
            <input
              type="number"
              name="amountDue"
              value={form.amountDue}
              onChange={handleChange}
              placeholder="e.g. 50000"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5ac499]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid ({symbol})</label>
            <input
              type="number"
              name="amountPaid"
              value={form.amountPaid}
              onChange={handleChange}
              placeholder="e.g. 50000"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5ac499]"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date <span className="text-gray-400">(optional)</span></label>
          <input
            type="date"
            name="paymentDate"
            value={form.paymentDate}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5ac499]"
          />
          <p className="text-xs text-gray-400 mt-1">
            Status is set automatically from the amounts — paid, partial or pending.
          </p>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
        {success && <p className="text-sm text-green-600">Contribution recorded successfully.</p>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-gray-800 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Record Contribution'}
        </button>
      </div>
    </div>
  )
}

export default ContributionForm

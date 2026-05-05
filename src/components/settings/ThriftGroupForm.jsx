import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createThriftGroup } from '../../services/groupService'
import { useOrganizations } from '../../hooks/useOrganizations'
import { supabase } from '../../supabaseClient'

const FREQUENCIES = ['weekly', 'biweekly', 'monthly']

function ThriftGroupForm() {
  const queryClient = useQueryClient()
  const { data: organizations, isLoading: loadingOrgs } = useOrganizations()

  const [form, setForm] = useState({
    name: '',
    organizationId: '',
    contributionAmount: '',
    contributionFrequency: 'monthly',
    startDate: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit() {
    if (!form.name.trim() || !form.organizationId || !form.contributionAmount || !form.startDate) {
      setError('All fields are required')
      return
    }
    setLoading(true)
    setError(null)
    setSuccess(false)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      await createThriftGroup({
        name: form.name.trim(),
        organizationId: form.organizationId,
        contributionAmount: parseFloat(form.contributionAmount),
        contributionFrequency: form.contributionFrequency,
        startDate: form.startDate,
        createdBy: user.id,
      })
      setSuccess(true)
      setForm({ name: '', organizationId: '', contributionAmount: '', contributionFrequency: 'monthly', startDate: '' })
      queryClient.invalidateQueries({ queryKey: ['thriftGroups'] })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg">
      <h2 className="text-base font-semibold text-gray-800 mb-6">Add Thrift Group</h2>
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="e.g. Ikeja Thrift Circle"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5ac499]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Organization</label>
          <select
            name="organizationId"
            value={form.organizationId}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5ac499]"
          >
            <option value="">Select organization...</option>
            {loadingOrgs && <option disabled>Loading...</option>}
            {organizations?.map(org => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contribution Amount (£)</label>
          <input
            type="number"
            name="contributionAmount"
            value={form.contributionAmount}
            onChange={handleChange}
            placeholder="e.g. 50000"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5ac499]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contribution Frequency</label>
          <select
            name="contributionFrequency"
            value={form.contributionFrequency}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5ac499]"
          >
            {FREQUENCIES.map(f => (
              <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <input
            type="date"
            name="startDate"
            value={form.startDate}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5ac499]"
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
        {success && <p className="text-sm text-green-600">Thrift group created successfully.</p>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-gray-800 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Thrift Group'}
        </button>
      </div>
    </div>
  )
}

export default ThriftGroupForm

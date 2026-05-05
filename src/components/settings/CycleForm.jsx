import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createCycle } from '../../services/cycleService'
import { useThriftGroups } from '../../hooks/useGroups'
import { supabase } from '../../supabaseClient'

function CycleForm() {
  const queryClient = useQueryClient()
  const { data: groups, isLoading: loadingGroups } = useThriftGroups()

  const [form, setForm] = useState({
    thriftGroupId: '',
    cycleNumber: '',
    startDate: '',
    endDate: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit() {
    if (!form.thriftGroupId || !form.cycleNumber || !form.startDate || !form.endDate) {
      setError('All fields are required')
      return
    }
    if (new Date(form.endDate) <= new Date(form.startDate)) {
      setError('End date must be after start date')
      return
    }
    setLoading(true)
    setError(null)
    setSuccess(false)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      await createCycle({
        thriftGroupId: form.thriftGroupId,
        cycleNumber: parseInt(form.cycleNumber),
        startDate: form.startDate,
        endDate: form.endDate,
        createdBy: user.id,
      })
      setSuccess(true)
      setForm({ thriftGroupId: '', cycleNumber: '', startDate: '', endDate: '' })
      queryClient.invalidateQueries({ queryKey: ['allCycles'] })
      queryClient.invalidateQueries({ queryKey: ['activeCycles'] })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg">
      <h2 className="text-base font-semibold text-gray-800 mb-6">Add Cycle</h2>
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Thrift Group</label>
          <select
            name="thriftGroupId"
            value={form.thriftGroupId}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5ac499]"
          >
            <option value="">Select thrift group...</option>
            {loadingGroups && <option disabled>Loading...</option>}
            {groups?.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cycle Number</label>
          <input
            type="number"
            name="cycleNumber"
            value={form.cycleNumber}
            onChange={handleChange}
            placeholder="e.g. 1"
            min="1"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5ac499]"
          />
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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
          <input
            type="date"
            name="endDate"
            value={form.endDate}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5ac499]"
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
        {success && <p className="text-sm text-green-600">Cycle created successfully.</p>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-gray-800 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Cycle'}
        </button>
      </div>
    </div>
  )
}

export default CycleForm

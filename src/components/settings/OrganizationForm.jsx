import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createOrganization } from '../../services/organizationService'
import { supabase } from '../../supabaseClient'

function OrganizationForm() {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit() {
    if (!name.trim()) {
      setError('Organization name is required')
      return
    }
    setLoading(true)
    setError(null)
    setSuccess(false)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      await createOrganization({ name: name.trim(), createdBy: user.id })
      setSuccess(true)
      setName('')
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg">
      <h2 className="text-base font-semibold text-gray-800 mb-6">Add Organization</h2>
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Organization Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Lagos Cooperative Alliance"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5ac499]"
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
        {success && <p className="text-sm text-green-600">Organization created successfully.</p>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-[#5ac499] hover:bg-[#3da87d] text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Organization'}
        </button>
      </div>
    </div>
  )
}

export default OrganizationForm

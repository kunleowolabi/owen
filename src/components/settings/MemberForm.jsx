import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createMember } from '../../services/memberService'
import { useThriftGroups } from '../../hooks/useGroups'
import { supabase } from '../../supabaseClient'

const ROLES = ['member', 'treasurer', 'admin']
const GENDERS = ['male', 'female', 'other']

function MemberForm() {
  const queryClient = useQueryClient()
  const { data: groups, isLoading: loadingGroups } = useThriftGroups()

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    thriftGroupId: '',
    role: 'member',
    joinDate: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit() {
    if (!form.fullName.trim() || !form.email.trim() || !form.thriftGroupId || !form.joinDate) {
      setError('Full name, email, thrift group and join date are required')
      return
    }
    setLoading(true)
    setError(null)
    setSuccess(false)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      await createMember({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        dateOfBirth: form.dateOfBirth || null,
        gender: form.gender || null,
        thriftGroupId: form.thriftGroupId,
        role: form.role,
        joinDate: form.joinDate,
        createdBy: user.id,
      })
      setSuccess(true)
      setForm({ fullName: '', email: '', phone: '', dateOfBirth: '', gender: '', thriftGroupId: '', role: 'member', joinDate: '' })
      queryClient.invalidateQueries({ queryKey: ['allMembers'] })
      queryClient.invalidateQueries({ queryKey: ['activeMemberCount'] })
      queryClient.invalidateQueries({ queryKey: ['totalMemberCount'] })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg">
      <h2 className="text-base font-semibold text-gray-800 mb-6">Add Member</h2>
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
          <input
            type="text"
            name="fullName"
            value={form.fullName}
            onChange={handleChange}
            placeholder="e.g. Amina Bello"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5ac499]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="e.g. amina@email.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5ac499]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone <span className="text-gray-400">(optional)</span></label>
          <input
            type="tel"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="e.g. 08012345678"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5ac499]"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth <span className="text-gray-400">(optional)</span></label>
            <input
              type="date"
              name="dateOfBirth"
              value={form.dateOfBirth}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5ac499]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gender <span className="text-gray-400">(optional)</span></label>
            <select
              name="gender"
              value={form.gender}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5ac499]"
            >
              <option value="">Select...</option>
              {GENDERS.map(g => (
                <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5ac499]"
            >
              {ROLES.map(r => (
                <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Join Date</label>
            <input
              type="date"
              name="joinDate"
              value={form.joinDate}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5ac499]"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
        {success && <p className="text-sm text-green-600">Member added successfully.</p>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-gray-800 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors disabled:opacity-50"
        >
          {loading ? 'Adding...' : 'Add Member'}
        </button>
      </div>
    </div>
  )
}

export default MemberForm

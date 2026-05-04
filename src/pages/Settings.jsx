import { useState } from 'react'
import PageHeader from '../components/ui/PageHeader'
import OrganizationForm from '../components/settings/OrganizationForm'
import ThriftGroupForm from '../components/settings/ThriftGroupForm'
import CycleForm from '../components/settings/CycleForm'
import MemberForm from '../components/settings/MemberForm'
import ContributionForm from '../components/settings/ContributionForm'

const TABS = [
  { id: 'members',       label: 'Members'       },
  { id: 'groups',        label: 'Thrift Groups'  },
  { id: 'cycles',        label: 'Cycles'        },
  { id: 'contributions', label: 'Contributions' },
  { id: 'organizations', label: 'Organizations' },
]

function Settings() {
  const [activeTab, setActiveTab] = useState('members')

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Manage members, groups, cycles and contributions"
      />

      <div className="flex gap-1 border-b border-gray-200 mb-8">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-gray-800 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div>
        {activeTab === 'members'       && <MemberForm />}
        {activeTab === 'groups'        && <ThriftGroupForm />}
        {activeTab === 'cycles'        && <CycleForm />}
        {activeTab === 'contributions' && <ContributionForm />}
        {activeTab === 'organizations' && <OrganizationForm />}
      </div>
    </div>
  )
}

export default Settings

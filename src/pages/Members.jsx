import PageHeader from '../components/ui/PageHeader'
import MembersStatsRow from '../components/members/MembersStatsRow'
import MembersCharts from '../components/members/MembersCharts'
import MembersTable from '../components/members/MembersTable'
import TopContributors from '../components/members/TopContributors'

function Members() {
  return (
    <div>
      <PageHeader title="Members" />
      <MembersStatsRow />
      <MembersCharts />
      <TopContributors />
      <MembersTable />
    </div>
  )
}

export default Members

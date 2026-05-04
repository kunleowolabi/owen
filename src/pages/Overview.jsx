import PageHeader from '../components/ui/PageHeader'
import StatsRow from '../components/overview/StatsRow'
import CyclesTable from '../components/overview/CyclesTable'
import RecentTransactions from '../components/overview/RecentTransactions'

function Overview({ tenant }) {
  return (
    <div>
      <PageHeader title="Overview" subtitle={tenant?.name ?? ''} />
      <StatsRow />
      <CyclesTable />
      <RecentTransactions />
    </div>
  )
}

export default Overview

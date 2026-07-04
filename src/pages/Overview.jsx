import PageHeader from '../components/ui/PageHeader'
import StatsRow from '../components/overview/StatsRow'
import CyclesTable from '../components/overview/CyclesTable'
import RecentTransactions from '../components/overview/RecentTransactions'
import { useTenant } from '../context/TenantContext'

function Overview() {
  const tenant = useTenant()

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

import PageHeader from '../components/ui/PageHeader'
import CyclesStatsRow from '../components/cycles/CyclesStatsRow'
import CyclesTable from '../components/cycles/CyclesTable'
import ComplianceChart from '../components/cycles/ComplianceChart'

function Cycles({ tenant }) {
  return (
    <div>
      <PageHeader title="Cycles" subtitle={tenant?.name ?? ''} />
      <CyclesStatsRow />
      <CyclesTable />
      <ComplianceChart />
    </div>
  )
}

export default Cycles

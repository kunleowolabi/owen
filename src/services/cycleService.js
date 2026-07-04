import { supabase } from '../supabaseClient';

export async function getCycles(contributionGroupId) {
  const { data, error } = await supabase
    .from('cycles')
    .select(`
      id,
      cycle_number,
      start_date,
      end_date,
      status,
      contribution_group:contribution_groups (
        id,
        name,
        contribution_amount,
        contribution_frequency
      )
    `)
    .eq('contribution_group_id', contributionGroupId)
    .order('cycle_number', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getActiveCycles() {
  const { data, error } = await supabase
    .from('cycles')
    .select(`
      id,
      cycle_number,
      start_date,
      end_date,
      status,
      contribution_group:contribution_groups (
        id,
        name,
        contribution_amount,
        contribution_frequency
      )
    `)
    .eq('status', 'open')
    .order('start_date', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getActiveCycleCount() {
  const { count, error } = await supabase
    .from('cycles')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'open');

  if (error) throw error;
  return count;
}

export async function getTotalCycleCount() {
  const { count, error } = await supabase
    .from('cycles')
    .select('*', { count: 'exact', head: true });
  if (error) throw error;
  return count;
}

export async function getAllCycles() {
  const { data, error } = await supabase
    .from('cycles')
    .select(`
      id,
      cycle_number,
      start_date,
      end_date,
      status,
      contribution_group:contribution_groups!cycles_contribution_group_id_fkey (
        id,
        name,
        contribution_amount,
        contribution_frequency
      )
    `)
    .order('start_date', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getContributionCompliance() {
  const { data, error } = await supabase
    .from('contributions')
    .select(`
      status,
      cycle:cycles!contributions_cycle_id_fkey (
        contribution_group:contribution_groups!cycles_contribution_group_id_fkey (
          name
        )
      )
    `);
  if (error) throw error;

  const map = {};
  data.forEach(row => {
    const name = row.cycle?.contribution_group?.name ?? 'Unknown';
    if (!map[name]) map[name] = { name, paid: 0, pending: 0, defaulted: 0 };
    if (row.status === 'paid') map[name].paid++;
    else if (row.status === 'pending') map[name].pending++;
    else if (row.status === 'defaulted') map[name].defaulted++;
  });

  return Object.values(map);
}

export async function createCycle({ contributionGroupId, cycleNumber, startDate, endDate, createdBy }) {
  // tenant_id is assigned by the database (column default reads the JWT claim)
  const { data, error } = await supabase
    .from('cycles')
    .insert({
      contribution_group_id: contributionGroupId,
      cycle_number: cycleNumber,
      start_date: startDate,
      end_date: endDate,
      created_by: createdBy,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

import { supabase } from '../supabaseClient';

const TENANT_ID = 'fb03c7b6-6d60-47aa-abd9-0d23fc765142';

export async function getCycles(thriftGroupId) {
  const { data, error } = await supabase
    .from('cycles')
    .select(`
      id,
      cycle_number,
      start_date,
      end_date,
      status,
      thrift_group:thrift_groups (
        id,
        name,
        contribution_amount,
        contribution_frequency
      )
    `)
    .eq('thrift_group_id', thriftGroupId)
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
      thrift_group:thrift_groups (
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
      thrift_group:thrift_groups!cycles_thrift_group_id_fkey (
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
        thrift_group:thrift_groups!cycles_thrift_group_id_fkey (
          name
        )
      )
    `);
  if (error) throw error;

  const map = {};
  data.forEach(row => {
    const name = row.cycle?.thrift_group?.name ?? 'Unknown';
    if (!map[name]) map[name] = { name, paid: 0, pending: 0, defaulted: 0 };
    if (row.status === 'paid') map[name].paid++;
    else if (row.status === 'pending') map[name].pending++;
    else if (row.status === 'defaulted') map[name].defaulted++;
  });

  return Object.values(map);
}

export async function createCycle({ thriftGroupId, cycleNumber, startDate, endDate, createdBy }) {
  const { data, error } = await supabase
    .from('cycles')
    .insert({
      tenant_id: TENANT_ID,
      thrift_group_id: thriftGroupId,
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
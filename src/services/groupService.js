import { supabase } from '../supabaseClient';

const TENANT_ID = 'fb03c7b6-6d60-47aa-abd9-0d23fc765142';

export async function createThriftGroup({ name, organizationId, contributionAmount, contributionFrequency, startDate, createdBy }) {
  const { data, error } = await supabase
    .from('thrift_groups')
    .insert({
      tenant_id: TENANT_ID,
      organization_id: organizationId,
      name,
      contribution_amount: contributionAmount,
      contribution_frequency: contributionFrequency,
      start_date: startDate,
      created_by: createdBy,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getThriftGroups() {
  const { data, error } = await supabase
    .from('thrift_groups')
    .select(`
      id,
      name,
      contribution_amount,
      contribution_frequency,
      start_date,
      organization:organizations!thrift_groups_organization_id_fkey (
        name
      )
    `)
    .order('name');
  if (error) throw error;
  return data;
}

export async function getMembersByGroup(thriftGroupId) {
  const { data, error } = await supabase
    .from('memberships')
    .select(`
      id,
      user:users!memberships_user_id_fkey (
        full_name
      )
    `)
    .eq('thrift_group_id', thriftGroupId)
    .eq('status', 'active');
  if (error) throw error;
  return data;
}

export async function getCyclesByGroup(thriftGroupId) {
  const { data, error } = await supabase
    .from('cycles')
    .select('id, cycle_number, status')
    .eq('thrift_group_id', thriftGroupId)
    .order('cycle_number', { ascending: false });
  if (error) throw error;
  return data;
}
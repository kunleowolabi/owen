import { supabase } from '../supabaseClient';

export async function createContributionGroup({ name, organizationId, contributionAmount, contributionFrequency, startDate, createdBy }) {
  // tenant_id is assigned by the database (column default reads the JWT claim)
  const { data, error } = await supabase
    .from('contribution_groups')
    .insert({
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

export async function getContributionGroups() {
  const { data, error } = await supabase
    .from('contribution_groups')
    .select(`
      id,
      name,
      contribution_amount,
      contribution_frequency,
      start_date,
      organization:organizations!contribution_groups_organization_id_fkey (
        name
      )
    `)
    .order('name');
  if (error) throw error;
  return data;
}

export async function getMembersByGroup(contributionGroupId) {
  const { data, error } = await supabase
    .from('memberships')
    .select(`
      id,
      user:users!memberships_user_id_fkey (
        full_name
      )
    `)
    .eq('contribution_group_id', contributionGroupId)
    .eq('status', 'active');
  if (error) throw error;
  return data;
}

export async function getCyclesByGroup(contributionGroupId) {
  const { data, error } = await supabase
    .from('cycles')
    .select('id, cycle_number, status')
    .eq('contribution_group_id', contributionGroupId)
    .order('cycle_number', { ascending: false });
  if (error) throw error;
  return data;
}

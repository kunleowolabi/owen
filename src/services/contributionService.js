import { supabase } from '../supabaseClient';

export async function getContributionsByCycle(cycleId) {
  const { data, error } = await supabase
    .from('contributions')
    .select(`
      id,
      amount_due,
      amount_paid,
      payment_date,
      status,
      membership:memberships (
        id,
        user:users (
          full_name,
          email
        )
      )
    `)
    .eq('cycle_id', cycleId)
    .order('payment_date', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getTotalContributions() {
  const { data, error } = await supabase
    .from('contributions')
    .select('amount_paid')
    .eq('status', 'paid');
  if (error) throw error;
  const total = data.reduce((sum, row) => sum + parseFloat(row.amount_paid), 0);
  return total;
}

export async function getRecentContributions(limit = 10) {
  const { data, error } = await supabase
    .from('contributions')
    .select(`
      id,
      amount_paid,
      payment_date,
      status,
      membership:memberships!contributions_membership_id_fkey (
        user:users!memberships_user_id_fkey (
          full_name
        ),
        thrift_group:thrift_groups!memberships_thrift_group_id_fkey (
          name
        )
      )
    `)
    .eq('status', 'paid')
    .order('payment_date', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

export async function getPendingContributionsCount() {
  const { count, error } = await supabase
    .from('contributions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');
  if (error) throw error;
  return count;
}

export async function createContribution({ membershipId, cycleId, amountDue, amountPaid, paymentDate, status, recordedBy }) {
  const TENANT_ID = 'fb03c7b6-6d60-47aa-abd9-0d23fc765142';
  const { data, error } = await supabase
    .from('contributions')
    .insert({
      tenant_id: TENANT_ID,
      membership_id: membershipId,
      cycle_id: cycleId,
      amount_due: amountDue,
      amount_paid: amountPaid,
      payment_date: paymentDate || null,
      status,
      recorded_by: recordedBy,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getContributionsByMembership(membershipId) {
  const { data, error } = await supabase
    .from('contributions')
    .select(`
      id,
      amount_due,
      amount_paid,
      payment_date,
      status,
      cycle:cycles!contributions_cycle_id_fkey (
        cycle_number,
        start_date,
        end_date,
        thrift_group:thrift_groups!cycles_thrift_group_id_fkey (
          name
        )
      )
    `)
    .eq('membership_id', membershipId)
    .order('payment_date', { ascending: false });
  if (error) throw error;
  return data;
}

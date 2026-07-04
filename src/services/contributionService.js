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
        contribution_group:contribution_groups!memberships_contribution_group_id_fkey (
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

export async function createContribution({ membershipId, cycleId, amountDue, amountPaid, paymentDate, recordedBy }) {
  // tenant_id is assigned by the database (column default reads the JWT claim).
  // status is intentionally NOT sent — the DB derives it from the amounts
  // (see the contributions_derive_status trigger).
  const { data, error } = await supabase
    .from('contributions')
    .insert({
      membership_id: membershipId,
      cycle_id: cycleId,
      amount_due: amountDue,
      amount_paid: amountPaid,
      payment_date: paymentDate || null,
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
        contribution_group:contribution_groups!cycles_contribution_group_id_fkey (
          name
        )
      )
    `)
    .eq('membership_id', membershipId)
    .order('payment_date', { ascending: false });
  if (error) throw error;
  return data;
}

import { supabase } from '../supabaseClient';

export async function getPayoutsByCycle(cycleId) {
  const { data, error } = await supabase
    .from('payouts')
    .select(`
      id,
      payout_amount,
      payout_date,
      status,
      membership:memberships (
        user:users (
          full_name,
          email
        )
      )
    `)
    .eq('cycle_id', cycleId)
    .order('payout_date', { ascending: false });

  if (error) throw error;
  return data;
}
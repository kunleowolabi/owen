import { supabase } from '../supabaseClient';

export async function getOpenFlags() {
  const { data, error } = await supabase
    .from('flags')
    .select(`
      id,
      reason,
      severity,
      created_at,
      membership:memberships!flags_membership_id_fkey (
        user:users!memberships_user_id_fkey (
          full_name
        ),
        thrift_group:thrift_groups!memberships_thrift_group_id_fkey (
          name
        )
      )
    `)
    .is('resolved_at', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getOpenFlagCount() {
  const { count, error } = await supabase
    .from('flags')
    .select('*', { count: 'exact', head: true })
    .is('resolved_at', null);

  if (error) throw error;
  return count;
}



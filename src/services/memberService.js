import { supabase } from '../supabaseClient';

export async function getMembers(contributionGroupId) {
  const { data, error } = await supabase
    .from('memberships')
    .select(`
      id,
      role,
      join_date,
      status,
      user:users (
        id,
        full_name,
        email,
        phone,
        kyc_status
      )
    `)
    .eq('contribution_group_id', contributionGroupId)
    .order('join_date', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getAllMembers() {
  const { data, error } = await supabase
    .from('memberships')
    .select(`
      id,
      role,
      join_date,
      status,
      user:users!memberships_user_id_fkey (
        id,
        full_name,
        email,
        phone,
        kyc_status
      )
    `)
    .order('join_date', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getMemberById(membershipId) {
  const { data, error } = await supabase
    .from('memberships')
    .select(`
      id,
      role,
      join_date,
      status,
      user:users (
        id,
        full_name,
        email,
        phone,
        date_of_birth,
        gender,
        kyc_status
      ),
      flags (
        id,
        reason,
        severity,
        created_at,
        resolved_at
      ),
      document_requests (
        id,
        type,
        status,
        requested_at,
        file_url
      )
    `)
    .eq('id', membershipId)
    .single();

  if (error) throw error;
  return data;
}

export async function getActiveMemberCount() {
  const { count, error } = await supabase
    .from('memberships')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');

  if (error) throw error;
  return count;
}

export async function getTotalMemberCount() {
  const { count, error } = await supabase
    .from('memberships')
    .select('*', { count: 'exact', head: true });

  if (error) throw error;
  return count;
}

export async function getMissedContributionsCount() {
  const { count, error } = await supabase
    .from('contributions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'defaulted');
  if (error) throw error;
  return count;
}

export async function getKycBreakdown() {
  const { data, error } = await supabase
    .from('memberships')
    .select(`user:users!memberships_user_id_fkey ( kyc_status )`);

  if (error) throw error;

  return data.reduce((acc, m) => {
    const status = m.user?.kyc_status ?? 'unverified';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
}

export async function getFlagSeverityBreakdown() {
  const { data, error } = await supabase
    .from('flags')
    .select('severity')
    .is('resolved_at', null);

  if (error) throw error;

  return data.reduce((acc, f) => {
    const s = f.severity ?? 'low';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});
}

export async function createMember({ fullName, email, phone, dateOfBirth, gender, contributionGroupId, role, joinDate, createdBy }) {
  // tenant_id is assigned by the database (column default reads the JWT claim).
  // NOTE: users has no created_by column — previously sent here, which broke this insert.

  // Step 1: Create the user record
  const { data: user, error: userError } = await supabase
    .from('users')
    .insert({
      full_name: fullName,
      email,
      phone: phone || null,
      date_of_birth: dateOfBirth || null,
      gender: gender || null,
    })
    .select()
    .single();

  if (userError) throw userError;

  // Step 2: Create the membership record linking user to contribution group
  const { data: membership, error: membershipError } = await supabase
    .from('memberships')
    .insert({
      user_id: user.id,
      contribution_group_id: contributionGroupId,
      role,
      join_date: joinDate,
      status: 'active',
      created_by: createdBy,
    })
    .select()
    .single();

  if (membershipError) throw membershipError;

  return { user, membership };
}

export async function getTopContributors(limit = 5) {
  const { data, error } = await supabase
    .from('memberships')
    .select(`
      id,
      user:users!memberships_user_id_fkey (
        full_name
      ),
      contributions!contributions_membership_id_fkey (
        amount_paid,
        status
      )
    `)
    .eq('status', 'active');

  if (error) throw error;

  // Aggregate per member, filter paid only, sort and slice
  const aggregated = data
    .map(m => ({
      full_name: m.user?.full_name ?? '—',
      cycles: m.contributions?.filter(c => c.status === 'paid').length ?? 0,
      total: m.contributions
        ?.filter(c => c.status === 'paid')
        .reduce((sum, c) => sum + parseFloat(c.amount_paid || 0), 0) ?? 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)

  return aggregated;
}

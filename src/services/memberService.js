import { supabase } from '../supabaseClient';

export async function getMembers(thriftGroupId) {
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
    .eq('thrift_group_id', thriftGroupId)
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

// memberService.js — replace getKycBreakdown
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

// memberService.js — replace getFlagSeverityBreakdown
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

export async function createMember({ fullName, email, phone, dateOfBirth, gender, thriftGroupId, role, joinDate, createdBy }) {
  const TENANT_ID = 'fb03c7b6-6d60-47aa-abd9-0d23fc765142';

  // Step 1: Create the user record
  const { data: user, error: userError } = await supabase
    .from('users')
    .insert({
      tenant_id: TENANT_ID,
      full_name: fullName,
      email,
      phone: phone || null,
      date_of_birth: dateOfBirth || null,
      gender: gender || null,
      created_by: createdBy,
    })
    .select()
    .single();

  if (userError) throw userError;

  // Step 2: Create the membership record linking user to thrift group
  const { data: membership, error: membershipError } = await supabase
    .from('memberships')
    .insert({
      tenant_id: TENANT_ID,
      user_id: user.id,
      thrift_group_id: thriftGroupId,
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




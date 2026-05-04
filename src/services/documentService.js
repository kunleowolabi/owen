import { supabase } from '../supabaseClient';

export async function getPendingDocumentRequests() {
  const { data, error } = await supabase
    .from('document_requests')
    .select(`
      id,
      type,
      status,
      requested_at,
      membership:memberships (
        user:users (
          full_name
        ),
        thrift_group:thrift_groups (
          name
        )
      )
    `)
    .eq('status', 'pending')
    .order('requested_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getPendingDocumentCount() {
  const { count, error } = await supabase
    .from('document_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  if (error) throw error;
  return count;
}

export async function getTotalDocumentCount() {
  const { count, error } = await supabase
    .from('document_requests')
    .select('*', { count: 'exact', head: true });

  if (error) throw error;
  return count;
}

export async function getResolvedDocumentCount() {
  const { count, error } = await supabase
    .from('document_requests')
    .select('*', { count: 'exact', head: true })
    .not('resolved_at', 'is', null);

  if (error) throw error;
  return count;
}

export async function getAllDocumentRequests() {
  const { data, error } = await supabase
    .from('document_requests')
    .select(`
      id,
      type,
      status,
      requested_at,
      file_url,
      membership:memberships (
        id,
        user:users (
          full_name,
          email
        ),
        thrift_group:thrift_groups (
          name
        )
      )
    `)
    .order('requested_at', { ascending: false });

  if (error) throw error;
  return data;
}
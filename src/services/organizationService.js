import { supabase } from '../supabaseClient';

export async function getOrganizations() {
  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, is_active')
    .order('name');
  if (error) throw error;
  return data;
}

export async function createOrganization({ name, createdBy }) {
  // tenant_id is assigned by the database (column default reads the JWT claim)
  const { data, error } = await supabase
    .from('organizations')
    .insert({
      name,
      created_by: createdBy,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

import { supabase } from '../supabaseClient';

const TENANT_ID = 'fb03c7b6-6d60-47aa-abd9-0d23fc765142';

export async function getOrganizations() {
  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, is_active')
    .order('name');
  if (error) throw error;
  return data;
}

export async function createOrganization({ name, createdBy }) {
  const { data, error } = await supabase
    .from('organizations')
    .insert({
      tenant_id: TENANT_ID,
      name,
      created_by: createdBy,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}
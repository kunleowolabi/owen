// Translates raw Supabase/Postgres errors into human-readable messages.
// Postgres error codes: 23505 unique_violation, 23503 foreign_key_violation,
// 23514 check_violation, 42501 insufficient_privilege / RLS denial.

const CONSTRAINT_MESSAGES = {
  contributions_membership_cycle_unique:
    'This member already has a contribution recorded for this cycle.',
  payouts_membership_cycle_unique:
    'A payout has already been recorded for this member in this cycle.',
  memberships_user_group_unique:
    'This person is already a member of this contribution group.',
  users_email_tenant_unique:
    'A member with this email address already exists.',
  cycles_group_number_unique:
    'A cycle with this number already exists for this contribution group.',
}

export function friendlyError(err) {
  if (!err) return 'Something went wrong. Please try again.'
  const message = err.message || ''
  const code = err.code || ''

  if (code === '23505' || message.includes('duplicate key value')) {
    for (const [constraint, friendly] of Object.entries(CONSTRAINT_MESSAGES)) {
      if (message.includes(constraint)) return friendly
    }
    return 'This record already exists.'
  }

  if (code === '42501' || message.includes('row-level security')) {
    return "You don't have permission to perform this action."
  }

  if (code === '23503' || message.includes('foreign key')) {
    return 'This record is linked to other data and cannot be changed this way.'
  }

  if (code === '23514' || message.includes('check constraint')) {
    return 'One of the values entered is not valid — check amounts and dates.'
  }

  if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
    return 'Connection problem — check your internet and try again.'
  }

  return message || 'Something went wrong. Please try again.'
}

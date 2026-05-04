import { useQuery } from '@tanstack/react-query';
import { getOrganizations } from '../services/organizationService';

export function useOrganizations() {
  return useQuery({ queryKey: ['organizations'], queryFn: getOrganizations });
}

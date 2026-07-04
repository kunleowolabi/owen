import { useQuery } from '@tanstack/react-query';
import { getContributionGroups } from '../services/groupService';

export function useContributionGroups() {
  return useQuery({ queryKey: ['contributionGroups'], queryFn: getContributionGroups });
}

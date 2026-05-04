import { useQuery } from '@tanstack/react-query';
import { getThriftGroups } from '../services/groupService';

export function useThriftGroups() {
  return useQuery({ queryKey: ['thriftGroups'], queryFn: getThriftGroups });
}

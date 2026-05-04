import { useQuery } from '@tanstack/react-query';
import {
  getMembers,
  getAllMembers,       // ← add this
  getMemberById,
  getActiveMemberCount,
  getTotalMemberCount,
  getMissedContributionsCount,
  getKycBreakdown,
  getFlagSeverityBreakdown,
  getTopContributors,
} from '../services/memberService';

export function useMembers(thriftGroupId) {
  return useQuery({
    queryKey: ['members', thriftGroupId],
    queryFn: () => getMembers(thriftGroupId),
    enabled: !!thriftGroupId,
  });
}

export function useMember(membershipId) {
  return useQuery({
    queryKey: ['member', membershipId],
    queryFn: () => getMemberById(membershipId),
    enabled: !!membershipId,
  });
}

export function useAllMembers() {
  return useQuery({ queryKey: ['allMembers'], queryFn: getAllMembers });
}

export function useTotalMemberCount() {
  return useQuery({ queryKey: ['totalMemberCount'], queryFn: getTotalMemberCount });
}

export function useMissedContributionsCount() {
  return useQuery({ queryKey: ['missedContributionsCount'], queryFn: getMissedContributionsCount });
}

export function useKycBreakdown() {
  return useQuery({ queryKey: ['kycBreakdown'], queryFn: getKycBreakdown });
}

export function useFlagSeverityBreakdown() {
  return useQuery({ queryKey: ['flagSeverityBreakdown'], queryFn: getFlagSeverityBreakdown });
}

export function useTopContributors(limit = 5) {
  return useQuery({
    queryKey: ['topContributors', limit],
    queryFn: () => getTopContributors(limit),
  });
}

import { useQuery } from '@tanstack/react-query';
import { getActiveMemberCount } from '../services/memberService';
import { getActiveCycles, getActiveCycleCount } from '../services/cycleService';
import { getTotalContributions, getPendingContributionsCount, getRecentContributions } from '../services/contributionService';
import { getOpenFlagCount } from '../services/flagService';
import { getPendingDocumentCount } from '../services/documentService';

export function useActiveMemberCount() {
  return useQuery({ queryKey: ['activeMemberCount'], queryFn: getActiveMemberCount });
}

export function useActiveCycleCount() {
  return useQuery({ queryKey: ['activeCycleCount'], queryFn: getActiveCycleCount });
}

export function useActiveCycles() {
  return useQuery({ queryKey: ['activeCycles'], queryFn: getActiveCycles });
}

export function useTotalContributions() {
  return useQuery({ queryKey: ['totalContributions'], queryFn: getTotalContributions });
}

export function usePendingContributionsCount() {
  return useQuery({ queryKey: ['pendingContributionsCount'], queryFn: getPendingContributionsCount });
}

export function useOpenFlagCount() {
  return useQuery({ queryKey: ['openFlagCount'], queryFn: getOpenFlagCount });
}

export function usePendingDocumentCount() {
  return useQuery({ queryKey: ['pendingDocumentCount'], queryFn: getPendingDocumentCount });
}

export function useRecentContributions(limit = 10) {
  return useQuery({ queryKey: ['recentContributions', limit], queryFn: () => getRecentContributions(limit) });
}
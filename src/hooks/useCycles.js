import { useQuery } from '@tanstack/react-query';
import { getCycles, getActiveCycles, getActiveCycleCount, getTotalCycleCount, getAllCycles, getContributionCompliance } from '../services/cycleService';
import { getContributionsByCycle } from '../services/contributionService';
import { getPayoutsByCycle } from '../services/payoutService';

export function useCycles(thriftGroupId) {
  return useQuery({
    queryKey: ['cycles', thriftGroupId],
    queryFn: () => getCycles(thriftGroupId),
    enabled: !!thriftGroupId,
  });
}

export function useActiveCycles() {
  return useQuery({ queryKey: ['activeCycles'], queryFn: getActiveCycles });
}

export function useActiveCycleCount() {
  return useQuery({ queryKey: ['activeCycleCount'], queryFn: getActiveCycleCount });
}

export function useTotalCycleCount() {
  return useQuery({ queryKey: ['totalCycleCount'], queryFn: getTotalCycleCount });
}

export function useAllCycles() {
  return useQuery({ queryKey: ['allCycles'], queryFn: getAllCycles });
}

export function useContributionCompliance() {
  return useQuery({ queryKey: ['contributionCompliance'], queryFn: getContributionCompliance });
}

export function useCycleContributions(cycleId) {
  return useQuery({
    queryKey: ['cycleContributions', cycleId],
    queryFn: () => getContributionsByCycle(cycleId),
    enabled: !!cycleId,
  });
}

export function useCyclePayouts(cycleId) {
  return useQuery({
    queryKey: ['cyclePayouts', cycleId],
    queryFn: () => getPayoutsByCycle(cycleId),
    enabled: !!cycleId,
  });
}

import { useQuery } from '@tanstack/react-query';
import {
  getTotalDocumentCount,
  getPendingDocumentCount,
  getResolvedDocumentCount,
  getAllDocumentRequests,
} from '../services/documentService';

export function useTotalDocumentCount() {
  return useQuery({ queryKey: ['totalDocumentCount'], queryFn: getTotalDocumentCount });
}

export function usePendingDocumentCount() {
  return useQuery({ queryKey: ['pendingDocumentCount'], queryFn: getPendingDocumentCount });
}

export function useResolvedDocumentCount() {
  return useQuery({ queryKey: ['resolvedDocumentCount'], queryFn: getResolvedDocumentCount });
}

export function useAllDocumentRequests() {
  return useQuery({ queryKey: ['allDocumentRequests'], queryFn: getAllDocumentRequests });
}

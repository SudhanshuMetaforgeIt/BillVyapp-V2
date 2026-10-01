'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import type { ApiError } from '@/types/api.types';
import {
  downloadPlatformReport,
  generatePlatformReport,
  type GenerateReportPayload,
} from '../services/reports.service';
import type { ReportListRow } from '../types/reports.types';
import { REPORTS_QUERY_KEY } from './use-reports';

export function useGenerateReport() {
  const queryClient = useQueryClient();
  return useMutation<ReportListRow, ApiError, GenerateReportPayload>({
    mutationFn: generatePlatformReport,
    onSuccess: (row) => {
      toast.success(`${row.name} generated`);
      void queryClient.invalidateQueries({ queryKey: REPORTS_QUERY_KEY });
    },
    onError: (error) => toast.error(error.message),
  });
}

export function useDownloadReport() {
  return useMutation<void, ApiError, { id: string; name: string }>({
    mutationFn: ({ id }) => downloadPlatformReport(id),
    onSuccess: (_data, variables) => {
      toast.success(`${variables.name} downloaded`);
    },
    onError: (error) => toast.error(error.message),
  });
}

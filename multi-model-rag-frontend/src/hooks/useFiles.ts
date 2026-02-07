import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fileApi } from '../services/api';
import type { FilesListResponse } from '../types';

export function useFiles() {
  return useQuery<FilesListResponse>({
    queryKey: ['files'],
    queryFn: fileApi.getFiles,
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });
}

export function useFileUpload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: fileApi.uploadFiles,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });
}

export function useFileDelete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: fileApi.deleteFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });
}

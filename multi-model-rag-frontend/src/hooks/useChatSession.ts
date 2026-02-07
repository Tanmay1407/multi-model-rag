import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatApi } from '../services/api';
import type { SessionsListResponse, ChatHistoryResponse, CreateSessionRequest, ChatQueryRequest } from '../types';

export function useChatSessions() {
  return useQuery<SessionsListResponse>({
    queryKey: ['chat-sessions'],
    queryFn: chatApi.getSessions,
  });
}

export function useCreateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSessionRequest) => chatApi.createSession(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
    },
  });
}

export function useChatHistory(sessionId: string | null) {
  return useQuery<ChatHistoryResponse>({
    queryKey: ['chat-history', sessionId],
    queryFn: () => chatApi.getSessionHistory(sessionId!),
    enabled: !!sessionId,
  });
}

export function useSendQuery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ChatQueryRequest) => chatApi.sendQuery(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chat-history', variables.session_id] });
    },
  });
}

export function useDeleteSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: chatApi.deleteSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
    },
  });
}

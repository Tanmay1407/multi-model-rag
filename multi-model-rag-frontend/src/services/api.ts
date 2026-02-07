import axios from 'axios';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import type {
  UploadResponse,
  FilesListResponse,
  FileData,
  PipelineStartResponse,
  CollectionsResponse,
  ChatSession,
  CreateSessionRequest,
  QueryMessage,
  ChatQueryRequest,
  ChatHistoryResponse,
  SessionsListResponse,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// File Management API
export const fileApi = {
  uploadFiles: async (files: FileList): Promise<UploadResponse> => {
    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append('files', file);
    });

    const response = await api.post<UploadResponse>('/upload/files', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getFiles: async (): Promise<FilesListResponse> => {
    const response = await api.get<FilesListResponse>('/upload/files');
    return response.data;
  },

  getFile: async (fileId: string): Promise<FileData> => {
    const response = await api.get<FileData>(`/upload/files/${fileId}`);
    return response.data;
  },

  deleteFile: async (fileId: string): Promise<void> => {
    await api.delete(`/upload/files/${fileId}`);
  },
};

// Pipeline API
export const pipelineApi = {
  startPipeline: async (fileIds: string[], collectionName?: string): Promise<PipelineStartResponse> => {
    const response = await api.post<PipelineStartResponse>('/pipeline/start', {
      file_ids: fileIds,
      collection_name: collectionName,
    });
    return response.data;
  },

  getCollections: async (): Promise<CollectionsResponse> => {
    const response = await api.get<CollectionsResponse>('/pipeline/collections');
    return response.data;
  },

  // SSE connection for pipeline status using fetch-event-source (supports headers)
  streamPipelineStatus: (
    pipelineId: string,
    onMessage: (data: any) => void,
    onError: (err: any) => void,
    onOpen?: () => void
  ) => {
    const token = localStorage.getItem('access_token');
    const url = `${API_BASE_URL}/pipeline/status/${pipelineId}/stream`;
    
    const ctrl = new AbortController();
    
    fetchEventSource(url, {
      signal: ctrl.signal,
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      onopen: async (response) => {
        if (response.ok) {
          onOpen?.();
        } else if (response.status === 401) {
          // Unauthorized - clear token and redirect
          localStorage.removeItem('access_token');
          localStorage.removeItem('user');
          window.location.href = '/login';
          throw new Error('Unauthorized');
        } else {
          throw new Error(`Connection failed: ${response.status}`);
        }
      },
      onmessage: (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (err) {
          console.error('Error parsing SSE message:', err);
        }
      },
      onerror: (err) => {
        onError(err);
        throw err; // Rethrow to stop reconnection
      },
    });
    
    // Return abort function
    return () => ctrl.abort();
  },
};

// Chat API
export const chatApi = {
  createSession: async (data: CreateSessionRequest): Promise<ChatSession> => {
    const response = await api.post<ChatSession>('/chat/sessions', data);
    return response.data;
  },

  sendQuery: async (data: ChatQueryRequest): Promise<QueryMessage> => {
    const response = await api.post<QueryMessage>('/chat/query', data);
    return response.data;
  },

  getSessions: async (): Promise<SessionsListResponse> => {
    const response = await api.get<SessionsListResponse>('/chat/sessions');
    return response.data;
  },

  getSessionHistory: async (sessionId: string): Promise<ChatHistoryResponse> => {
    const response = await api.get<ChatHistoryResponse>(`/chat/sessions/${sessionId}/history`);
    return response.data;
  },

  deleteSession: async (sessionId: string): Promise<void> => {
    await api.delete(`/chat/sessions/${sessionId}`);
  },
};

export default api;

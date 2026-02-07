import { useState, useEffect, useCallback } from 'react';
import { pipelineApi } from '../services/api';
import type { PipelineStatus } from '../types';

export function usePipelineStream(pipelineId: string | null) {
  const [status, setStatus] = useState<PipelineStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!pipelineId) {
      setStatus(null);
      setIsConnected(false);
      return;
    }

    let abortStream: (() => void) | null = null;

    try {
      abortStream = pipelineApi.streamPipelineStatus(
        pipelineId,
        (data: PipelineStatus) => {
          setStatus(data);
          
          // Close connection when pipeline is completed or failed
          if (data.status === 'completed' || data.status === 'failed') {
            abortStream?.();
            setIsConnected(false);
          }
        },
        (err: any) => {
          console.error('SSE connection error:', err);
          setError('Connection lost');
          setIsConnected(false);
        },
        () => {
          setIsConnected(true);
          setError(null);
        }
      );
    } catch (err) {
      setError('Failed to connect to pipeline stream');
      console.error('Error creating SSE connection:', err);
    }

    return () => {
      abortStream?.();
      setIsConnected(false);
    };
  }, [pipelineId]);

  return { status, error, isConnected };
}

export function useStartPipeline() {
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startPipeline = useCallback(async (fileIds: string[], collectionName?: string) => {
    setIsStarting(true);
    setError(null);
    
    try {
      const result = await pipelineApi.startPipeline(fileIds, collectionName);
      return result;
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to start pipeline';
      setError(errorMessage);
      throw err;
    } finally {
      setIsStarting(false);
    }
  }, []);

  return { startPipeline, isStarting, error };
}

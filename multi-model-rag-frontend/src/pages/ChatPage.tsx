import { useState, useEffect } from 'react';
import { ChatSidebar } from '../components/chat/ChatSidebar';
import { ChatWindow } from '../components/chat/ChatWindow';
import { FileSelector } from '../components/chat/FileSelector';
import { useChatSessions, useCreateSession, useChatHistory, useSendQuery, useDeleteSession } from '../hooks/useChatSession';
import { useFiles } from '../hooks/useFiles';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import type { MessageHistory } from '../types';

export function ChatPage() {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [showFileSelector, setShowFileSelector] = useState(false);

  const { data: sessionsData } = useChatSessions();
  const { data: filesData } = useFiles();
  const createSessionMutation = useCreateSession();
  const { data: historyData, isLoading: isLoadingHistory } = useChatHistory(activeSessionId);
  const sendQueryMutation = useSendQuery();
  const deleteSessionMutation = useDeleteSession();

  const sessions = sessionsData?.sessions || [];
  const files = filesData?.files || [];
  const messages: MessageHistory[] = historyData?.messages || [];

  // Auto-select first session if available and none selected
  useEffect(() => {
    if (!activeSessionId && sessions.length > 0) {
      setActiveSessionId(sessions[0].session_id);
    }
  }, [sessions, activeSessionId]);

  const handleNewSession = () => {
    setShowFileSelector(true);
    setSelectedFileIds([]);
  };

  const handleCreateSession = async () => {
    if (selectedFileIds.length === 0) {
      alert('Please select at least one file');
      return;
    }

    try {
      const session = await createSessionMutation.mutateAsync({
        file_ids: selectedFileIds,
      });
      setActiveSessionId(session.session_id);
      setShowFileSelector(false);
      setSelectedFileIds([]);
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to create session');
    }
  };

  const handleSendMessage = async (query: string) => {
    if (!activeSessionId) return;

    try {
      await sendQueryMutation.mutateAsync({
        session_id: activeSessionId,
        query,
      });
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to send query');
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await deleteSessionMutation.mutateAsync(sessionId);
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
      }
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to delete session');
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] -m-6">
      <ChatSidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={setActiveSessionId}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
      />

      {showFileSelector ? (
        <div className="flex-1 flex items-center justify-center bg-gray-50 p-8">
          <div className="max-w-md w-full">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Chat Session</h2>
            <FileSelector
              files={files}
              selectedFileIds={selectedFileIds}
              onChange={setSelectedFileIds}
            />
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleCreateSession}
                disabled={selectedFileIds.length === 0 || createSessionMutation.isPending}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {createSessionMutation.isPending ? (
                  <>
                    <LoadingSpinner size="sm" className="text-white" />
                    Creating...
                  </>
                ) : (
                  'Create Session'
                )}
              </button>
              <button
                onClick={() => setShowFileSelector(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : isLoadingHistory ? (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <ChatWindow
          messages={messages}
          onSendMessage={handleSendMessage}
          isSending={sendQueryMutation.isPending}
          sessionId={activeSessionId}
        />
      )}
    </div>
  );
}

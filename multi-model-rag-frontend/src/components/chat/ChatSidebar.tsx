import React, { useState, useEffect } from 'react';
import { Plus, MessageSquare, Trash2 } from 'lucide-react';
import { formatRelativeTime } from '../../utils/formatters';
import type { ChatSession } from '../../types';

interface ChatSidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
}

export function ChatSidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
}: ChatSidebarProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, setTick] = useState(0);

  // Update relative times every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(tick => tick + 1);
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const handleDelete = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Delete this chat session?')) {
      setDeletingId(sessionId);
      try {
        await onDeleteSession(sessionId);
      } finally {
        setDeletingId(null);
      }
    }
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-[calc(100vh-4rem)]">
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={onNewSession}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Session
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sessions.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">
            No chat sessions yet
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {sessions.map((session) => (
              <div
                key={session.session_id}
                onClick={() => onSelectSession(session.session_id)}
                className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                  activeSessionId === session.session_id
                    ? 'bg-blue-50 border border-primary'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <MessageSquare className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {session.session_name || 'Chat Session'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {session.file_ids.length} files • {formatRelativeTime(session.created_at)}
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={(e) => handleDelete(session.session_id, e)}
                  disabled={deletingId === session.session_id}
                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

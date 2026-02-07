import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { User, Bot } from 'lucide-react';
import { formatDate } from '../../utils/formatters';
import type { MessageHistory } from '../../types';

interface MessageBubbleProps {
  message: MessageHistory;
  isUser?: boolean;
}

export function MessageBubble({ message, isUser = false }: MessageBubbleProps) {
  const [, setTick] = useState(0);

  // Update timestamps every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(tick => tick + 1);
    }, 60000);

    return () => clearInterval(interval);
  }, []);
  if (isUser) {
    return (
      <div className="flex justify-end mb-4">
        <div className="flex items-start gap-2 max-w-[80%]">
          <div className="bg-primary text-white rounded-lg px-4 py-3">
            <p className="text-sm">{message.query}</p>
            <p className="text-xs opacity-75 mt-1">{formatDate(message.timestamp)}</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-4">
      <div className="flex items-start gap-2 max-w-[80%]">
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
          <Bot className="w-4 h-4 text-gray-600" />
        </div>
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown>{message.answer}</ReactMarkdown>
          </div>
          
          {message.sources_count > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                {message.sources_count} source{message.sources_count !== 1 ? 's' : ''} used
              </p>
            </div>
          )}
          
          <p className="text-xs text-gray-400 mt-2">
            {formatDate(message.timestamp)}
          </p>
        </div>
      </div>
    </div>
  );
}

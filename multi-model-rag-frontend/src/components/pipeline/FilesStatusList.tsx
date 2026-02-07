import { useState, useEffect } from 'react';
import { FileText, CheckCircle, Loader2, XCircle, Clock, ChevronRight } from 'lucide-react';
import { formatDate, formatFileSize } from '../../utils/formatters';
import type { FileData } from '../../types';

interface FilesStatusListProps {
  files: FileData[];
  onFileClick: (fileId: string) => void;
}

export function FilesStatusList({ files, onFileClick }: FilesStatusListProps) {
  const [, setTick] = useState(0);

  // Update relative times every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(tick => tick + 1);
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'uploaded':
        return <Clock className="w-5 h-5 text-gray-400" />;
      default:
        return <Loader2 className="w-5 h-5 text-primary animate-spin" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'bg-green-50 border-green-200 text-green-700';
      case 'failed':
        return 'bg-red-50 border-red-200 text-red-700';
      case 'uploaded':
        return 'bg-gray-50 border-gray-200 text-gray-600';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'uploaded':
        return 'Pending';
      case 'partitioning':
        return 'Partitioning...';
      case 'chunking':
        return 'Chunking...';
      case 'ai_enhancement':
        return 'AI Enhancement...';
      case 'vector_creation':
        return 'Creating Vectors...';
      case 'ready':
        return 'Completed';
      case 'failed':
        return 'Failed';
      default:
        return status;
    }
  };

  const processingFiles = files.filter(f => 
    ['partitioning', 'chunking', 'ai_enhancement', 'vector_creation'].includes(f.current_step)
  );
  const readyFiles = files.filter(f => f.current_step === 'ready');
  const pendingFiles = files.filter(f => f.current_step === 'uploaded');
  const failedFiles = files.filter(f => f.current_step === 'failed');

  if (files.length === 0) {
    return (
      <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500">No files uploaded yet</p>
        <p className="text-sm text-gray-400 mt-1">Upload files to see their processing status</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Processing Files */}
      {processingFiles.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
            Processing ({processingFiles.length})
          </h2>
          <div className="space-y-3">
            {processingFiles.map((file) => (
              <button
                key={file.file_id}
                onClick={() => onFileClick(file.file_id)}
                className="w-full flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 flex-1">
                  {getStatusIcon(file.current_step)}
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-medium text-gray-900 truncate">{file.filename}</p>
                    <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                      <span>{formatFileSize(file.size)}</span>
                      <span>•</span>
                      <span>{formatDate(file.uploaded_at)}</span>
                      {file.collection_name && (
                        <>
                          <span>•</span>
                          <span className="text-blue-600">{file.collection_name}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(file.current_step)}`}>
                    {getStatusLabel(file.current_step)}
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Completed Files */}
      {readyFiles.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            Completed ({readyFiles.length})
          </h2>
          <div className="space-y-3">
            {readyFiles.map((file) => (
              <button
                key={file.file_id}
                onClick={() => onFileClick(file.file_id)}
                className="w-full flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 flex-1">
                  {getStatusIcon(file.current_step)}
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-medium text-gray-900 truncate">{file.filename}</p>
                    <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                      <span>{formatFileSize(file.size)}</span>
                      <span>•</span>
                      <span>{formatDate(file.updated_at)}</span>
                      {file.collection_name && (
                        <>
                          <span>•</span>
                          <span className="text-green-600">{file.collection_name}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(file.current_step)}`}>
                    {getStatusLabel(file.current_step)}
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Pending Files */}
      {pendingFiles.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-400" />
            Pending ({pendingFiles.length})
          </h2>
          <div className="space-y-3">
            {pendingFiles.map((file) => (
              <button
                key={file.file_id}
                onClick={() => onFileClick(file.file_id)}
                className="w-full flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 flex-1">
                  {getStatusIcon(file.current_step)}
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-medium text-gray-900 truncate">{file.filename}</p>
                    <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                      <span>{formatFileSize(file.size)}</span>
                      <span>•</span>
                      <span>{formatDate(file.uploaded_at)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(file.current_step)}`}>
                    {getStatusLabel(file.current_step)}
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Failed Files */}
      {failedFiles.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-500" />
            Failed ({failedFiles.length})
          </h2>
          <div className="space-y-3">
            {failedFiles.map((file) => (
              <button
                key={file.file_id}
                onClick={() => onFileClick(file.file_id)}
                className="w-full flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 flex-1">
                  {getStatusIcon(file.current_step)}
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-medium text-gray-900 truncate">{file.filename}</p>
                    <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                      <span>{formatFileSize(file.size)}</span>
                      <span>•</span>
                      <span>{formatDate(file.uploaded_at)}</span>
                    </div>
                    {file.error && (
                      <p className="text-xs text-red-600 mt-2">{file.error}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(file.current_step)}`}>
                    {getStatusLabel(file.current_step)}
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


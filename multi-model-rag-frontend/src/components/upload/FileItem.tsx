import { useState, useEffect } from 'react';
import { FileText, Trash2 } from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal';
import { formatFileSize, formatRelativeTime } from '../../utils/formatters';
import type { FileData } from '../../types';

interface FileItemProps {
  file: FileData;
  onDelete: (fileId: string) => void;
  isDeleting?: boolean;
}

export function FileItem({ file, onDelete, isDeleting = false }: FileItemProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [, setTick] = useState(0);

  // Update relative time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(tick => tick + 1);
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const handleDelete = () => {
    onDelete(file.file_id);
    setShowDeleteModal(false);
  };

  return (
    <>
      <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <FileText className="w-8 h-8 text-red-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900 truncate">
              {file.filename}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              {formatFileSize(file.size)} • {formatRelativeTime(file.uploaded_at)}
            </p>
            {file.error && (
              <p className="text-xs text-red-600 mt-1">
                Error: {file.error}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3 ml-4">
          <StatusBadge status={file.current_step} />
          <button
            onClick={() => setShowDeleteModal(true)}
            disabled={isDeleting}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
            aria-label="Delete file"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete File"
        message={`Are you sure you want to delete "${file.filename}"? This will also delete all associated data.`}
        isDeleting={isDeleting}
      />
    </>
  );
}

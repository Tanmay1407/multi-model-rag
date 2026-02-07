import type { FileStatus } from '../../types';

interface StatusBadgeProps {
  status: FileStatus;
}

const statusConfig: Record<FileStatus, { color: string; label: string }> = {
  uploaded: { color: 'bg-blue-100 text-blue-800', label: 'Uploaded' },
  partitioning: { color: 'bg-yellow-100 text-yellow-800', label: 'Partitioning' },
  chunking: { color: 'bg-orange-100 text-orange-800', label: 'Chunking' },
  ai_enhancement: { color: 'bg-purple-100 text-purple-800', label: 'AI Enhancement' },
  vector_creation: { color: 'bg-indigo-100 text-indigo-800', label: 'Vector Creation' },
  ready: { color: 'bg-green-100 text-green-800', label: 'Ready' },
  failed: { color: 'bg-red-100 text-red-800', label: 'Failed' },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}

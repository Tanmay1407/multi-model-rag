import { FileItem } from './FileItem';
import type { FileData } from '../../types';

interface FileListProps {
  files: FileData[];
  onDeleteFile: (fileId: string) => void;
  deletingFileId?: string | null;
}

export function FileList({ files, onDeleteFile, deletingFileId }: FileListProps) {
  if (files.length === 0) {
    return (
      <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
        <p className="text-gray-500">No files uploaded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {files.map((file) => (
        <FileItem
          key={file.file_id}
          file={file}
          onDelete={onDeleteFile}
          isDeleting={deletingFileId === file.file_id}
        />
      ))}
    </div>
  );
}

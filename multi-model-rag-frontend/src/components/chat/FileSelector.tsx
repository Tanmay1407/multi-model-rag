import type { FileData } from '../../types';

interface FileSelectorProps {
  files: FileData[];
  selectedFileIds: string[];
  onChange: (fileIds: string[]) => void;
}

export function FileSelector({ files, selectedFileIds, onChange }: FileSelectorProps) {
  const readyFiles = files.filter(f => f.current_step === 'ready' && !f.error);

  const handleToggle = (fileId: string) => {
    if (selectedFileIds.includes(fileId)) {
      onChange(selectedFileIds.filter(id => id !== fileId));
    } else {
      onChange([...selectedFileIds, fileId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedFileIds.length === readyFiles.length) {
      onChange([]);
    } else {
      onChange(readyFiles.map(f => f.file_id));
    }
  };

  if (readyFiles.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          No files ready for chat. Please upload and process files first.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900">Select Files</h3>
        <button
          onClick={handleSelectAll}
          className="text-xs text-primary hover:text-blue-700"
        >
          {selectedFileIds.length === readyFiles.length ? 'Deselect All' : 'Select All'}
        </button>
      </div>
      
      <div className="space-y-2 max-h-40 overflow-y-auto">
        {readyFiles.map((file) => (
          <label
            key={file.file_id}
            className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selectedFileIds.includes(file.file_id)}
              onChange={() => handleToggle(file.file_id)}
              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <span className="text-sm text-gray-700 truncate">{file.filename}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

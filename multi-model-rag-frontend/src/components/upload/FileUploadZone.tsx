import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText } from 'lucide-react';
import { isValidFileType, isValidFileSize, formatFileSize } from '../../utils/formatters';

interface FileUploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  isUploading?: boolean;
}

const MAX_FILE_SIZE = 52428800; // 50MB

export function FileUploadZone({ onFilesSelected, isUploading = false }: FileUploadZoneProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const validFiles = acceptedFiles.filter(file => {
      if (!isValidFileType(file)) {
        alert(`${file.name} is not a valid PDF file`);
        return false;
      }
      if (!isValidFileSize(file, MAX_FILE_SIZE)) {
        alert(`${file.name} exceeds the maximum file size of ${formatFileSize(MAX_FILE_SIZE)}`);
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
    }
  }, [onFilesSelected]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    multiple: true,
    disabled: isUploading,
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
        isDragActive
          ? 'border-primary bg-blue-50'
          : 'border-gray-300 hover:border-gray-400'
      } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-4">
        {isDragActive ? (
          <FileText className="w-16 h-16 text-primary" />
        ) : (
          <Upload className="w-16 h-16 text-gray-400" />
        )}
        <div>
          <p className="text-lg font-medium text-gray-900">
            {isDragActive ? 'Drop files here' : 'Drag & drop PDF files here'}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            or click to browse (Max: {formatFileSize(MAX_FILE_SIZE)} per file)
          </p>
        </div>
      </div>
    </div>
  );
}

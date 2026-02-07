import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileUploadZone } from '../components/upload/FileUploadZone';
import { FileList } from '../components/upload/FileList';
import { useFiles, useFileUpload, useFileDelete } from '../hooks/useFiles';
import { useStartPipeline } from '../hooks/usePipelineStream';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Upload as UploadIcon } from 'lucide-react';

export function UploadPage() {
  const navigate = useNavigate();
  const { data: filesData, isLoading } = useFiles();
  const uploadMutation = useFileUpload();
  const deleteMutation = useFileDelete();
  const { startPipeline, isStarting } = useStartPipeline();
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);

  const handleFilesSelected = async (files: File[]) => {
    // Convert File[] to FileList-like structure
    const dt = new DataTransfer();
    files.forEach(file => dt.items.add(file));
    try {
      await uploadMutation.mutateAsync(dt.files);
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to upload files');
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    setDeletingFileId(fileId);
    try {
      await deleteMutation.mutateAsync(fileId);
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to delete file');
    } finally {
      setDeletingFileId(null);
    }
  };

  const handleStartPipeline = async () => {
    const uploadedFileIds = files
      .filter(f => f.current_step === 'uploaded')
      .map(f => f.file_id);
    
    if (uploadedFileIds.length === 0) {
      alert('No files ready to process');
      return;
    }

    try {
      const result = await startPipeline(uploadedFileIds);
      navigate(`/pipeline?id=${result.pipeline_id}`);
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to start pipeline');
    }
  };

  const files = filesData?.files || [];
  const hasUploadedFiles = files.some(f => f.current_step === 'uploaded');
  const hasProcessingFiles = files.some(f => 
    ['partitioning', 'chunking', 'ai_enhancement', 'vector_creation'].includes(f.current_step)
  );

  return (
    <div className="px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <UploadIcon className="w-6 h-6" />
          Upload Files
        </h1>
        <p className="text-gray-600 mt-1">Upload PDF files to process with the RAG pipeline</p>
      </div>

      <div className="space-y-6">
        <FileUploadZone
          onFilesSelected={handleFilesSelected}
          isUploading={uploadMutation.isPending}
        />

        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <>
            <FileList
              files={files}
              onDeleteFile={handleDeleteFile}
              deletingFileId={deletingFileId}
            />

            {hasUploadedFiles && !hasProcessingFiles && (
              <div className="flex justify-end">
                <button
                  onClick={handleStartPipeline}
                  disabled={isStarting}
                  className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isStarting ? (
                    <>
                      <LoadingSpinner size="sm" className="text-white" />
                      Starting Pipeline...
                    </>
                  ) : (
                    'Start Pipeline'
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

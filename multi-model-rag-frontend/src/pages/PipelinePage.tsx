import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { usePipelineStream } from '../hooks/usePipelineStream';
import { useFiles } from '../hooks/useFiles';
import { PipelineProgress } from '../components/pipeline/PipelineProgress';
import { FilesStatusList } from '../components/pipeline/FilesStatusList';
import { FileProgress } from '../components/pipeline/FileProgress';
import { Activity, ArrowLeft } from 'lucide-react';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export function PipelinePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const pipelineId = searchParams.get('id');
  const fileId = searchParams.get('file');
  
  const { status, error, isConnected } = usePipelineStream(pipelineId);
  const { data: filesData, isLoading: isLoadingFiles } = useFiles();

  useEffect(() => {
    if (status?.status === 'completed') {
      setTimeout(() => {
        if (window.confirm('Pipeline completed! Would you like to go to the chat page?')) {
          navigate('/chat');
        }
      }, 1000);
    }
  }, [status?.status, navigate]);

  const files = filesData?.files || [];
  const selectedFile = fileId ? files.find(f => f.file_id === fileId) : null;

  const handleFileClick = (clickedFileId: string) => {
    navigate(`/pipeline?file=${clickedFileId}`);
  };

  const handleBackToList = () => {
    navigate('/pipeline');
  };

  return (
    <div className="px-4 py-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Activity className="w-6 h-6" />
              Pipeline Status
            </h1>
            <p className="text-gray-600 mt-1">
              {pipelineId 
                ? 'Monitor real-time processing of your documents' 
                : fileId
                ? 'View file processing details'
                : 'View all files and their processing status'}
            </p>
          </div>
          <button
            onClick={() => fileId ? handleBackToList() : navigate('/upload')}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {fileId ? 'Back to List' : 'Back to Upload'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {pipelineId ? (
        <>
          {!isConnected && !status && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 text-sm">Connecting to pipeline stream...</p>
            </div>
          )}

          <PipelineProgress status={status} isConnected={isConnected} />

          {status?.status === 'failed' && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="font-medium text-red-900 mb-2">Pipeline Failed</h3>
              <p className="text-red-700 text-sm">An error occurred during pipeline processing.</p>
              <button
                onClick={() => navigate('/upload')}
                className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Return to Upload
              </button>
            </div>
          )}
        </>
      ) : fileId ? (
        <>
          {isLoadingFiles ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : selectedFile ? (
            <FileProgress file={selectedFile} />
          ) : (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 text-sm">File not found</p>
            </div>
          )}
        </>
      ) : (
        <>
          {isLoadingFiles ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <FilesStatusList files={files} onFileClick={handleFileClick} />
          )}
        </>
      )}
    </div>
  );
}

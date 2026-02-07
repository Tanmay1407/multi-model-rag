import { CheckCircle, XCircle, Loader2, FileText } from 'lucide-react';
import { PipelineSteps } from './StepIndicator';
import { formatDate, formatFileSize } from '../../utils/formatters';
import type { FileData } from '../../types';

interface FileProgressProps {
  file: FileData;
}

export function FileProgress({ file }: FileProgressProps) {
  const getOverallStatus = (currentStep: string): string => {
    if (currentStep === 'ready') return 'completed';
    if (currentStep === 'failed') return 'failed';
    if (currentStep === 'uploaded') return 'pending';
    return 'processing';
  };

  const getPercentage = (currentStep: string): number => {
    const steps = ['uploaded', 'partitioning', 'chunking', 'ai_enhancement', 'vector_creation', 'ready'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex === -1) return 0;
    if (currentStep === 'ready') return 100;
    return Math.round((currentIndex / (steps.length - 1)) * 100);
  };

  const status = getOverallStatus(file.current_step);
  const percentage = getPercentage(file.current_step);

  return (
    <div className="space-y-6">
      {/* File Info Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 truncate">{file.filename}</h2>
            <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
              <span>{formatFileSize(file.size)}</span>
              <span>•</span>
              <span>Uploaded {formatDate(file.uploaded_at)}</span>
              {file.collection_name && (
                <>
                  <span>•</span>
                  <span className="text-primary font-medium">{file.collection_name}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {status === 'processing' && (
              <>
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                <span className="text-sm text-gray-600">Processing...</span>
              </>
            )}
            {status === 'completed' && (
              <>
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm text-green-600">Completed</span>
              </>
            )}
            {status === 'failed' && (
              <>
                <XCircle className="w-5 h-5 text-red-500" />
                <span className="text-sm text-red-600">Failed</span>
              </>
            )}
            {status === 'pending' && (
              <>
                <span className="text-sm text-gray-500">Pending</span>
              </>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Overall Progress</span>
            <span>{percentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                status === 'completed'
                  ? 'bg-green-500'
                  : status === 'failed'
                  ? 'bg-red-500'
                  : 'bg-primary'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {file.error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm font-medium text-red-800 mb-1">Error:</p>
            <p className="text-xs text-red-700">{file.error}</p>
          </div>
        )}
      </div>

      {/* Pipeline Steps */}
      <PipelineSteps currentStep={file.current_step} status={status} />
    </div>
  );
}

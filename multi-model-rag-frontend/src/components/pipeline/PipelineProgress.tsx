import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { PipelineSteps } from './StepIndicator';
import type { PipelineStatus } from '../../types';

interface PipelineProgressProps {
  status: PipelineStatus | null;
  isConnected: boolean;
}

export function PipelineProgress({ status, isConnected }: PipelineProgressProps) {
  if (!status) {
    return (
      <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
        <p className="text-gray-500">No active pipeline</p>
      </div>
    );
  }

  const { current_step, current_file, files_completed, total_files, percentage, status: pipelineStatus } = status;

  return (
    <div className="space-y-6">
      {/* Status Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Pipeline Progress</h2>
          <div className="flex items-center gap-2">
            {pipelineStatus === 'processing' && isConnected && (
              <>
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                <span className="text-sm text-gray-600">Processing...</span>
              </>
            )}
            {pipelineStatus === 'completed' && (
              <>
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm text-green-600">Completed</span>
              </>
            )}
            {pipelineStatus === 'failed' && (
              <>
                <XCircle className="w-5 h-5 text-red-500" />
                <span className="text-sm text-red-600">Failed</span>
              </>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Overall Progress</span>
            <span>{Math.round(percentage)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                pipelineStatus === 'completed'
                  ? 'bg-green-500'
                  : pipelineStatus === 'failed'
                  ? 'bg-red-500'
                  : 'bg-primary'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Current File Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Current File:</span>
            <p className="font-medium text-gray-900 truncate">{current_file || 'N/A'}</p>
          </div>
          <div>
            <span className="text-gray-500">Files Completed:</span>
            <p className="font-medium text-gray-900">
              {files_completed} / {total_files}
            </p>
          </div>
        </div>
      </div>

      {/* Pipeline Steps */}
      <PipelineSteps currentStep={current_step} status={pipelineStatus} />
    </div>
  );
}

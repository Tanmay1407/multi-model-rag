import { Check, Loader2 } from 'lucide-react';
import type { PipelineStep } from '../../types';

interface StepIndicatorProps {
  step: PipelineStep;
  label: string;
  isActive: boolean;
  isCompleted: boolean;
  isLast?: boolean;
}

const stepLabels: Record<PipelineStep, string> = {
  partitioning: 'Partitioning',
  chunking: 'Chunking',
  ai_enhancement: 'AI Enhancement',
  vector_creation: 'Vector Creation',
};

export function StepIndicator({ label, isActive, isCompleted, isLast = false }: StepIndicatorProps) {
  return (
    <div className="flex items-start">
      <div className="flex flex-col items-center">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center ${
            isCompleted
              ? 'bg-green-500 text-white'
              : isActive
              ? 'bg-primary text-white'
              : 'bg-gray-200 text-gray-500'
          }`}
        >
          {isCompleted ? (
            <Check className="w-5 h-5" />
          ) : isActive ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <div className="w-3 h-3 rounded-full bg-current" />
          )}
        </div>
        {!isLast && (
          <div className={`w-0.5 h-16 ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}`} />
        )}
      </div>
      <div className="ml-4 flex-1">
        <h3
          className={`text-sm font-medium ${
            isActive ? 'text-gray-900' : 'text-gray-500'
          }`}
        >
          {label}
        </h3>
        <p className="text-xs text-gray-400 mt-1">
          {isCompleted ? 'Completed' : isActive ? 'In Progress' : 'Pending'}
        </p>
      </div>
    </div>
  );
}

interface PipelineStepsProps {
  currentStep: string | null;
  status: string;
}

export function PipelineSteps({ currentStep, status }: PipelineStepsProps) {
  const steps: PipelineStep[] = ['partitioning', 'chunking', 'ai_enhancement', 'vector_creation'];
  const currentStepIndex = currentStep ? steps.indexOf(currentStep as PipelineStep) : -1;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Pipeline Steps</h2>
      <div className="space-y-0">
        {steps.map((step, index) => (
          <StepIndicator
            key={step}
            step={step}
            label={stepLabels[step]}
            isActive={index === currentStepIndex && status === 'processing'}
            isCompleted={index < currentStepIndex || status === 'completed'}
            isLast={index === steps.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

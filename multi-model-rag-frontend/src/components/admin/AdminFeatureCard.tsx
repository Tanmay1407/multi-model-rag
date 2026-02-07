import { FileText, Upload, Trash2 } from 'lucide-react';
import type { Feature } from '../../types';

interface AdminFeatureCardProps {
  feature: Feature;
  onUploadPDF: (feature: Feature) => void;
  onDelete: (feature: Feature) => void;
}

export function AdminFeatureCard({ feature, onUploadPDF, onDelete }: AdminFeatureCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex-grow">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {feature.name}
          </h3>
          
          {feature.description && (
            <p className="text-gray-600 text-sm mb-4 line-clamp-3">
              {feature.description}
            </p>
          )}
          
          <div className="flex items-center text-sm text-gray-500 mb-4">
            <FileText className="w-4 h-4 mr-2" />
            <span>{feature.file_count} files</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => onUploadPDF(feature)}
            className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload PDF
          </button>
          
          <button
            onClick={() => onDelete(feature)}
            className="px-3 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
            title="Delete feature"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
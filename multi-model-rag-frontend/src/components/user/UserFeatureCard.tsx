import { FileText, MessageSquare, Ban, Users } from 'lucide-react';
import type { Feature } from '../../types';

interface UserFeatureCardProps {
  feature: Feature;
  onQuery: (feature: Feature) => void;
}

export function UserFeatureCard({ feature, onQuery }: UserFeatureCardProps) {
  const hasAccess = feature.file_count > 0;

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
          
          <div className="flex items-center text-sm mb-4">
            {hasAccess ? (
              <div className="flex items-center text-green-600">
                <FileText className="w-4 h-4 mr-2" />
                <span>{feature.file_count} document{feature.file_count !== 1 ? 's' : ''} available</span>
              </div>
            ) : (
              <div className="flex items-center text-red-500">
                <Ban className="w-4 h-4 mr-2" />
                <span>No documents available</span>
              </div>
            )}
          </div>

          {!hasAccess && (
            <div className="bg-red-50 border-l-4 border-red-400 p-3 mb-4">
              <div className="flex">
                <Users className="h-4 w-4 text-red-400 mt-0.5" />
                <div className="ml-2">
                  <p className="text-sm text-red-700">
                    No documents match your profile for this feature.
                  </p>
                  <p className="text-xs text-red-600 mt-1">
                    Contact your administrator if you believe this is an error.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-4">
          {hasAccess ? (
            <button
              onClick={() => onQuery(feature)}
              className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Ask Question
            </button>
          ) : (
            <button
              disabled
              className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-400 bg-gray-100 cursor-not-allowed"
            >
              <Ban className="w-4 h-4 mr-2" />
              No Access
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
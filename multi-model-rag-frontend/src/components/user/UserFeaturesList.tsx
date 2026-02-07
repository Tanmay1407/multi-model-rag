import { useState, useEffect } from 'react';
import { RefreshCw, AlertCircle, Users } from 'lucide-react';
import { featuresService } from '../../services/featuresService';
import { authService } from '../../services/authService';
import { UserFeatureCard } from './UserFeatureCard';
import { QueryInterface } from './QueryInterface';
import type { Feature } from '../../types';

export function UserFeaturesList() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showQueryModal, setShowQueryModal] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);

  const user = authService.getUser();

  const loadFeatures = async () => {
    try {
      setError(null);
      const response = await featuresService.listFeatures();
      setFeatures(response.features);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load features');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFeatures();
  }, []);

  const handleQuery = (feature: Feature) => {
    setSelectedFeature(feature);
    setShowQueryModal(true);
  };

  const accessibleFeatures = features.filter(f => f.file_count > 0);
  const inaccessibleFeatures = features.filter(f => f.file_count === 0);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading features...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Available Features</h1>
          <p className="text-gray-600 mt-1">
            Ask questions about documents that match your profile
          </p>
        </div>
        <button
          onClick={loadFeatures}
          disabled={isLoading}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* User Profile Display */}
      {user && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <Users className="w-5 h-5 text-blue-600 mr-2" />
            <span className="font-medium text-blue-800">Your Profile:</span>
          </div>
          <div className="mt-2 text-sm text-blue-700">
            <span className="inline-flex items-center mr-4">
              📍 {user.location || 'Location not set'}
            </span>
            <span className="inline-flex items-center mr-4">
              👤 {user.age ? `${user.age} years` : 'Age not set'}
            </span>
            <span className="inline-flex items-center">
              ⚧ {user.gender?.replace('_', ' ') || 'Gender not set'}
            </span>
          </div>
          <p className="text-xs text-blue-600 mt-2">
            Document access is filtered based on your profile. You can update your profile in Settings.
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="rounded-md bg-red-50 p-4 border border-red-200">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
              <button
                onClick={() => setError(null)}
                className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Features List */}
      {features.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto max-w-md">
            <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No features available
            </h3>
            <p className="text-gray-500">
              Contact your administrator to set up document features.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Accessible Features */}
          {accessibleFeatures.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Available Features ({accessibleFeatures.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {accessibleFeatures.map((feature) => (
                  <UserFeatureCard
                    key={feature.feature_id}
                    feature={feature}
                    onQuery={handleQuery}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Inaccessible Features */}
          {inaccessibleFeatures.length > 0 && (
            <div>
              {accessibleFeatures.length > 0 && (
                <hr className="my-8 border-gray-200" />
              )}
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Restricted Features ({inaccessibleFeatures.length})
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                These features don't have documents that match your profile.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {inaccessibleFeatures.map((feature) => (
                  <UserFeatureCard
                    key={feature.feature_id}
                    feature={feature}
                    onQuery={handleQuery}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Query Modal */}
      {showQueryModal && selectedFeature && (
        <QueryInterface
          feature={selectedFeature}
          onClose={() => {
            setShowQueryModal(false);
            setSelectedFeature(null);
          }}
        />
      )}
    </div>
  );
}
import { useState, useEffect } from 'react';
import { Plus, RefreshCw, AlertCircle } from 'lucide-react';
import { featuresService } from '../../services/featuresService';
import { AdminFeatureCard } from './AdminFeatureCard';
import { CreateFeatureModal } from './CreateFeatureModal';
import { UploadPDFModal } from './UploadPDFModal';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal';
import type { Feature } from '../../types';

export function AdminFeaturesList() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);

  const loadFeatures = async () => {
    try {
      setError(null);
      const response = await featuresService.listFeaturesAdmin();
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

  const handleCreateSuccess = () => {
    loadFeatures();
  };

  const handleUploadSuccess = () => {
    loadFeatures();
  };

  const handleUploadPDF = (feature: Feature) => {
    setSelectedFeature(feature);
    setShowUploadModal(true);
  };

  const handleDeleteFeature = (feature: Feature) => {
    setSelectedFeature(feature);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedFeature) return;

    try {
      await featuresService.deleteFeature(selectedFeature.feature_id);
      setFeatures(prev => prev.filter(f => f.feature_id !== selectedFeature.feature_id));
      setShowDeleteModal(false);
      setSelectedFeature(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete feature');
    }
  };

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
          <h1 className="text-2xl font-bold text-gray-900">Features Management</h1>
          <p className="text-gray-600 mt-1">
            Create and manage document features for your organization
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadFeatures}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New Feature
          </button>
        </div>
      </div>

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

      {/* Features Grid */}
      {features.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto max-w-md">
            <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No features yet
            </h3>
            <p className="text-gray-500 mb-4">
              Create your first feature to get started with document management.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Feature
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <AdminFeatureCard
              key={feature.feature_id}
              feature={feature}
              onUploadPDF={handleUploadPDF}
              onDelete={handleDeleteFeature}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateFeatureModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {showUploadModal && selectedFeature && (
        <UploadPDFModal
          feature={selectedFeature}
          onClose={() => {
            setShowUploadModal(false);
            setSelectedFeature(null);
          }}
          onSuccess={handleUploadSuccess}
        />
      )}

      {showDeleteModal && selectedFeature && (
        <DeleteConfirmModal
          title="Delete Feature"
          message={`Are you sure you want to delete "${selectedFeature.name}"? This will permanently delete ${selectedFeature.file_count} PDFs and all associated data.`}
          confirmText="DELETE"
          onConfirm={confirmDelete}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedFeature(null);
          }}
        />
      )}
    </div>
  );
}
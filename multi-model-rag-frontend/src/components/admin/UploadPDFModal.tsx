import { useState, FormEvent, useCallback } from 'react';
import { X, Upload, ChevronDown, ChevronRight, Info } from 'lucide-react';
import { featuresService } from '../../services/featuresService';
import type { Feature, UploadPDFFilters } from '../../types';

interface UploadPDFModalProps {
  feature: Feature;
  onClose: () => void;
  onSuccess: () => void;
}

export function UploadPDFModal({ feature, onClose, onSuccess }: UploadPDFModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<UploadPDFFilters>({
    age_min: undefined,
    age_max: undefined,
    allowed_locations: [],
    allowed_genders: []
  });
  const [locationInput, setLocationInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setError(null);
    } else {
      setError('Please select a valid PDF file');
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setError(null);
    } else {
      setError('Please select a valid PDF file');
    }
  }, []);

  const addLocation = () => {
    const location = locationInput.trim();
    if (location && !filters.allowed_locations?.includes(location)) {
      setFilters(prev => ({
        ...prev,
        allowed_locations: [...(prev.allowed_locations || []), location]
      }));
      setLocationInput('');
    }
  };

  const removeLocation = (location: string) => {
    setFilters(prev => ({
      ...prev,
      allowed_locations: prev.allowed_locations?.filter(l => l !== location) || []
    }));
  };

  const handleGenderChange = (gender: 'male' | 'female' | 'other' | 'prefer_not_to_say', checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      allowed_genders: checked
        ? [...(prev.allowed_genders || []), gender]
        : prev.allowed_genders?.filter(g => g !== gender) || []
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsLoading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      await featuresService.uploadPDF(feature.feature_id, {
        file: selectedFile,
        ...filters
      });

      clearInterval(progressInterval);
      setUploadProgress(100);
      
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 500);
    } catch (err) {
      setIsLoading(false);
      setUploadProgress(0);
      setError(err instanceof Error ? err.message : 'Failed to upload PDF');
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-pdf-title"
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 id="upload-pdf-title" className="text-xl font-bold text-gray-900">
            Upload PDF to "{feature.name}"
          </h2>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-500 disabled:opacity-50"
            aria-label="Close modal"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            {/* File Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select PDF File <span className="text-red-500">*</span>
              </label>
              
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  disabled={isLoading}
                  className="hidden"
                  id="pdf-file-input"
                />
                <label
                  htmlFor="pdf-file-input"
                  className="cursor-pointer inline-flex flex-col items-center"
                >
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-sm font-medium text-gray-700">
                    {selectedFile ? selectedFile.name : 'Drag & drop PDF here or click to browse'}
                  </span>
                  {!selectedFile && (
                    <span className="text-xs text-gray-500 mt-1">
                      Only PDF files are accepted
                    </span>
                  )}
                </label>
              </div>

              {selectedFile && (
                <div className="mt-2 text-sm text-green-600">
                  ✓ {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </div>
              )}
            </div>

            {/* Filter Rules */}
            <div className="mb-6">
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                {showFilters ? (
                  <ChevronDown className="w-4 h-4 mr-2" />
                ) : (
                  <ChevronRight className="w-4 h-4 mr-2" />
                )}
                Filter Rules (Optional)
              </button>
              
              <div className="flex items-center mt-2 text-xs text-gray-500">
                <Info className="w-3 h-3 mr-1" />
                Leave filters empty to make PDF accessible to all users
              </div>

              {showFilters && (
                <div className="mt-4 space-y-4 p-4 bg-gray-50 rounded-lg">
                  {/* Age Range */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Age Range
                    </label>
                    <div className="flex gap-2 items-center">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Min</label>
                        <input
                          type="number"
                          min="13"
                          max="120"
                          value={filters.age_min || ''}
                          onChange={(e) => setFilters(prev => ({
                            ...prev,
                            age_min: e.target.value ? parseInt(e.target.value) : undefined
                          }))}
                          placeholder="18"
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <span className="text-gray-400 mt-4">-</span>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Max</label>
                        <input
                          type="number"
                          min="13"
                          max="120"
                          value={filters.age_max || ''}
                          onChange={(e) => setFilters(prev => ({
                            ...prev,
                            age_max: e.target.value ? parseInt(e.target.value) : undefined
                          }))}
                          placeholder="65"
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Allowed Locations */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Allowed Locations
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={locationInput}
                        onChange={(e) => setLocationInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLocation())}
                        placeholder="e.g., India, London, USA"
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={addLocation}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                      >
                        Add
                      </button>
                    </div>
                    {filters.allowed_locations && filters.allowed_locations.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {filters.allowed_locations.map((location) => (
                          <span
                            key={location}
                            className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                          >
                            {location}
                            <button
                              type="button"
                              onClick={() => removeLocation(location)}
                              className="ml-1 text-blue-600 hover:text-blue-800"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Allowed Genders */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Allowed Genders
                    </label>
                    <div className="space-y-1">
                      {[
                        { value: 'male', label: 'Male' },
                        { value: 'female', label: 'Female' },
                        { value: 'other', label: 'Other' },
                        { value: 'prefer_not_to_say', label: 'Prefer not to say' }
                      ].map(({ value, label }) => (
                        <label key={value} className="flex items-center text-sm">
                          <input
                            type="checkbox"
                            checked={filters.allowed_genders?.includes(value as any) || false}
                            onChange={(e) => handleGenderChange(value as any, e.target.checked)}
                            className="mr-2"
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="mb-4 rounded-md bg-red-50 p-4 border border-red-200">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {isLoading && (
              <div className="mb-4">
                <div className="flex items-center justify-center mb-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-sm text-gray-600">Uploading PDF...</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 text-center mt-1">
                  {uploadProgress}% complete
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedFile || isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Uploading...' : 'Upload & Process'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
import type { 
  Feature, 
  FeatureListResponse, 
  CreateFeatureRequest, 
  CreateFeatureResponse,
  UploadPDFRequest,
  UploadPDFResponse,
  DeleteFeatureResponse,
  FeatureQueryRequest,
  FeatureQueryResponse
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const getAuthHeader = (): Record<string, string> => {
  const token = localStorage.getItem('access_token');
  return {
    'Authorization': `Bearer ${token}`
  };
};

export const featuresService = {
  // Admin endpoints
  async createFeature(data: CreateFeatureRequest): Promise<CreateFeatureResponse> {
    const response = await fetch(`${API_BASE_URL}/features/admin/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create feature');
    }

    return response.json();
  },

  async listFeaturesAdmin(): Promise<FeatureListResponse> {
    const response = await fetch(`${API_BASE_URL}/features/admin/list`, {
      headers: getAuthHeader()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch admin features');
    }

    return response.json();
  },

  async uploadPDF(featureId: string, uploadData: UploadPDFRequest): Promise<UploadPDFResponse> {
    const formData = new FormData();
    formData.append('file', uploadData.file);
    
    if (uploadData.age_min !== undefined) {
      formData.append('age_min', uploadData.age_min.toString());
    }
    if (uploadData.age_max !== undefined) {
      formData.append('age_max', uploadData.age_max.toString());
    }
    if (uploadData.allowed_locations && uploadData.allowed_locations.length > 0) {
      formData.append('allowed_locations', uploadData.allowed_locations.join(','));
    }
    if (uploadData.allowed_genders && uploadData.allowed_genders.length > 0) {
      formData.append('allowed_genders', uploadData.allowed_genders.join(','));
    }

    const response = await fetch(`${API_BASE_URL}/features/admin/${featureId}/upload`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to upload PDF');
    }

    return response.json();
  },

  async deleteFeature(featureId: string): Promise<DeleteFeatureResponse> {
    const response = await fetch(`${API_BASE_URL}/features/admin/${featureId}`, {
      method: 'DELETE',
      headers: getAuthHeader()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to delete feature');
    }

    return response.json();
  },

  // User endpoints
  async listFeatures(): Promise<FeatureListResponse> {
    const response = await fetch(`${API_BASE_URL}/features/list`, {
      headers: getAuthHeader()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch features');
    }

    return response.json();
  },

  async queryFeature(featureId: string, queryData: FeatureQueryRequest): Promise<FeatureQueryResponse> {
    const response = await fetch(`${API_BASE_URL}/features/${featureId}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(queryData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to query feature');
    }

    return response.json();
  }
};

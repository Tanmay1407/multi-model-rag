// Authentication Types
export interface User {
  user_id: string;
  username: string;
  email: string;
  location?: string;
  age?: number;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  role?: 'admin' | 'user';
  is_active: boolean;
  created_at: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface SignupData {
  username: string;
  email: string;
  password: string;
  location?: string;
  age?: number;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

// File Status Types
export type FileStatus = 
  | "uploaded" 
  | "partitioning" 
  | "chunking" 
  | "ai_enhancement" 
  | "vector_creation" 
  | "ready" 
  | "failed";

// Pipeline Step Types
export type PipelineStep = 
  | "partitioning" 
  | "chunking" 
  | "ai_enhancement" 
  | "vector_creation";

// File Interface (rename to avoid conflict with global File)
export interface FileData {
  file_id: string;
  filename: string;
  size: number;
  current_step: FileStatus;
  collection_name: string | null;
  uploaded_at: string;
  updated_at: string;
  error: string | null;
}

// Upload Response (matches FileUploadResponse in OpenAPI)
export interface UploadResponse {
  upload_id: string;
  files: Array<Record<string, any>>;
  total_files: number;
  total_size: number;
}

// Files List Response
export interface FilesListResponse {
  files: FileData[];
}

// Pipeline Status Interface (matches PipelineStatusResponse in OpenAPI)
export interface PipelineStatus {
  pipeline_id: string;
  current_step: string | null;
  current_file: string | null;
  files_completed: number;
  total_files: number;
  percentage: number;
  status: string;
}

// Pipeline Start Response (matches PipelineStartResponse in OpenAPI)
export interface PipelineStartResponse {
  pipeline_id: string;
  status: string;
  total_files: number;
  message: string;
}

// Collection Interface (matches CollectionInfo in OpenAPI)
export interface Collection {
  collection_name: string;
  file_ids: string[];
  vector_count: number;
  created_at: string;
}

// Collections Response
export interface CollectionsResponse {
  collections: Collection[];
}

// Chat Session Interface (matches ChatSessionResponse in OpenAPI)
export interface ChatSession {
  session_id: string;
  file_ids: string[];
  collection_names: string[];
  session_name: string | null;
  created_at: string;
}

// Create Session Request
export interface CreateSessionRequest {
  file_ids: string[];
  session_name?: string;
}

// Query Source Interface
export interface QuerySource {
  chunk_id: string;
  relevance_score: number;
  source_file: string;
  has_tables: boolean;
  has_images: boolean;
}

// Message History Interface (matches MessageHistory in OpenAPI)
export interface MessageHistory {
  query_id: string;
  query: string;
  answer: string;
  sources_count: number;
  timestamp: string;
}

// Query Message Interface (matches ChatQueryResponse in OpenAPI)
export interface QueryMessage {
  query_id: string;
  query: string;
  answer: string;
  sources: QuerySource[];
  processing_time: number;
  timestamp: string;
}

// Chat Query Request
export interface ChatQueryRequest {
  session_id: string;
  query: string;
  retrieval_options?: Record<string, any> | null;
}

// Chat History Response (matches ChatHistoryResponse in OpenAPI)
export interface ChatHistoryResponse {
  session_id: string;
  messages: MessageHistory[];
}

// Sessions List Response
export interface SessionsListResponse {
  sessions: ChatSession[];
}

// Error Response
export interface ApiError {
  detail: string;
  status?: number;
}

// Feature Types for Role-Based Access
export interface Feature {
  feature_id: string;
  name: string;
  description?: string;
  file_count: number;
  created_at: string;
}

export interface FeatureListResponse {
  features: Feature[];
}

export interface CreateFeatureRequest {
  name: string;
  description?: string;
}

export interface CreateFeatureResponse {
  feature_id: string;
  name: string;
  description?: string;
  file_count: number;
  created_at: string;
}

export interface UploadPDFFilters {
  age_min?: number;
  age_max?: number;
  allowed_locations?: string[];
  allowed_genders?: Array<'male' | 'female' | 'other' | 'prefer_not_to_say'>;
}

export interface UploadPDFRequest extends UploadPDFFilters {
  file: File;
}

export interface UploadPDFResponse {
  file_id: string;
  filename: string;
  feature_id: string;
  filter_rules: UploadPDFFilters;
  message: string;
}

export interface DeleteFeatureResponse {
  message: string;
  deleted_files: number;
}

export interface FeatureQueryRequest {
  query: string;
  retrieval_options?: {
    k?: number;
  };
}

export interface FeatureQuerySource {
  chunk_id: string;
  relevance_score: number;
  source_file: string;
  has_tables: boolean;
  has_images: boolean;
}

export interface FeatureQueryResponse {
  query_id: string;
  query: string;
  answer: string;
  sources: FeatureQuerySource[];
  accessible_files: string[];
  processing_time: number;
  timestamp: string;
}

export interface UpdateProfileRequest {
  location?: string;
  age?: number;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
}

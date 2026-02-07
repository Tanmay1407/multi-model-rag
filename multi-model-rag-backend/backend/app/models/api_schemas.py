from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime


# Upload Schemas
class FileUploadResponse(BaseModel):
    upload_id: str
    files: List[dict]
    total_files: int
    total_size: int


class FileResponse(BaseModel):
    file_id: str
    filename: str
    size: int
    current_step: str
    collection_name: Optional[str] = None
    uploaded_at: datetime
    updated_at: datetime
    error: Optional[str] = None


class FileListResponse(BaseModel):
    files: List[FileResponse]


# Pipeline Schemas
class PipelineStartRequest(BaseModel):
    file_ids: List[str]
    collection_name: Optional[str] = None


class PipelineStartResponse(BaseModel):
    pipeline_id: str
    status: str
    total_files: int
    message: str


class PipelineStatusResponse(BaseModel):
    pipeline_id: str
    current_step: Optional[str]
    current_file: Optional[str]
    files_completed: int
    total_files: int
    percentage: float
    status: str


class CollectionInfo(BaseModel):
    collection_name: str
    file_ids: List[str]
    vector_count: int
    created_at: datetime


class CollectionListResponse(BaseModel):
    collections: List[CollectionInfo]


# Chat Schemas
class ChatSessionCreateRequest(BaseModel):
    file_ids: List[str]
    session_name: Optional[str] = None


class ChatSessionResponse(BaseModel):
    session_id: str
    file_ids: List[str]
    collection_names: List[str]
    session_name: Optional[str] = None
    created_at: datetime


class ChatQueryRequest(BaseModel):
    session_id: str
    query: str
    retrieval_options: Optional[dict] = Field(default_factory=lambda: {"k": 3})


class SourceInfo(BaseModel):
    chunk_id: str
    relevance_score: float
    source_file: str
    has_tables: bool
    has_images: bool


class ChatQueryResponse(BaseModel):
    query_id: str
    query: str
    answer: str
    sources: List[SourceInfo]
    processing_time: float
    timestamp: datetime


class MessageHistory(BaseModel):
    query_id: str
    query: str
    answer: str
    sources_count: int
    timestamp: datetime


class ChatHistoryResponse(BaseModel):
    session_id: str
    messages: List[MessageHistory]


class ChatSessionListResponse(BaseModel):
    sessions: List[ChatSessionResponse]


# Error Schema
class ErrorResponse(BaseModel):
    error: dict


# ==================== Feature Schemas ====================

class CreateFeatureRequest(BaseModel):
    """Request to create a new feature"""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None


class FeatureResponse(BaseModel):
    """Response for feature details"""
    feature_id: str
    name: str
    description: Optional[str] = None
    created_by_admin: str
    created_at: datetime
    file_count: Optional[int] = 0  # Number of PDFs uploaded for this feature


class FeatureListResponse(BaseModel):
    """Response for listing features"""
    features: List[FeatureResponse]


class FilterRuleRequest(BaseModel):
    """Filter rules for user property-based PDF access"""
    age_min: Optional[int] = Field(None, ge=13, le=120)
    age_max: Optional[int] = Field(None, ge=13, le=120)
    allowed_locations: Optional[List[str]] = None
    allowed_genders: Optional[List[str]] = None


class UploadWithFiltersResponse(BaseModel):
    """Response after uploading PDF with filters"""
    file_id: str
    filename: str
    feature_id: str
    filter_rules: Optional[FilterRuleRequest] = None
    message: str


class FeatureQueryRequest(BaseModel):
    """Request to query a feature"""
    query: str
    retrieval_options: Optional[dict] = Field(default_factory=lambda: {"k": 3})


class FeatureQueryResponse(BaseModel):
    """Response for feature query"""
    query_id: str
    query: str
    answer: str
    sources: List[SourceInfo]
    accessible_files: List[str]  # File IDs that matched user's properties
    processing_time: float
    timestamp: datetime

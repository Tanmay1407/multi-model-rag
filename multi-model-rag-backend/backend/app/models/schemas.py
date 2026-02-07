from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, EmailStr
from enum import Enum


class FileStatus(str, Enum):
    """File processing status"""
    UPLOADED = "uploaded"
    PARTITIONING = "partitioning"
    CHUNKING = "chunking"
    AI_ENHANCEMENT = "ai_enhancement"
    VECTOR_CREATION = "vector_creation"
    READY = "ready"
    FAILED = "failed"
    DELETING = "deleting"


class PipelineStep(str, Enum):
    """Pipeline processing steps"""
    PARTITIONING = "partitioning"
    CHUNKING = "chunking"
    AI_ENHANCEMENT = "ai_enhancement"
    VECTOR_CREATION = "vector_creation"


class PipelineStatus(str, Enum):
    """Pipeline run status"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class FilterRule(BaseModel):
    """Filter rules for user property-based access"""
    age_min: Optional[int] = None
    age_max: Optional[int] = None
    allowed_locations: Optional[List[str]] = None  # e.g., ["India", "London"]
    allowed_genders: Optional[List[str]] = None  # e.g., ["male", "female"]


class FileModel(BaseModel):
    """File document schema"""
    file_id: str
    user_id: str  # Owner of this file (admin who uploaded it)
    filename: str
    size: int
    current_step: FileStatus = FileStatus.UPLOADED
    collection_name: Optional[str] = None
    feature_id: Optional[str] = None  # Link to feature (e.g., "HR Policy")
    filter_rules: Optional[FilterRule] = None  # User property filters
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    error: Optional[str] = None


class PipelineRunModel(BaseModel):
    """Pipeline run document schema"""
    pipeline_id: str
    user_id: str  # Owner of this pipeline run
    file_ids: List[str]
    current_step: Optional[PipelineStep] = None
    status: PipelineStatus = PipelineStatus.PENDING
    current_file: Optional[str] = None
    files_completed: int = 0
    total_files: int
    percentage: float = 0.0
    step_errors: Dict[str, str] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None


class ChatSessionModel(BaseModel):
    """Chat session document schema"""
    session_id: str
    user_id: str  # Owner of this chat session
    file_ids: List[str]
    collection_names: List[str]
    session_name: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class QueryHistoryModel(BaseModel):
    """Query history document schema"""
    query_id: str
    session_id: str
    query: str
    answer: str
    full_prompt: str  # Complete prompt sent to LLM including context
    sources: List[Dict[str, Any]] = Field(default_factory=list)
    processing_time: float
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ChunkModel(BaseModel):
    """Chunk document schema for MongoDB storage"""
    chunk_id: str
    file_id: str
    page_content: str  # AI-enhanced summary for search
    raw_text: str  # Original text content
    tables_html: List[str] = Field(default_factory=list)  # List of table HTML strings
    images_base64: List[str] = Field(default_factory=list)  # List of base64 image strings
    chunk_index: int  # Position in document
    has_tables: bool = False
    has_images: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ==================== Authentication Schemas ====================

class UserModel(BaseModel):
    """User document schema"""
    user_id: str
    username: str
    email: EmailStr
    hashed_password: str
    role: str = "user"  # "user" or "admin"
    location: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class UserSignupRequest(BaseModel):
    """User signup request schema"""
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8)
    location: Optional[str] = None
    age: Optional[int] = Field(None, ge=13, le=120)
    gender: Optional[str] = Field(None, pattern="^(male|female|other|prefer_not_to_say)$")


class UserLoginRequest(BaseModel):
    """User login request schema"""
    username: str
    password: str


class UserResponse(BaseModel):
    """User response schema (without sensitive data)"""
    user_id: str
    username: str
    email: EmailStr
    role: str
    location: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    is_active: bool
    created_at: datetime


class TokenResponse(BaseModel):
    """JWT token response schema"""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class UserDeleteResponse(BaseModel):
    """User deletion response schema"""
    message: str
    deleted_files: int
    deleted_chat_sessions: int


# ==================== Feature Schemas ====================

class FeatureModel(BaseModel):
    """Feature document schema (e.g., HR Policy, Company Handbook)"""
    feature_id: str
    name: str  # e.g., "HR Policy"
    description: Optional[str] = None
    created_by_admin: str  # Admin user_id who created the feature
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

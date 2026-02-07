"""
Features router for admin management and user querying of prebuilt RAG features
"""
from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File, Form, BackgroundTasks
from typing import List, Optional
import uuid
from datetime import datetime
import os
import shutil

from app.models.api_schemas import (
    CreateFeatureRequest,
    FeatureResponse,
    FeatureListResponse,
    FilterRuleRequest,
    UploadWithFiltersResponse,
    FeatureQueryRequest,
    FeatureQueryResponse,
    SourceInfo
)
from app.models.repositories import FeatureRepository, FileRepository
from app.models.schemas import FileStatus, FilterRule, PipelineStatus
from app.models.database import get_database
from app.core.dependencies import is_admin, get_current_active_user
from app.services.feature_service import FeatureService
from app.services.chat_service import ChatService
from app.services.pipeline_service import PipelineService
from app.config import settings


router = APIRouter(prefix="/api/features", tags=["Features"])


# ==================== ADMIN ENDPOINTS ====================

@router.post("/admin/create", response_model=FeatureResponse, status_code=status.HTTP_201_CREATED)
async def create_feature(
    feature_data: CreateFeatureRequest,
    admin_user: dict = Depends(is_admin)
):
    """
    [ADMIN ONLY] Create a new feature (e.g., HR Policy, Company Handbook)
    
    - **name**: Unique feature name
    - **description**: Optional description of the feature
    """
    # Check if feature name already exists
    existing_feature = await FeatureRepository.get_feature_by_name(feature_data.name)
    if existing_feature:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Feature with name '{feature_data.name}' already exists"
        )
    
    # Create feature document
    feature_doc = {
        "feature_id": str(uuid.uuid4()),
        "name": feature_data.name,
        "description": feature_data.description,
        "created_by_admin": admin_user["user_id"]
    }
    
    created_feature = await FeatureRepository.create_feature(feature_doc)
    
    return FeatureResponse(
        feature_id=created_feature["feature_id"],
        name=created_feature["name"],
        description=created_feature.get("description"),
        created_by_admin=created_feature["created_by_admin"],
        created_at=created_feature["created_at"],
        file_count=0
    )


@router.get("/admin/list", response_model=FeatureListResponse)
async def list_all_features_admin(admin_user: dict = Depends(is_admin)):
    """
    [ADMIN ONLY] List all features with file counts
    """
    features = await FeatureRepository.get_all_features()
    
    feature_responses = []
    for feature in features:
        # Count files for this feature
        file_count = await FileRepository.count_files_by_feature(feature["feature_id"])
        
        feature_responses.append(FeatureResponse(
            feature_id=feature["feature_id"],
            name=feature["name"],
            description=feature.get("description"),
            created_by_admin=feature["created_by_admin"],
            created_at=feature["created_at"],
            file_count=file_count
        ))
    
    return FeatureListResponse(features=feature_responses)


@router.post("/admin/{feature_id}/upload", response_model=UploadWithFiltersResponse)
async def upload_pdf_with_filters(
    feature_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    age_min: Optional[int] = Form(None),
    age_max: Optional[int] = Form(None),
    allowed_locations: Optional[str] = Form(None),  # Comma-separated string
    allowed_genders: Optional[str] = Form(None),  # Comma-separated string
    admin_user: dict = Depends(is_admin)
):
    """
    [ADMIN ONLY] Upload a PDF to a feature with filter rules
    
    - **feature_id**: Feature to upload PDF to
    - **file**: PDF file to upload
    - **age_min**: Minimum age requirement (optional)
    - **age_max**: Maximum age requirement (optional)
    - **allowed_locations**: Comma-separated locations (e.g., "India,London")
    - **allowed_genders**: Comma-separated genders (e.g., "male,female")
    
    After upload, the same processing pipeline will be triggered automatically.
    """
    # Verify feature exists
    feature = await FeatureRepository.get_feature(feature_id)
    if not feature:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feature not found"
        )
    
    # Validate file type
    if not file.filename.endswith('.pdf'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are supported"
        )
    
    # Parse filter rules
    filter_rules = None
    if any([age_min, age_max, allowed_locations, allowed_genders]):
        filter_rules = FilterRule(
            age_min=age_min,
            age_max=age_max,
            allowed_locations=[loc.strip() for loc in allowed_locations.split(",")] if allowed_locations else None,
            allowed_genders=[g.strip() for g in allowed_genders.split(",")] if allowed_genders else None
        )
    
    # Save file to disk
    file_id = str(uuid.uuid4())
    upload_dir = settings.upload_dir
    os.makedirs(upload_dir, exist_ok=True)
    
    # Save with consistent naming: {file_id}.pdf (same as upload.py)
    file_path = os.path.join(upload_dir, f"{file_id}.pdf")
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    file_size = os.path.getsize(file_path)
    
    # Create file document with feature_id and filter_rules
    file_doc = {
        "file_id": file_id,
        "user_id": admin_user["user_id"],
        "filename": file.filename,
        "size": file_size,
        "current_step": FileStatus.UPLOADED.value,
        "feature_id": feature_id,
        "filter_rules": filter_rules.dict() if filter_rules else None,
        "uploaded_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await FileRepository.create_file(file_doc)
    
    # Create pipeline run document
    pipeline_id = str(uuid.uuid4())
    db = get_database()
    
    pipeline_data = {
        "pipeline_id": pipeline_id,
        "user_id": admin_user["user_id"],
        "file_ids": [file_id],
        "current_step": None,
        "status": PipelineStatus.PENDING.value,
        "current_file": None,
        "files_completed": 0,
        "total_files": 1,
        "percentage": 0.0,
        "step_errors": {},
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "completed_at": None
    }
    
    await db.pipeline_runs.insert_one(pipeline_data)
    
    # Start processing pipeline automatically in background
    background_tasks.add_task(
        PipelineService.run_pipeline,
        pipeline_id,
        [file_id],
        None  # collection_name will be auto-generated
    )
    
    return UploadWithFiltersResponse(
        file_id=file_id,
        filename=file.filename,
        feature_id=feature_id,
        filter_rules=FilterRuleRequest(**filter_rules.dict()) if filter_rules else None,
        message="PDF uploaded successfully and processing started"
    )


@router.delete("/admin/{feature_id}", status_code=status.HTTP_200_OK)
async def delete_feature(
    feature_id: str,
    admin_user: dict = Depends(is_admin)
):
    """
    [ADMIN ONLY] Delete a feature and all associated files
    
    This will also delete all PDFs, chunks, and collections associated with this feature.
    """
    # Verify feature exists
    feature = await FeatureRepository.get_feature(feature_id)
    if not feature:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feature not found"
        )
    
    # Get all files for this feature
    files = await FileRepository.get_files_by_feature(feature_id)
    
    # Delete each file (this will cascade delete chunks and collections via existing logic)
    from app.services.file_manager import FileManager
    deleted_count = 0
    for file in files:
        try:
            await FileManager.delete_file(file["file_id"])
            deleted_count += 1
        except Exception as e:
            print(f"Warning: Failed to delete file {file['file_id']}: {e}")
    
    # Delete the feature document
    await FeatureRepository.delete_feature(feature_id)
    
    return {
        "message": f"Feature '{feature['name']}' deleted successfully",
        "deleted_files": deleted_count
    }


# ==================== USER ENDPOINTS ====================

@router.get("/list", response_model=FeatureListResponse)
async def list_available_features(current_user: dict = Depends(get_current_active_user)):
    """
    List all available features
    
    Note: All features are visible, but user can only access PDFs that match their profile.
    """
    features = await FeatureRepository.get_all_features()
    
    feature_responses = []
    for feature in features:
        # Count files that this specific user can access
        eligible_files = await FeatureService.get_eligible_files(current_user, feature["feature_id"])
        
        feature_responses.append(FeatureResponse(
            feature_id=feature["feature_id"],
            name=feature["name"],
            description=feature.get("description"),
            created_by_admin=feature["created_by_admin"],
            created_at=feature["created_at"],
            file_count=len(eligible_files)  # User sees only their accessible file count
        ))
    
    return FeatureListResponse(features=feature_responses)


@router.post("/{feature_id}/query", response_model=FeatureQueryResponse)
async def query_feature(
    feature_id: str,
    query_request: FeatureQueryRequest,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Query a feature with user property-based filtering
    
    Only PDFs matching the user's location, age, and gender will be queried.
    
    - **query**: Question to ask
    - **retrieval_options**: Optional retrieval settings (e.g., {"k": 3})
    """
    # Verify feature exists
    feature = await FeatureRepository.get_feature(feature_id)
    if not feature:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feature not found"
        )
    
    # Get collection names for files that match user's properties
    collection_names = await FeatureService.get_accessible_collection_names(
        current_user, 
        feature_id
    )
    
    if not collection_names:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"No documents available for your profile in feature '{feature['name']}'. "
                   f"Your location: {current_user.get('location', 'not set')}, "
                   f"age: {current_user.get('age', 'not set')}, "
                   f"gender: {current_user.get('gender', 'not set')}"
        )
    
    # Query using chat service
    import time
    start_time = time.time()
    
    result = await ChatService.process_query(
        collection_names=collection_names,
        query=query_request.query,
        retrieval_options=query_request.retrieval_options
    )
    
    processing_time = time.time() - start_time
    
    # Format sources
    sources = []
    for source in result["sources"]:
        sources.append(SourceInfo(
            chunk_id=source["chunk_id"],
            relevance_score=source["relevance_score"],
            source_file=source["source_file"],
            has_tables=source["has_tables"],
            has_images=source["has_images"]
        ))
    
    # Get file IDs for response
    eligible_files = await FeatureService.get_eligible_files(current_user, feature_id)
    accessible_file_ids = [f["file_id"] for f in eligible_files]
    
    return FeatureQueryResponse(
        query_id=str(uuid.uuid4()),
        query=query_request.query,
        answer=result["answer"],
        sources=sources,
        accessible_files=accessible_file_ids,
        processing_time=processing_time,
        timestamp=datetime.utcnow()
    )

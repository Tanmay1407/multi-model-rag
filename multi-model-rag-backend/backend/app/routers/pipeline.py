from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from fastapi.responses import StreamingResponse
from typing import AsyncGenerator
import uuid
import json
import asyncio
from datetime import datetime

from app.models.api_schemas import (
    PipelineStartRequest,
    PipelineStartResponse,
    PipelineStatusResponse,
    CollectionListResponse
)
from app.models.repositories import FileRepository
from app.models.database import get_database
from app.models.schemas import PipelineStatus, PipelineStep, FileStatus
from app.services.pipeline_service import PipelineService
from app.core.dependencies import get_current_active_user

router = APIRouter()


@router.post("/start", response_model=PipelineStartResponse)
async def start_pipeline(
    request: PipelineStartRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_active_user)
):
    """Start processing pipeline for uploaded files (user must own all files)"""
    
    # Validate files exist and user owns them
    for file_id in request.file_ids:
        file = await FileRepository.get_file(file_id)
        if not file:
            raise HTTPException(status_code=404, detail=f"File {file_id} not found")
        
        # Verify ownership
        if file.get("user_id") != current_user["user_id"]:
            raise HTTPException(status_code=403, detail=f"Not authorized to process file {file_id}")
        
        # Check if file is already processed or processing
        if file["current_step"] not in [FileStatus.UPLOADED.value, FileStatus.FAILED.value]:
            raise HTTPException(
                status_code=400,
                detail=f"File {file['filename']} is already being processed or completed"
            )
    
    # Create pipeline run
    pipeline_id = str(uuid.uuid4())
    db = get_database()
    
    pipeline_data = {
        "pipeline_id": pipeline_id,
        "user_id": current_user["user_id"],  # Associate pipeline with user
        "file_ids": request.file_ids,
        "current_step": None,
        "status": PipelineStatus.PENDING.value,
        "current_file": None,
        "files_completed": 0,
        "total_files": len(request.file_ids),
        "percentage": 0.0,
        "step_errors": {},
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "completed_at": None
    }
    
    await db.pipeline_runs.insert_one(pipeline_data)
    
    # Start pipeline in background
    background_tasks.add_task(
        PipelineService.run_pipeline,
        pipeline_id,
        request.file_ids,
        request.collection_name
    )
    
    return PipelineStartResponse(
        pipeline_id=pipeline_id,
        status=PipelineStatus.PENDING.value,
        total_files=len(request.file_ids),
        message="Pipeline started successfully"
    )


@router.get("/status/{pipeline_id}/stream")
async def stream_pipeline_status(pipeline_id: str, current_user: dict = Depends(get_current_active_user)):
    """Stream real-time pipeline status updates using Server-Sent Events"""
    
    # Verify ownership first
    db = get_database()
    pipeline = await db.pipeline_runs.find_one({"pipeline_id": pipeline_id})
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    if pipeline.get("user_id") != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized to access this pipeline")
    
    async def event_generator() -> AsyncGenerator[str, None]:
        db = get_database()
        
        while True:
            # Fetch current pipeline status
            pipeline = await db.pipeline_runs.find_one({"pipeline_id": pipeline_id})
            
            if not pipeline:
                yield f"data: {json.dumps({'error': 'Pipeline not found'})}\n\n"
                break
            
            # Send status update
            status_data = {
                "pipeline_id": pipeline_id,
                "current_step": pipeline.get("current_step"),
                "current_file": pipeline.get("current_file"),
                "files_completed": pipeline["files_completed"],
                "total_files": pipeline["total_files"],
                "percentage": pipeline["percentage"],
                "status": pipeline["status"]
            }
            
            yield f"data: {json.dumps(status_data)}\n\n"
            
            # Stop streaming if completed or failed
            if pipeline["status"] in [PipelineStatus.COMPLETED.value, PipelineStatus.FAILED.value]:
                break
            
            # Wait before next update
            await asyncio.sleep(2)
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


@router.get("/status/{pipeline_id}", response_model=PipelineStatusResponse)
async def get_pipeline_status(pipeline_id: str, current_user: dict = Depends(get_current_active_user)):
    """Get current pipeline status (non-streaming, user must own pipeline)"""
    db = get_database()
    pipeline = await db.pipeline_runs.find_one({"pipeline_id": pipeline_id})
    
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    
    # Verify ownership
    if pipeline.get("user_id") != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized to access this pipeline")
    
    return PipelineStatusResponse(
        pipeline_id=pipeline_id,
        current_step=pipeline.get("current_step"),
        current_file=pipeline.get("current_file"),
        files_completed=pipeline["files_completed"],
        total_files=pipeline["total_files"],
        percentage=pipeline["percentage"],
        status=pipeline["status"]
    )


@router.get("/collections", response_model=CollectionListResponse)
async def list_collections(current_user: dict = Depends(get_current_active_user)):
    """List all vector collections for current user"""
    # Get all files that have been processed (have collection names) for current user
    files = await FileRepository.get_files_by_status(FileStatus.READY)
    user_files = [f for f in files if f.get("user_id") == current_user["user_id"]]
    
    collections_dict = {}
    for file in user_files:
        collection_name = file.get("collection_name")
        if collection_name:
            if collection_name not in collections_dict:
                collections_dict[collection_name] = {
                    "collection_name": collection_name,
                    "file_ids": [],
                    "vector_count": 0,  # TODO: Get actual count from Chroma
                    "created_at": file["uploaded_at"]
                }
            collections_dict[collection_name]["file_ids"].append(file["file_id"])
    
    return CollectionListResponse(
        collections=list(collections_dict.values())
    )

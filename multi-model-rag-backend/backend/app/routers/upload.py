from fastapi import APIRouter, UploadFile, File, HTTPException, status, Depends
from typing import List
import uuid
import os
import aiofiles
from datetime import datetime

from app.config import settings
from app.models.api_schemas import FileUploadResponse, FileListResponse, FileResponse
from app.models.repositories import FileRepository
from app.models.schemas import FileStatus
from app.services.file_manager import FileManager
from app.core.dependencies import get_current_active_user

router = APIRouter()


@router.post("/files", response_model=FileUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_files(
    files: List[UploadFile] = File(...),
    current_user: dict = Depends(get_current_active_user)
):
    """Upload multiple PDF files"""
    
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")
    
    upload_id = str(uuid.uuid4())
    uploaded_files = []
    total_size = 0
    
    # Ensure upload directory exists
    os.makedirs(settings.upload_dir, exist_ok=True)
    
    for file in files:
        # Validate file type
        if not file.filename.endswith('.pdf'):
            raise HTTPException(
                status_code=400,
                detail=f"File {file.filename} is not a PDF"
            )
        
        # Generate unique file ID
        file_id = str(uuid.uuid4())
        file_path = os.path.join(settings.upload_dir, f"{file_id}.pdf")
        
        # Read and save file
        content = await file.read()
        file_size = len(content)
        
        # Check file size
        if file_size > settings.max_file_size:
            raise HTTPException(
                status_code=413,
                detail=f"File {file.filename} exceeds maximum size of {settings.max_file_size} bytes"
            )
        
        # Save file to disk
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(content)
        
        # Create file document in MongoDB
        file_data = {
            "file_id": file_id,
            "user_id": current_user["user_id"],  # Associate file with user
            "filename": file.filename,
            "size": file_size,
            "current_step": FileStatus.UPLOADED.value,
            "collection_name": None,
            "uploaded_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "error": None
        }
        
        await FileRepository.create_file(file_data)
        
        uploaded_files.append({
            "file_id": file_id,
            "filename": file.filename,
            "size": file_size,
            "status": FileStatus.UPLOADED.value
        })
        
        total_size += file_size
    
    return FileUploadResponse(
        upload_id=upload_id,
        files=uploaded_files,
        total_files=len(uploaded_files),
        total_size=total_size
    )


@router.get("/files", response_model=FileListResponse)
async def list_files(current_user: dict = Depends(get_current_active_user)):
    """List all uploaded files for current user"""
    files = await FileRepository.get_all_files()
    
    # Filter files by current user
    user_files = [f for f in files if f.get("user_id") == current_user["user_id"]]
    
    file_responses = [
        FileResponse(
            file_id=file["file_id"],
            filename=file["filename"],
            size=file["size"],
            current_step=file["current_step"],
            collection_name=file.get("collection_name"),
            uploaded_at=file["uploaded_at"],
            updated_at=file["updated_at"],
            error=file.get("error")
        )
        for file in user_files
    ]
    
    return FileListResponse(files=file_responses)


@router.get("/files/{file_id}", response_model=FileResponse)
async def get_file(file_id: str, current_user: dict = Depends(get_current_active_user)):
    """Get file details by ID (must be owned by current user)"""
    file = await FileRepository.get_file(file_id)
    
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Verify ownership
    if file.get("user_id") != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized to access this file")
    
    return FileResponse(
        file_id=file["file_id"],
        filename=file["filename"],
        size=file["size"],
        current_step=file["current_step"],
        collection_name=file.get("collection_name"),
        uploaded_at=file["uploaded_at"],
        updated_at=file["updated_at"],
        error=file.get("error")
    )


@router.delete("/files/{file_id}", status_code=status.HTTP_200_OK)
async def delete_file(file_id: str, current_user: dict = Depends(get_current_active_user)):
    """Delete file with cascade cleanup (must be owned by current user)"""
    file = await FileRepository.get_file(file_id)
    
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Verify ownership
    if file.get("user_id") != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized to delete this file")
    
    # Perform cascade delete
    try:
        await FileManager.cascade_delete_file(file_id, file)
        return {"message": "File deleted successfully", "file_id": file_id}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete file: {str(e)}"
        )

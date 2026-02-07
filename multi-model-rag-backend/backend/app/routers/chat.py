from fastapi import APIRouter, HTTPException, Depends
import uuid
from datetime import datetime
from typing import List
import time

from app.models.api_schemas import (
    ChatSessionCreateRequest,
    ChatSessionResponse,
    ChatQueryRequest,
    ChatQueryResponse,
    ChatHistoryResponse,
    ChatSessionListResponse,
    MessageHistory,
    SourceInfo
)
from app.models.repositories import FileRepository
from app.models.database import get_database
from app.models.schemas import FileStatus
from app.services.chat_service import ChatService
from app.core.dependencies import get_current_active_user

router = APIRouter()


@router.post("/sessions", response_model=ChatSessionResponse, status_code=201)
async def create_chat_session(request: ChatSessionCreateRequest, current_user: dict = Depends(get_current_active_user)):
    """Create a new chat session (user must own all files)"""
    
    # Validate all files exist, are ready, and user owns them
    collection_names = []
    for file_id in request.file_ids:
        file = await FileRepository.get_file(file_id)
        if not file:
            raise HTTPException(status_code=404, detail=f"File {file_id} not found")
        
        # Verify ownership
        if file.get("user_id") != current_user["user_id"]:
            raise HTTPException(status_code=403, detail=f"Not authorized to access file {file_id}")
        
        if file["current_step"] != FileStatus.READY.value:
            raise HTTPException(
                status_code=400,
                detail=f"File {file['filename']} is not ready. Current status: {file['current_step']}"
            )
        
        if file.get("collection_name"):
            collection_names.append(file["collection_name"])
    
    if not collection_names:
        raise HTTPException(status_code=400, detail="No valid collections found for the specified files")
    
    # Create session
    session_id = str(uuid.uuid4())
    db = get_database()
    
    session_data = {
        "session_id": session_id,
        "user_id": current_user["user_id"],  # Associate session with user
        "file_ids": request.file_ids,
        "collection_names": collection_names,
        "session_name": request.session_name,
        "created_at": datetime.utcnow()
    }
    
    await db.chat_sessions.insert_one(session_data)
    
    return ChatSessionResponse(
        session_id=session_id,
        file_ids=request.file_ids,
        collection_names=collection_names,
        session_name=request.session_name,
        created_at=session_data["created_at"]
    )


@router.post("/query", response_model=ChatQueryResponse)
async def query_chat(request: ChatQueryRequest, current_user: dict = Depends(get_current_active_user)):
    """Send a query to the chat session (user must own session)"""
    
    db = get_database()
    
    # Get session
    session = await db.chat_sessions.find_one({"session_id": request.session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Verify ownership
    if session.get("user_id") != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized to access this session")
    
    # Process query
    start_time = time.time()
    
    try:
        result = await ChatService.process_query(
            session["collection_names"],
            request.query,
            request.retrieval_options
        )
        
        processing_time = time.time() - start_time
        
        # Save to query history
        query_id = str(uuid.uuid4())
        query_data = {
            "query_id": query_id,
            "session_id": request.session_id,
            "query": request.query,
            "answer": result["answer"],
            "full_prompt": result["full_prompt"],
            "sources": result["sources"],
            "processing_time": processing_time,
            "timestamp": datetime.utcnow()
        }
        
        await db.query_history.insert_one(query_data)
        
        # Format sources
        sources = [
            SourceInfo(
                chunk_id=src["chunk_id"],
                relevance_score=src["relevance_score"],
                source_file=src["source_file"],
                has_tables=src["has_tables"],
                has_images=src["has_images"]
            )
            for src in result["sources"]
        ]
        
        return ChatQueryResponse(
            query_id=query_id,
            query=request.query,
            answer=result["answer"],
            sources=sources,
            processing_time=processing_time,
            timestamp=query_data["timestamp"]
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process query: {str(e)}"
        )


@router.get("/sessions", response_model=ChatSessionListResponse)
async def list_sessions(current_user: dict = Depends(get_current_active_user)):
    """List all chat sessions for current user"""
    db = get_database()
    
    # Filter by current user
    cursor = db.chat_sessions.find({"user_id": current_user["user_id"]}).sort("created_at", -1)
    sessions = await cursor.to_list(length=None)
    
    session_responses = [
        ChatSessionResponse(
            session_id=session["session_id"],
            file_ids=session["file_ids"],
            collection_names=session["collection_names"],
            session_name=session.get("session_name"),
            created_at=session["created_at"]
        )
        for session in sessions
    ]
    
    return ChatSessionListResponse(sessions=session_responses)


@router.get("/sessions/{session_id}/history", response_model=ChatHistoryResponse)
async def get_chat_history(session_id: str, current_user: dict = Depends(get_current_active_user)):
    """Get chat history for a session (user must own session)"""
    db = get_database()
    
    # Check session exists
    session = await db.chat_sessions.find_one({"session_id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Verify ownership
    if session.get("user_id") != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized to access this session")
    
    # Get query history
    cursor = db.query_history.find({"session_id": session_id}).sort("timestamp", 1)
    queries = await cursor.to_list(length=None)
    
    messages = [
        MessageHistory(
            query_id=query["query_id"],
            query=query["query"],
            answer=query["answer"],
            sources_count=len(query["sources"]),
            timestamp=query["timestamp"]
        )
        for query in queries
    ]
    
    return ChatHistoryResponse(
        session_id=session_id,
        messages=messages
    )


@router.delete("/sessions/{session_id}", status_code=200)
async def delete_session(session_id: str, current_user: dict = Depends(get_current_active_user)):
    """Delete a chat session (user must own session)"""
    db = get_database()
    
    # Check session exists
    session = await db.chat_sessions.find_one({"session_id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Verify ownership
    if session.get("user_id") != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized to delete this session")
    
    # Delete session and its query history
    await db.chat_sessions.delete_one({"session_id": session_id})
    await db.query_history.delete_many({"session_id": session_id})
    
    return {
        "message": "Session deleted successfully",
        "session_id": session_id
    }

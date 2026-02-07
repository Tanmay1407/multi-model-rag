import os
import shutil
import chromadb

from app.config import settings
from app.models.database import get_database
from app.models.repositories import FileRepository, ChunkRepository


class FileManager:
    """Service for file management and cascade deletion"""
    
    @staticmethod
    async def cascade_delete_file(file_id: str, file: dict):
        """
        Cascade delete file and all related data:
        1. Delete from filesystem (uploads/ and processed/)
        2. Delete chunks from MongoDB
        3. Delete Chroma collection
        4. Remove file_id from chat sessions
        5. Delete query history for sessions with no remaining files
        6. Delete pipeline runs
        7. Delete file document
        """
        
        # Step 1: Delete from filesystem
        upload_path = os.path.join(settings.upload_dir, f"{file_id}.pdf")
        if os.path.exists(upload_path):
            os.remove(upload_path)
        
        processed_path = os.path.join(settings.processed_dir, f"{file_id}_chunks.json")
        if os.path.exists(processed_path):
            os.remove(processed_path)
        
        # Step 2: Delete chunks from MongoDB
        try:
            deleted_count = await ChunkRepository.delete_chunks_by_file_id(file_id)
            print(f"Deleted {deleted_count} chunks from MongoDB for file {file_id}")
        except Exception as e:
            print(f"Warning: Failed to delete chunks from MongoDB: {e}")
        
        # Step 3: Delete Chroma collection
        collection_name = file.get("collection_name")
        if collection_name:
            try:
                await FileManager._delete_chroma_collection(collection_name)
            except Exception as e:
                print(f"Warning: Failed to delete Chroma collection: {e}")
        
        # Step 4: Remove file_id from chat sessions
        db = get_database()
        await db.chat_sessions.update_many(
            {"file_ids": file_id},
            {"$pull": {"file_ids": file_id}}
        )
        
        # Step 5: Delete sessions with no remaining files
        empty_sessions = await db.chat_sessions.find({"file_ids": []}).to_list(length=None)
        for session in empty_sessions:
            # Delete query history for empty sessions
            await db.query_history.delete_many({"session_id": session["session_id"]})
            # Delete the session itself
            await db.chat_sessions.delete_one({"session_id": session["session_id"]})
        
        # Step 5: Delete pipeline runs
        await db.pipeline_runs.delete_many({"file_ids": file_id})
        
        # Step 6: Delete file document
        await FileRepository.delete_file(file_id)
    
    @staticmethod
    async def _delete_chroma_collection(collection_name: str):
        """Delete a Chroma collection"""
        
        # Use Chroma Cloud if configured
        if settings.chroma_api_key and settings.chroma_tenant and settings.chroma_database:
            client = chromadb.CloudClient(
                api_key=settings.chroma_api_key,
                tenant=settings.chroma_tenant,
                database=settings.chroma_database
            )
            
            try:
                client.delete_collection(name=collection_name)
            except Exception as e:
                print(f"Failed to delete Chroma Cloud collection: {e}")
        else:
            # Delete local persistence directory
            persist_dir = os.path.join("db", collection_name)
            if os.path.exists(persist_dir):
                shutil.rmtree(persist_dir)

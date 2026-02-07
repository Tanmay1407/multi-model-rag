from app.models.database import get_database
from app.models.schemas import FileModel, FileStatus, ChunkModel, UserModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid


class FileRepository:
    """Repository for file operations"""
    
    @staticmethod
    async def create_file(file_data: dict) -> dict:
        """Create a new file document"""
        db = get_database()
        result = await db.files.insert_one(file_data)
        file_data["_id"] = str(result.inserted_id)
        return file_data
    
    @staticmethod
    async def get_file(file_id: str) -> Optional[dict]:
        """Get file by ID"""
        db = get_database()
        return await db.files.find_one({"file_id": file_id})
    
    @staticmethod
    async def get_all_files() -> List[dict]:
        """Get all files"""
        db = get_database()
        cursor = db.files.find({})
        return await cursor.to_list(length=None)
    
    @staticmethod
    async def update_file_status(file_id: str, status: FileStatus, error: Optional[str] = None):
        """Update file status"""
        db = get_database()
        update_data = {
            "current_step": status.value,
            "updated_at": datetime.utcnow()
        }
        if error:
            update_data["error"] = error
        
        await db.files.update_one(
            {"file_id": file_id},
            {"$set": update_data}
        )
    
    @staticmethod
    async def update_file_collection(file_id: str, collection_name: str):
        """Update file collection name"""
        db = get_database()
        await db.files.update_one(
            {"file_id": file_id},
            {"$set": {
                "collection_name": collection_name,
                "updated_at": datetime.utcnow()
            }}
        )
    
    @staticmethod
    async def delete_file(file_id: str):
        """Delete file document"""
        db = get_database()
        await db.files.delete_one({"file_id": file_id})
    
    @staticmethod
    async def get_files_by_feature(feature_id: str) -> List[dict]:
        """Get all files for a specific feature"""
        db = get_database()
        cursor = db.files.find({"feature_id": feature_id})
        return await cursor.to_list(length=None)
    
    @staticmethod
    async def count_files_by_feature(feature_id: str) -> int:
        """Count files for a specific feature"""
        db = get_database()
        return await db.files.count_documents({"feature_id": feature_id})


class ChunkRepository:
    """Repository for chunk operations"""
    
    @staticmethod
    async def insert_chunks(file_id: str, chunks_data: List[Dict[str, Any]]) -> List[str]:
        """Insert multiple chunks and return their IDs"""
        db = get_database()
        
        # Prepare documents for insertion
        documents = []
        for chunk in chunks_data:
            doc = {
                "chunk_id": chunk["chunk_id"],
                "file_id": file_id,
                "page_content": chunk["page_content"],
                "raw_text": chunk["raw_text"],
                "tables_html": chunk.get("tables_html", []),
                "images_base64": chunk.get("images_base64", []),
                "chunk_index": chunk["chunk_index"],
                "has_tables": chunk.get("has_tables", False),
                "has_images": chunk.get("has_images", False),
                "created_at": datetime.utcnow()
            }
            documents.append(doc)
        
        # Insert all chunks
        if documents:
            result = await db.chunks.insert_many(documents)
            return [chunk["chunk_id"] for chunk in chunks_data]
        return []
    
    @staticmethod
    async def get_chunks_by_ids(chunk_ids: List[str]) -> List[Dict[str, Any]]:
        """Retrieve chunks by their IDs, maintaining order"""
        db = get_database()
        
        # Fetch all matching chunks
        cursor = db.chunks.find({"chunk_id": {"$in": chunk_ids}})
        chunks = await cursor.to_list(length=None)
        
        # Create a map for fast lookup
        chunk_map = {chunk["chunk_id"]: chunk for chunk in chunks}
        
        # Return chunks in the same order as chunk_ids (preserves relevance ranking)
        ordered_chunks = []
        for chunk_id in chunk_ids:
            if chunk_id in chunk_map:
                ordered_chunks.append(chunk_map[chunk_id])
        
        return ordered_chunks
    
    @staticmethod
    async def delete_chunks_by_file_id(file_id: str) -> int:
        """Delete all chunks for a file, return count deleted"""
        db = get_database()
        result = await db.chunks.delete_many({"file_id": file_id})
        return result.deleted_count
    
    @staticmethod
    async def get_files_by_status(status: FileStatus) -> List[dict]:
        """Get files by status"""
        db = get_database()
        cursor = db.files.find({"current_step": status.value})
        return await cursor.to_list(length=None)


class UserRepository:
    """Repository for user operations"""
    
    @staticmethod
    async def create_user(user_data: dict) -> dict:
        """Create a new user document"""
        db = get_database()
        
        # Generate user_id if not provided
        if "user_id" not in user_data:
            user_data["user_id"] = str(uuid.uuid4())
        
        # Set timestamps
        user_data["created_at"] = datetime.utcnow()
        user_data["updated_at"] = datetime.utcnow()
        user_data["is_active"] = user_data.get("is_active", True)
        
        result = await db.users.insert_one(user_data)
        user_data["_id"] = str(result.inserted_id)
        return user_data
    
    @staticmethod
    async def get_user_by_username(username: str) -> Optional[dict]:
        """Get user by username"""
        db = get_database()
        return await db.users.find_one({"username": username})
    
    @staticmethod
    async def get_user_by_email(email: str) -> Optional[dict]:
        """Get user by email"""
        db = get_database()
        return await db.users.find_one({"email": email})
    
    @staticmethod
    async def get_user_by_id(user_id: str) -> Optional[dict]:
        """Get user by user_id"""
        db = get_database()
        return await db.users.find_one({"user_id": user_id})
    
    @staticmethod
    async def update_user(user_id: str, update_data: dict) -> bool:
        """Update user document"""
        db = get_database()
        update_data["updated_at"] = datetime.utcnow()
        
        result = await db.users.update_one(
            {"user_id": user_id},
            {"$set": update_data}
        )
        return result.modified_count > 0
    
    @staticmethod
    async def delete_user(user_id: str) -> bool:
        """Delete user document"""
        db = get_database()
        result = await db.users.delete_one({"user_id": user_id})
        return result.deleted_count > 0


class FeatureRepository:
    """Repository for feature operations"""
    
    @staticmethod
    async def create_feature(feature_data: dict) -> dict:
        """Create a new feature document"""
        db = get_database()
        
        # Generate feature_id if not provided
        if "feature_id" not in feature_data:
            feature_data["feature_id"] = str(uuid.uuid4())
        
        # Set timestamps
        feature_data["created_at"] = datetime.utcnow()
        feature_data["updated_at"] = datetime.utcnow()
        
        result = await db.features.insert_one(feature_data)
        feature_data["_id"] = str(result.inserted_id)
        return feature_data
    
    @staticmethod
    async def get_feature(feature_id: str) -> Optional[dict]:
        """Get feature by ID"""
        db = get_database()
        return await db.features.find_one({"feature_id": feature_id})
    
    @staticmethod
    async def get_feature_by_name(name: str) -> Optional[dict]:
        """Get feature by name"""
        db = get_database()
        return await db.features.find_one({"name": name})
    
    @staticmethod
    async def get_all_features() -> List[dict]:
        """Get all features"""
        db = get_database()
        cursor = db.features.find({})
        return await cursor.to_list(length=None)
    
    @staticmethod
    async def update_feature(feature_id: str, update_data: dict) -> bool:
        """Update feature document"""
        db = get_database()
        update_data["updated_at"] = datetime.utcnow()
        
        result = await db.features.update_one(
            {"feature_id": feature_id},
            {"$set": update_data}
        )
        return result.modified_count > 0
    
    @staticmethod
    async def delete_feature(feature_id: str) -> bool:
        """Delete feature document"""
        db = get_database()
        result = await db.features.delete_one({"feature_id": feature_id})
        return result.deleted_count > 0

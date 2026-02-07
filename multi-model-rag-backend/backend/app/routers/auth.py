"""
Authentication router for user signup, login, and profile management
"""
from fastapi import APIRouter, HTTPException, status, Depends
from app.models.schemas import (
    UserSignupRequest,
    UserLoginRequest,
    UserResponse,
    TokenResponse,
    UserModel,
    UserDeleteResponse
)
from app.models.repositories import UserRepository
from app.core.security import hash_password, verify_password, create_access_token
from app.core.dependencies import get_current_active_user
from datetime import timedelta
from app.config import settings
import uuid


router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(user_data: UserSignupRequest):
    """
    Register a new user
    
    - **username**: Unique username (3-50 characters)
    - **email**: Valid email address
    - **password**: Password (minimum 8 characters)
    - **location**: Optional location
    - **age**: Optional age (13-120)
    - **gender**: Optional gender (male, female, other, prefer_not_to_say)
    """
    # Check if username already exists
    existing_user = await UserRepository.get_user_by_username(user_data.username)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    # Check if email already exists
    existing_email = await UserRepository.get_user_by_email(user_data.email)
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user document
    user_id = str(uuid.uuid4())
    hashed_password = hash_password(user_data.password)
    
    user_doc = {
        "user_id": user_id,
        "username": user_data.username,
        "email": user_data.email,
        "hashed_password": hashed_password,
        "role": "user",  # Default role for new users
        "location": user_data.location,
        "age": user_data.age,
        "gender": user_data.gender,
    }
    
    # Save to database
    created_user = await UserRepository.create_user(user_doc)
    
    # Create access token
    access_token = create_access_token(
        data={"sub": user_id},
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes)
    )
    
    # Prepare response
    user_response = UserResponse(
        user_id=created_user["user_id"],
        username=created_user["username"],
        email=created_user["email"],
        role=created_user["role"],
        location=created_user.get("location"),
        age=created_user.get("age"),
        gender=created_user.get("gender"),
        is_active=created_user["is_active"],
        created_at=created_user["created_at"]
    )
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=user_response
    )


@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLoginRequest):
    """
    Login with username and password
    
    - **username**: Your username
    - **password**: Your password
    
    Returns JWT access token and user profile
    """
    # Get user by username
    user = await UserRepository.get_user_by_username(credentials.username)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verify password
    if not verify_password(credentials.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if user is active
    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    # Create access token
    access_token = create_access_token(
        data={"sub": user["user_id"]},
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes)
    )
    
    # Prepare response
    user_response = UserResponse(
        user_id=user["user_id"],
        username=user["username"],
        email=user["email"],
        role=user.get("role", "user"),
        location=user.get("location"),
        age=user.get("age"),
        gender=user.get("gender"),
        is_active=user["is_active"],
        created_at=user["created_at"]
    )
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=user_response
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user: dict = Depends(get_current_active_user)):
    """
    Get current user profile
    
    Requires valid JWT token in Authorization header:
    Authorization: Bearer <your_jwt_token>
    """
    return UserResponse(
        user_id=current_user["user_id"],
        username=current_user["username"],
        email=current_user["email"],
        role=current_user.get("role", "user"),
        location=current_user.get("location"),
        age=current_user.get("age"),
        gender=current_user.get("gender"),
        is_active=current_user["is_active"],
        created_at=current_user["created_at"]
    )


@router.delete("/me", response_model=UserDeleteResponse, status_code=status.HTTP_200_OK)
async def delete_user_account(current_user: dict = Depends(get_current_active_user)):
    """
    Delete current user account and all related data
    
    This will permanently delete:
    - User account
    - All uploaded files and their chunks
    - All chat sessions and query history
    - All pipeline runs
    - All physical files from storage
    - All Chroma collections
    
    Requires valid JWT token in Authorization header:
    Authorization: Bearer <your_jwt_token>
    
    ⚠️ WARNING: This action is irreversible!
    """
    from app.services.file_manager import FileManager
    from app.models.database import get_database
    
    user_id = current_user["user_id"]
    db = get_database()
    
    try:
        # 1. Get all files belonging to the user
        user_files = await db.files.find({"user_id": user_id}).to_list(length=None)
        
        # 2. Delete each file and its related data (chunks, Chroma collections, physical files)
        for file in user_files:
            try:
                await FileManager.cascade_delete_file(file["file_id"], file)
            except Exception as e:
                # Log error but continue with other files
                print(f"Error deleting file {file['file_id']}: {e}")
        
        # 3. Delete all chat sessions
        chat_sessions = await db.chat_sessions.find({"user_id": user_id}).to_list(length=None)
        for session in chat_sessions:
            # Delete query history for each session
            await db.query_history.delete_many({"session_id": session["session_id"]})
        await db.chat_sessions.delete_many({"user_id": user_id})
        
        # 4. Delete all pipeline runs
        await db.pipeline_runs.delete_many({"user_id": user_id})
        
        # 5. Delete the user account
        deleted = await UserRepository.delete_user(user_id)
        
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete user account"
            )
        
        return {
            "message": "User account and all related data deleted successfully",
            "deleted_files": len(user_files),
            "deleted_chat_sessions": len(chat_sessions)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting user account: {str(e)}"
        )

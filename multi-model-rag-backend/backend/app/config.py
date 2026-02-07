from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # OpenAI Configuration
    openai_api_key: str
    
    # MongoDB Configuration
    mongodb_uri: str
    mongodb_db_name: str = "multimodal_rag"
    
    # Chroma Cloud Configuration (optional)
    chroma_api_key: str = ""
    chroma_tenant: str = ""
    chroma_database: str = ""
    
    # Server Configuration
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_reload: bool = True
    
    # CORS Configuration
    allowed_origins: str = "http://localhost:3000,http://localhost:5173"
    
    # File Upload Configuration
    max_file_size: int = 52428800  # 50MB
    upload_dir: str = "uploads"
    processed_dir: str = "processed"
    export_processed_chunks: bool = False  # Export chunks to JSON files
    
    # Pipeline Configuration
    chunk_max_chars: int = 3000
    chunk_target_chars: int = 2400
    chunk_min_chars: int = 500
    
    # LLM Configuration
    llm_model: str = "gpt-4o-mini"
    llm_temperature: float = 0
    embedding_model: str = "text-embedding-3-small"
    
    # JWT Authentication Configuration
    jwt_secret_key: str = "your-secret-key-change-this-in-production-use-openssl-rand-hex-32"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 10080  # 7 days
    
    @property
    def allowed_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",")]
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()

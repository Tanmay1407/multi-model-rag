from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
import chromadb
from app.config import settings

class Database:
    client: AsyncIOMotorClient = None
    db: AsyncIOMotorDatabase = None

db = Database()


async def connect_to_mongo():
    """Connect to MongoDB on startup"""
    db.client = AsyncIOMotorClient(settings.mongodb_uri)
    db.db = db.client[settings.mongodb_db_name]
    
    # Create indexes for chunks collection
    await db.db.chunks.create_index("file_id")
    await db.db.chunks.create_index("chunk_id", unique=True)
    
    print(f"✅ Connected to MongoDB database: {settings.mongodb_db_name}")
    print("✅ MongoDB indexes created")


async def connect_to_chroma():
    """Test Chroma connection on startup"""
    try:
        if settings.chroma_api_key and settings.chroma_tenant and settings.chroma_database:
            # Test Chroma Cloud connection
            print(f"🔍 Testing Chroma Cloud connection...")
            print(f"   Tenant: {settings.chroma_tenant}")
            print(f"   Database: {settings.chroma_database}")
            print(f"   API Key: {settings.chroma_api_key[:10]}...")
            
            client = chromadb.CloudClient(
                api_key=settings.chroma_api_key,
                tenant=settings.chroma_tenant,
                database=settings.chroma_database
            )
            # Test connection by heartbeat
            client.heartbeat()
            print(f"✅ Connected to Chroma Cloud - Tenant: {settings.chroma_tenant}")
        else:
            # Test local Chroma connection
            print("🔍 Testing local Chroma connection...")
            client = chromadb.PersistentClient(path="./db/chroma_db")
            client.heartbeat()
            print("✅ Connected to local Chroma database")
    except Exception as e:
        error_msg = str(e)
        print(f"\n❌ Failed to connect to Chroma")
        print(f"   Error: {error_msg}")
        
        if settings.chroma_api_key:
            print(f"\n📋 Chroma Cloud Configuration:")
            print(f"   Tenant: {settings.chroma_tenant}")
            print(f"   Database: {settings.chroma_database}")
            print(f"   API Key set: {'Yes' if settings.chroma_api_key else 'No'}")
            print(f"\n💡 Troubleshooting:")
            print(f"   1. Verify your Chroma Cloud credentials in .env")
            print(f"   2. Check CHROMA_TENANT, CHROMA_DATABASE, and CHROMA_API_KEY")
            print(f"   3. Verify API key is active in Chroma Cloud dashboard")
        else:
            print(f"\n💡 To use local Chroma, ensure all CHROMA_* variables are empty in .env")
        
        raise ConnectionError(f"Cannot start server - Chroma connection failed: {error_msg}")


async def close_mongo_connection():
    """Close MongoDB connection on shutdown"""
    if db.client:
        db.client.close()
        print("Closed MongoDB connection")


def get_database() -> AsyncIOMotorDatabase:
    """Get database instance"""
    return db.db

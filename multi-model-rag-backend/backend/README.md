# Multi-Modal RAG FastAPI Backend

FastAPI server for Multi-Modal Retrieval-Augmented Generation system that processes PDFs with text, tables, and images.

## Features

- **File Upload**: Upload multiple PDF files with validation
- **Pipeline Processing**: Async processing with 4 major steps (partitioning, chunking, AI enhancement, vector creation)
- **Real-time Updates**: Server-Sent Events (SSE) for pipeline progress monitoring
- **Chat Interface**: Query documents with AI-powered answers using multi-modal content
- **MongoDB Storage**: Metadata and session management
- **Chroma Vector DB**: Support for both Chroma Cloud and local persistence
- **Cascade Deletion**: Clean file removal across all systems

## Architecture

```
backend/
├── app/
│   ├── routers/          # API endpoints
│   │   ├── upload.py     # File upload & management
│   │   ├── pipeline.py   # Pipeline processing
│   │   └── chat.py       # Chat sessions & queries
│   ├── models/           # Data models
│   │   ├── database.py   # MongoDB connection
│   │   ├── schemas.py    # Pydantic models
│   │   ├── api_schemas.py # API request/response schemas
│   │   └── repositories.py # Data access layer
│   ├── services/         # Business logic
│   │   ├── pipeline_service.py # RAG pipeline
│   │   ├── chat_service.py     # Query processing
│   │   └── file_manager.py     # File operations
│   └── config.py         # Configuration
├── uploads/              # Uploaded PDF files
├── processed/            # Processed JSON chunks
├── db/                   # Local Chroma DB (if not using Cloud)
├── main.py               # FastAPI application
└── requirements.txt      # Dependencies
```

## Installation

### Prerequisites

- Python 3.9+
- MongoDB Atlas account or local MongoDB
- OpenAI API key
- (Optional) Chroma Cloud account

### Setup Steps

1. **Clone and navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` file with your credentials:
   ```env
   # Required
   OPENAI_API_KEY=sk-...
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
   MONGODB_DB_NAME=multimodal_rag
   
   # Optional - Chroma Cloud (leave empty for local)
   CHROMA_HOST=
   CHROMA_PORT=8000
   CHROMA_API_KEY=
   
   # Server
   API_PORT=8000
   ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
   ```

5. **Run the server**
   ```bash
   python main.py
   ```
   
   Or with uvicorn directly:
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

## API Documentation

Once running, access interactive API documentation:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## API Endpoints

### File Upload & Management

#### Upload Files
```http
POST /api/upload/files
Content-Type: multipart/form-data
```

#### List All Files
```http
GET /api/files
```

#### Get File Details
```http
GET /api/files/{file_id}
```

#### Delete File
```http
DELETE /api/files/{file_id}
```

### Pipeline Processing

#### Start Pipeline
```http
POST /api/pipeline/start
Content-Type: application/json

{
  "file_ids": ["uuid1", "uuid2"],
  "collection_name": "optional-name"
}
```

#### Stream Pipeline Status (SSE)
```http
GET /api/pipeline/status/{pipeline_id}/stream
```

#### Get Pipeline Status
```http
GET /api/pipeline/status/{pipeline_id}
```

#### List Collections
```http
GET /api/pipeline/collections
```

### Chat

#### Create Chat Session
```http
POST /api/chat/sessions
Content-Type: application/json

{
  "file_ids": ["uuid1", "uuid2"],
  "session_name": "My Session"
}
```

#### Query Chat
```http
POST /api/chat/query
Content-Type: application/json

{
  "session_id": "session-uuid",
  "query": "What is the main topic?",
  "retrieval_options": {"k": 3}
}
```

#### List Sessions
```http
GET /api/chat/sessions
```

#### Get Chat History
```http
GET /api/chat/sessions/{session_id}/history
```

#### Delete Session
```http
DELETE /api/chat/sessions/{session_id}
```

## Pipeline Steps

The processing pipeline consists of 4 major steps:

1. **Partitioning** - Extract elements from PDF using Unstructured
2. **Chunking** - Create intelligent chunks with title-based strategy
3. **AI Enhancement** - Generate searchable descriptions using GPT-4o-mini
4. **Vector Creation** - Store embeddings in Chroma DB

## File Status States

- `uploaded` - File uploaded, ready for processing
- `partitioning` - Extracting PDF elements
- `chunking` - Creating document chunks
- `ai_enhancement` - Generating AI summaries
- `vector_creation` - Creating vector embeddings
- `ready` - File processed and ready for queries
- `failed` - Processing failed

## MongoDB Collections

- **files** - File metadata and status
- **pipeline_runs** - Pipeline execution tracking
- **chat_sessions** - Chat session information
- **query_history** - Query and answer history

## Development

### Run Tests
```bash
pytest
```

### Code Formatting
```bash
black app/
```

### Linting
```bash
flake8 app/
```

## Deployment

### Production Settings

Update `.env` for production:
```env
API_RELOAD=False
ALLOWED_ORIGINS=https://your-frontend-domain.com
```

### Docker (Optional)

Create `Dockerfile`:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Build and run:
```bash
docker build -t multimodal-rag-api .
docker run -p 8000:8000 --env-file .env multimodal-rag-api
```

## Troubleshooting

### MongoDB Connection Issues
- Verify MongoDB URI is correct
- Check network access in MongoDB Atlas
- Ensure IP address is whitelisted

### Chroma Issues
- For local: Ensure `db/` directory is writable
- For cloud: Verify credentials and network access

### Large File Processing
- Adjust `MAX_FILE_SIZE` in `.env`
- Monitor memory usage for large PDFs
- Consider processing files in smaller batches

## Performance Optimization

- Use Chroma Cloud for better scalability
- Enable MongoDB connection pooling
- Use background tasks for all pipeline operations
- Implement caching for frequently accessed queries

## Security Considerations

- Never commit `.env` file
- Use environment variables for all secrets
- Implement authentication (not included in basic version)
- Validate all file uploads
- Sanitize user inputs
- Use HTTPS in production

## License

MIT

## Support

For issues and questions, please create an issue in the repository.

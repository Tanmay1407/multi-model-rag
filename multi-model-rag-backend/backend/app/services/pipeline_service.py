import os
import json
import uuid
import uuid
from typing import List
from datetime import datetime

from unstructured.partition.pdf import partition_pdf
from unstructured.chunking.title import chunk_by_title
from langchain_core.documents import Document
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_chroma import Chroma
import chromadb
from langchain.messages import HumanMessage

from app.config import settings
from app.models.repositories import FileRepository, ChunkRepository
from app.models.schemas import FileStatus, PipelineStatus, PipelineStep
from app.models.database import get_database


class PipelineService:
    """Service for RAG pipeline processing"""
    
    @staticmethod
    async def run_pipeline(pipeline_id: str, file_ids: List[str], collection_name: str = None):
        """Run complete ingestion pipeline for multiple files"""
        db = get_database()
        
        try:
            # Update pipeline status to processing
            await db.pipeline_runs.update_one(
                {"pipeline_id": pipeline_id},
                {"$set": {
                    "status": PipelineStatus.PROCESSING.value,
                    "updated_at": datetime.utcnow()
                }}
            )
            
            for idx, file_id in enumerate(file_ids):
                file = await FileRepository.get_file(file_id)
                if not file:
                    continue
                
                # Update current file in pipeline
                await db.pipeline_runs.update_one(
                    {"pipeline_id": pipeline_id},
                    {"$set": {
                        "current_file": file["filename"],
                        "updated_at": datetime.utcnow()
                    }}
                )
                
                try:
                    # Process single file through all steps
                    await PipelineService._process_file(pipeline_id, file_id, file, collection_name)
                    
                    # Update files completed
                    files_completed = idx + 1
                    percentage = (files_completed / len(file_ids)) * 100
                    
                    await db.pipeline_runs.update_one(
                        {"pipeline_id": pipeline_id},
                        {"$set": {
                            "files_completed": files_completed,
                            "percentage": percentage,
                            "updated_at": datetime.utcnow()
                        }}
                    )
                    
                except Exception as e:
                    # Mark file as failed
                    await FileRepository.update_file_status(file_id, FileStatus.FAILED, str(e))
                    
                    # Record error in pipeline
                    await db.pipeline_runs.update_one(
                        {"pipeline_id": pipeline_id},
                        {"$set": {f"step_errors.{file_id}": str(e)}}
                    )
            
            # Mark pipeline as completed
            await db.pipeline_runs.update_one(
                {"pipeline_id": pipeline_id},
                {"$set": {
                    "status": PipelineStatus.COMPLETED.value,
                    "current_step": None,
                    "completed_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }}
            )
            
        except Exception as e:
            # Mark pipeline as failed
            await db.pipeline_runs.update_one(
                {"pipeline_id": pipeline_id},
                {"$set": {
                    "status": PipelineStatus.FAILED.value,
                    "updated_at": datetime.utcnow()
                }}
            )
    
    @staticmethod
    async def _process_file(pipeline_id: str, file_id: str, file: dict, collection_name: str = None):
        """Process single file through all pipeline steps"""
        db = get_database()
        file_path = os.path.join(settings.upload_dir, f"{file_id}.pdf")
        
        # Step 1: Partitioning
        await db.pipeline_runs.update_one(
            {"pipeline_id": pipeline_id},
            {"$set": {"current_step": PipelineStep.PARTITIONING.value}}
        )
        await FileRepository.update_file_status(file_id, FileStatus.PARTITIONING)
        
        elements = partition_pdf(
            filename=file_path,
            strategy="hi_res",
            infer_table_structure=True,
            extract_image_block_types=["Image"],
            extract_image_block_to_payload=True
        )
        
        # Step 2: Chunking
        await db.pipeline_runs.update_one(
            {"pipeline_id": pipeline_id},
            {"$set": {"current_step": PipelineStep.CHUNKING.value}}
        )
        await FileRepository.update_file_status(file_id, FileStatus.CHUNKING)
        
        chunks = chunk_by_title(
            elements,
            max_characters=settings.chunk_max_chars,
            new_after_n_chars=settings.chunk_target_chars,
            combine_text_under_n_chars=settings.chunk_min_chars
        )
        
        # Step 3: AI Enhancement
        await db.pipeline_runs.update_one(
            {"pipeline_id": pipeline_id},
            {"$set": {"current_step": PipelineStep.AI_ENHANCEMENT.value}}
        )
        await FileRepository.update_file_status(file_id, FileStatus.AI_ENHANCEMENT)
        
        processed_chunks, chunk_metadata = await PipelineService._summarise_chunks(chunks)
        
        # Step 4: Vector Creation
        await db.pipeline_runs.update_one(
            {"pipeline_id": pipeline_id},
            {"$set": {"current_step": PipelineStep.VECTOR_CREATION.value}}
        )
        await FileRepository.update_file_status(file_id, FileStatus.VECTOR_CREATION)
        
        # Determine collection name
        if not collection_name:
            collection_name = f"file_{file_id}"
        
        await PipelineService._create_vector_store(
            processed_chunks,
            chunk_metadata,
            file_id,
            collection_name
        )
        
        # Update file with collection name and mark as ready
        await FileRepository.update_file_collection(file_id, collection_name)
        await FileRepository.update_file_status(file_id, FileStatus.READY)
    
    @staticmethod
    async def _summarise_chunks(chunks):
        """Process chunks with AI summaries and prepare for dual storage"""
        langchain_documents = []
        chunk_metadata = []  # For MongoDB storage
        
        llm = ChatOpenAI(
            model=settings.llm_model,
            temperature=settings.llm_temperature,
            openai_api_key=settings.openai_api_key
        )
        
        for idx, chunk in enumerate(chunks):
            content_data = PipelineService._separate_content_types(chunk)
            
            if content_data['tables'] or content_data['images']:
                enhanced_content = await PipelineService._create_ai_enhanced_summary(
                    llm,
                    content_data['text'],
                    content_data['tables'],
                    content_data['images']
                )
            else:
                enhanced_content = content_data['text']
            
            # Store original data separately for MongoDB
            chunk_data = {
                "chunk_index": idx,
                "page_content": enhanced_content,
                "raw_text": content_data['text'],
                "tables_html": content_data['tables'],
                "images_base64": content_data['images'],
                "has_tables": len(content_data['tables']) > 0,
                "has_images": len(content_data['images']) > 0
            }
            chunk_metadata.append(chunk_data)
            
            # Create LangChain document with minimal metadata (chunk_id will be added later)
            doc = Document(
                page_content=enhanced_content,
                metadata={"chunk_index": idx}
            )
            langchain_documents.append(doc)
        
        return langchain_documents, chunk_metadata
    
    @staticmethod
    def _separate_content_types(chunk):
        """Analyze what types of content are in chunk"""
        content_data = {
            'text': chunk.text,
            'tables': [],
            'images': [],
            'types': ['text']
        }
        
        if hasattr(chunk, 'metadata') and hasattr(chunk.metadata, 'orig_elements'):
            for element in chunk.metadata.orig_elements:
                element_type = type(element).__name__
                
                if element_type == 'Table':
                    content_data['types'].append('table')
                    table_html = getattr(element.metadata, 'text_as_html', element.text)
                    content_data['tables'].append(table_html)
                elif element_type == 'Image':
                    if hasattr(element, 'metadata') and hasattr(element.metadata, 'image_base64'):
                        content_data['types'].append('image')
                        content_data['images'].append(element.metadata.image_base64)
        
        content_data['types'] = list(set(content_data['types']))
        return content_data
    
    @staticmethod
    async def _create_ai_enhanced_summary(llm, text: str, tables: List[str], images: List[str]) -> str:
        """Create AI-enhanced summary for mixed content"""
        try:
            prompt_text = f"""You are creating a searchable description for document content retrieval.
            CONTENT TO ANALYSE:
            TEXT CONTENT:
            {text}
            """
            
            if tables:
                prompt_text += "\nTABLES:\n"
                for i, table in enumerate(tables):
                    prompt_text += f"Table {i+1}:\n{table}\n\n"
            
            prompt_text += """
            YOUR TASK:
            Generate a comprehensive, searchable description that covers:
            1. Key facts, numbers, and data points from the text and tables
            2. Main topics and concepts discussed
            3. Questions this content could answer
            4. Visual content analysis (charts, diagrams, patterns in images)
            5. Alternative search terms users might use
            
            Make it detailed and searchable - prioritize findability over brevity.
            
            SEARCHABLE DESCRIPTION:"""
            
            message_content = [{"type": "text", "text": prompt_text}]
            
            for image_base64 in images:
                message_content.append({
                    "type": "image_url",
                    "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}
                })
            
            message = HumanMessage(content=message_content)
            response = llm.invoke([message])
            return response.content
        except Exception as e:
            summary = f"{text[:300]}..."
            if tables:
                summary += f" [Contains {len(tables)} table(s)]"
            if images:
                summary += f" [Contains {len(images)} image(s)]"
            return summary
    
    @staticmethod
    async def _create_vector_store(documents, chunk_metadata, file_id: str, collection_name: str):
        """Create vector store in Chroma and save full chunks to MongoDB"""
        embedding_model = OpenAIEmbeddings(
            model=settings.embedding_model,
            openai_api_key=settings.openai_api_key
        )
        
        # Step 1: Save full chunks to MongoDB and get chunk_ids
        chunks_for_mongo = []
        for metadata in chunk_metadata:
            chunk_id = f"{file_id}_chunk_{metadata['chunk_index']}"
            mongo_chunk = {
                "chunk_id": chunk_id,
                "page_content": metadata["page_content"],
                "raw_text": metadata["raw_text"],
                "tables_html": metadata["tables_html"],
                "images_base64": metadata["images_base64"],
                "chunk_index": metadata["chunk_index"],
                "has_tables": metadata["has_tables"],
                "has_images": metadata["has_images"]
            }
            chunks_for_mongo.append(mongo_chunk)
        
        # Insert into MongoDB
        await ChunkRepository.insert_chunks(file_id, chunks_for_mongo)
        
        # Step 2: Update LangChain documents with minimal metadata
        for idx, doc in enumerate(documents):
            chunk_id = f"{file_id}_chunk_{idx}"
            doc.metadata = {
                "chunk_id": chunk_id,
                "file_id": file_id,
                "chunk_index": idx,
                "has_tables": chunk_metadata[idx]["has_tables"],
                "has_images": chunk_metadata[idx]["has_images"]
            }
        
        # Step 3: Store in Chroma with minimal metadata
        if settings.chroma_api_key and settings.chroma_tenant and settings.chroma_database:
            client = chromadb.CloudClient(
                api_key=settings.chroma_api_key,
                tenant=settings.chroma_tenant,
                database=settings.chroma_database
            )
            
            vectorstore = Chroma.from_documents(
                documents=documents,
                embedding=embedding_model,
                client=client,
                collection_name=collection_name,
                collection_metadata={"hnsw:space": "cosine"}
            )
        else:
            # Use local persistence
            persist_dir = os.path.join("db", collection_name)
            vectorstore = Chroma.from_documents(
                documents=documents,
                embedding=embedding_model,
                persist_directory=persist_dir,
                collection_name=collection_name,
                collection_metadata={"hnsw:space": "cosine"}
            )
        
        # Step 4: Optionally export to JSON (controlled by env variable)
        if settings.export_processed_chunks:
            os.makedirs(settings.processed_dir, exist_ok=True)
            processed_file = os.path.join(settings.processed_dir, f"{file_id}_chunks.json")
            PipelineService._export_chunks(documents, chunk_metadata, processed_file)
        
        return vectorstore
    
    @staticmethod
    def _export_chunks(documents, chunk_metadata, filename: str):
        """Export processed chunks to JSON format"""
        export_data = []
        
        for i, (doc, metadata) in enumerate(zip(documents, chunk_metadata)):
            chunk_data = {
                "chunk_id": doc.metadata.get("chunk_id"),
                "chunk_index": i,
                "enhanced_content": doc.page_content,
                "metadata": {
                    "raw_text": metadata["raw_text"],
                    "tables_html": metadata["tables_html"],
                    "images_base64": metadata["images_base64"],
                    "has_tables": metadata["has_tables"],
                    "has_images": metadata["has_images"]
                }
            }
            export_data.append(chunk_data)
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(export_data, f, indent=2, ensure_ascii=False)

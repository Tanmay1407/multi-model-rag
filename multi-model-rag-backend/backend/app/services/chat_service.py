import json
from typing import List, Dict, Any
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_chroma import Chroma
from langchain.messages import HumanMessage
import chromadb

from app.config import settings
from app.models.repositories import ChunkRepository


class ChatService:
    """Service for chat query processing"""
    
    @staticmethod
    async def process_query(
        collection_names: List[str],
        query: str,
        retrieval_options: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Process a query against multiple collections"""
        
        k = retrieval_options.get("k", 3)
        
        # Step 1: Retrieve relevant chunks from Chroma (gets chunk_ids)
        all_chunks = []
        chunk_ids = []
        
        for collection_name in collection_names:
            vectorstore = ChatService._get_vectorstore(collection_name)
            retriever = vectorstore.as_retriever(search_kwargs={"k": k})
            chunks = retriever.invoke(query)
            all_chunks.extend(chunks)
        
        # Limit total chunks if multiple collections
        if len(all_chunks) > k:
            all_chunks = all_chunks[:k]
        
        # Step 2: Extract chunk_ids from Chroma results
        for chunk in all_chunks:
            chunk_id = chunk.metadata.get("chunk_id")
            if chunk_id:
                chunk_ids.append(chunk_id)
        
        # Step 3: Fetch full chunk content from MongoDB
        full_chunks = await ChunkRepository.get_chunks_by_ids(chunk_ids)
        
        # Step 4: Generate answer using full chunks from MongoDB
        result = await ChatService._generate_final_answer(full_chunks, query)
        
        # Format sources
        sources = []
        for chunk in full_chunks:
            sources.append({
                "chunk_id": chunk.get("chunk_id"),
                "relevance_score": 0.0,  # TODO: Get actual relevance score from Chroma
                "source_file": chunk.get("file_id"),
                "has_tables": chunk.get("has_tables", False),
                "has_images": chunk.get("has_images", False)
            })
        
        return {
            "answer": result["answer"],
            "full_prompt": result["full_prompt"],
            "sources": sources
        }
    
    @staticmethod
    def _get_vectorstore(collection_name: str):
        """Get vector store for collection"""
        embedding_model = OpenAIEmbeddings(
            model=settings.embedding_model,
            openai_api_key=settings.openai_api_key
        )
        
        # Use Chroma Cloud if configured
        if settings.chroma_api_key and settings.chroma_tenant and settings.chroma_database:
            client = chromadb.CloudClient(
                api_key=settings.chroma_api_key,
                tenant=settings.chroma_tenant,
                database=settings.chroma_database
            )
            
            vectorstore = Chroma(
                client=client,
                collection_name=collection_name,
                embedding_function=embedding_model
            )
        else:
            # Use local persistence
            import os
            persist_dir = os.path.join("db", collection_name)
            vectorstore = Chroma(
                persist_directory=persist_dir,
                collection_name=collection_name,
                embedding_function=embedding_model
            )
        
        return vectorstore
    
    @staticmethod
    async def _generate_final_answer(mongo_chunks: List[Dict[str, Any]], query: str) -> Dict[str, str]:
        """Generate final answer using multi-modal content from MongoDB"""
        try:
            llm = ChatOpenAI(
                model=settings.llm_model,
                temperature=settings.llm_temperature,
                openai_api_key=settings.openai_api_key
            )
            
            prompt_text = f"""Based on the following documents, please answer this question: {query}
            
            CONTENT TO ANALYSE:
            """
            
            for i, chunk in enumerate(mongo_chunks):
                prompt_text += f"\n--- Document {i+1} ---\n"
                
                raw_text = chunk.get("raw_text", "")
                if raw_text:
                    prompt_text += f"TEXT:\n{raw_text}\n\n"
                
                tables_html = chunk.get("tables_html", [])
                if tables_html:
                    prompt_text += "TABLES:\n"
                    for j, table in enumerate(tables_html):
                        prompt_text += f"Table {j+1}:\n{table}\n\n"
                
                prompt_text += "\n"
            
            prompt_text += """
            Please provide a clear, comprehensive answer using the text, tables, and images above. 
            If the documents don't contain sufficient information to answer the question, 
            say "I don't have enough information to answer that question based on the provided documents."
            
            ANSWER:"""
            
            message_content = [{"type": "text", "text": prompt_text}]
            
            # Add images to message
            num_images = 0
            for chunk in mongo_chunks:
                images_base64 = chunk.get("images_base64", [])
                
                for image_base64 in images_base64:
                    message_content.append({
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{image_base64}"
                        }
                    })
                    num_images += 1
            
            # Add image count to full prompt for logging
            full_prompt = prompt_text
            if num_images > 0:
                full_prompt += f"\n\n[Note: {num_images} image(s) included in the request]"
            
            message = HumanMessage(content=message_content)
            response = llm.invoke([message])
            
            return {
                "answer": response.content,
                "full_prompt": full_prompt
            }
            
        except Exception as e:
            error_msg = f"Sorry, I encountered an error while generating the answer: {str(e)}"
            return {
                "answer": error_msg,
                "full_prompt": f"Error occurred before prompt completion: {str(e)}"
            }

# Multi-Modal RAG for PDFs (Production-Oriented)

This project is a **production-style Multi-Modal Retrieval Augmented Generation (RAG) system** that enables users to safely query PDFs containing **text, tables, and images**, with a strong focus on **enterprise constraints** such as security, auditability, guardrails, and user-level data isolation.

Unlike demo-style RAG implementations, this system is designed with **real-world deployment, failure handling, and regulated environments** in mind.

---

## ✨ Key Features

- 📄 **Multi-Modal PDF Understanding**
  - Text, tables, and images extracted from PDFs
  - Layout-aware parsing using *Unstructured*
  - Tables preserved as atomic semantic units
  - Images converted into textual descriptions for retrieval

- 🧠 **Retrieval Augmented Generation (RAG)**
  - Embedding-based semantic search
  - Metadata-aware retrieval (user_id, document_id, page_no)
  - Retrieval confidence checks before generation

- 🔐 **User-Specific Access Control**
  - Strict data isolation using metadata filters
  - Prevents cross-user document leakage

- 🧱 **AI Guardrails (Multi-Layered)**
  - Input guardrails (sanitization, prompt injection detection)
  - Retrieval guardrails (confidence thresholds, scoped search)
  - Generation guardrails (grounded prompts, enforced refusal)
  - Post-generation validation & monitoring

- 🧾 **Auditability & Observability**
  - Full traceability: query → retrieved docs → prompt → response
  - Designed for compliance and incident review

- ⚙️ **Backend-Oriented Design**
  - Stateless APIs
  - Async document ingestion
  - Scalable vector search
  - Graceful degradation when LLMs are unavailable

---

## 🏗️ High-Level Architecture

```text
PDF Upload
   ↓
Unstructured Parsing
(Text / Tables / Images)
   ↓
Custom Chunking + Metadata Enrichment
(user_id, doc_id, page_no, modality)
   ↓
Embeddings Generation
   ↓
Vector Database
   ↓
Query Pipeline
(User Query + User Context)
   ↓
Filtered Retrieval + Confidence Check
   ↓
Constrained LLM Generation
   ↓
Post-Generation Validation & Audit Logs

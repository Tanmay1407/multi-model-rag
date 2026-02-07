#!/bin/bash

echo "🚀 Multi-Modal RAG FastAPI Server - Quick Start"
echo "=============================================="
echo ""

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install requirements
echo "📚 Installing dependencies..."
pip install -r requirements.txt

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found!"
    echo "📋 Copying .env.example to .env..."
    cp .env.example .env
    echo ""
    echo "⚠️  IMPORTANT: Edit .env file with your credentials:"
    echo "   - OPENAI_API_KEY"
    echo "   - MONGODB_URI"
    echo "   - (Optional) CHROMA_HOST and CHROMA_API_KEY"
    echo ""
    read -p "Press Enter after updating .env file to continue..."
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p uploads processed db

# Start server
echo ""
echo "✅ Starting FastAPI server..."
echo "📖 API Documentation: http://localhost:8000/docs"
echo "🏥 Health Check: http://localhost:8000/api/health"
echo ""

python main.py

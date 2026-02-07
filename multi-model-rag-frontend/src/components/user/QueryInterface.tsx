import { useState, FormEvent } from 'react';
import { X, Send, MapPin, User, Clock, ExternalLink, BarChart3, Table, Image } from 'lucide-react';
import { featuresService } from '../../services/featuresService';
import { authService } from '../../services/authService';
import type { Feature, FeatureQueryResponse, FeatureQuerySource } from '../../types';

interface QueryInterfaceProps {
  feature: Feature;
  onClose: () => void;
}

export function QueryInterface({ feature, onClose }: QueryInterfaceProps) {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<FeatureQueryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [retrievalOptions, setRetrievalOptions] = useState({
    k: 3
  });

  const user = authService.getUser();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await featuresService.queryFeature(feature.feature_id, {
        query: query.trim(),
        retrieval_options: retrievalOptions
      });
      setResponse(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to query feature');
    } finally {
      setIsLoading(false);
    }
  };

  const askNewQuestion = () => {
    setQuery('');
    setResponse(null);
    setError(null);
  };

  const renderSource = (source: FeatureQuerySource, index: number) => (
    <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center text-sm font-medium text-gray-900 mb-1">
            <ExternalLink className="w-4 h-4 mr-2" />
            {source.source_file}
          </div>
          
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <div className="flex items-center">
              <BarChart3 className="w-3 h-3 mr-1" />
              Relevance: {Math.round(source.relevance_score * 100)}%
            </div>
            
            {source.has_tables && (
              <div className="flex items-center text-blue-600">
                <Table className="w-3 h-3 mr-1" />
                Has tables
              </div>
            )}
            
            {source.has_images && (
              <div className="flex items-center text-green-600">
                <Image className="w-3 h-3 mr-1" />
                Has images
              </div>
            )}
          </div>
        </div>
        
        <div className="ml-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full"
              style={{ width: `${source.relevance_score * 100}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );

  const formatAnswer = (text: string) => {
    // Simple markdown-like formatting
    return text
      .split('\n')
      .map((line, index) => {
        if (line.trim() === '') return <br key={index} />;
        
        // Handle bold text
        const boldText = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        return (
          <p key={index} className="mb-2" dangerouslySetInnerHTML={{ __html: boldText }} />
        );
      });
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="query-interface-title"
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 id="query-interface-title" className="text-xl font-bold text-gray-900">
              Chat with "{feature.name}"
            </h2>
            {user && (
              <div className="flex items-center text-sm text-gray-600 mt-1">
                <MapPin className="w-3 h-3 mr-1" />
                {user.location || 'Location not set'}
                <span className="mx-2">•</span>
                <User className="w-3 h-3 mr-1" />
                {user.age ? `${user.age} years` : 'Age not set'}
                <span className="mx-2">•</span>
                <span className="capitalize">
                  {user.gender?.replace('_', ' ') || 'Gender not set'}
                </span>
              </div>
            )}
            <p className="text-xs text-blue-600 mt-1">
              {feature.file_count} document{feature.file_count !== 1 ? 's' : ''} available for your profile
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
            aria-label="Close modal"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Query Form */}
          {!response && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="What would you like to know? For example: 'What is the work from home policy?'"
                  rows={4}
                  disabled={isLoading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:bg-gray-100"
                  autoFocus
                  required
                />
              </div>

              {/* Advanced Options */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  {showAdvanced ? '▼' : '▶'} Advanced Options
                </button>
                
                {showAdvanced && (
                  <div className="mt-3 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">
                        Number of sources: {retrievalOptions.k}
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={retrievalOptions.k}
                        onChange={(e) => setRetrievalOptions(prev => ({
                          ...prev,
                          k: parseInt(e.target.value)
                        }))}
                        className="ml-4 w-32"
                      />
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={!query.trim() || isLoading}
                className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Searching documents...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Ask Question
                  </>
                )}
              </button>
            </form>
          )}

          {/* Error Message */}
          {error && (
            <div className="rounded-md bg-red-50 p-4 border border-red-200 mb-4">
              <p className="text-sm text-red-800">{error}</p>
              {error.includes('No documents available') && user && (
                <div className="mt-2 text-xs text-red-600">
                  <p><strong>Your profile:</strong></p>
                  <p>Location: {user.location || 'Not set'}</p>
                  <p>Age: {user.age || 'Not set'}</p>
                  <p>Gender: {user.gender?.replace('_', ' ') || 'Not set'}</p>
                </div>
              )}
            </div>
          )}

          {/* Response */}
          {response && (
            <div className="space-y-6">
              {/* Query */}
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                <p className="text-sm font-medium text-blue-800">Your Question:</p>
                <p className="text-blue-700 mt-1">{response.query}</p>
              </div>

              {/* Answer */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  💬 Answer:
                </h3>
                <div className="prose prose-sm max-w-none text-gray-700">
                  {formatAnswer(response.answer)}
                </div>
              </div>

              {/* Sources */}
              {response.sources.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                    📚 Sources ({response.sources.length}):
                  </h3>
                  <div className="space-y-3">
                    {response.sources.map((source, index) => renderSource(source, index))}
                  </div>
                </div>
              )}

              {/* Footer Info */}
              <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t border-gray-200">
                <div className="flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  Processing time: {response.processing_time.toFixed(2)}s
                </div>
                <div>
                  {response.accessible_files.length} accessible file{response.accessible_files.length !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Ask Another Question */}
              <button
                onClick={askNewQuestion}
                className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Ask Another Question
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
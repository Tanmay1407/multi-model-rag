import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { AlertTriangle, X } from 'lucide-react';

interface DeleteAccountModalProps {
  onClose: () => void;
}

export function DeleteAccountModal({ onClose }: DeleteAccountModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleDelete = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await authService.deleteAccount();
      
      // Clear all auth state
      authService.logout();
      
      // Show success message
      alert(
        `Account deleted successfully!\n\n` +
        `${response.deleted_files} files removed\n` +
        `${response.deleted_chat_sessions} chat sessions removed\n\n` +
        `You will be redirected to the login page.`
      );
      
      // Redirect to login page
      window.location.href = '/login';
      
    } catch (err) {
      setIsLoading(false);
      setError(err instanceof Error ? err.message : 'Failed to delete account');
    }
  };

  const isConfirmed = confirmText === 'DELETE';

  // Prevent closing modal during deletion
  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <AlertTriangle className="h-6 w-6 text-red-600 mr-3" />
            <h2 id="delete-modal-title" className="text-xl font-bold text-gray-900">
              Delete Your Account?
            </h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-500 disabled:opacity-50"
            aria-label="Close modal"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleDelete}>
          <div className="p-6">
            <div className="mb-4">
              <p className="text-sm text-gray-700 mb-3">
                This will permanently delete:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 mb-4">
                <li>Your user profile and credentials</li>
                <li>All your uploaded PDF files</li>
                <li>All your chat sessions and query history</li>
                <li>All your document chunks and embeddings</li>
                <li>All your pipeline runs</li>
              </ul>
              
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                <p className="text-sm font-bold text-red-800">
                  ⚠️ This action cannot be undone!
                </p>
                <p className="text-sm text-red-700 mt-1">
                  There is no way to recover your account or data after deletion.
                </p>
              </div>
            </div>

            <div className="mb-4">
              <label htmlFor="confirm-delete" className="block text-sm font-medium text-gray-700 mb-2">
                Type <span className="font-bold text-red-600">DELETE</span> to confirm:
              </label>
              <input
                id="confirm-delete"
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type DELETE"
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                autoComplete="off"
                autoFocus
              />
            </div>

            {error && (
              <div className="mb-4 rounded-md bg-red-50 p-4 border border-red-200">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {isLoading && (
              <div className="mb-4 flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600"></div>
                <span className="ml-3 text-sm text-gray-600">Deleting your account...</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isConfirmed || isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Deleting...' : 'Delete Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

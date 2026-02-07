/**
 * Format file size from bytes to human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Format date to relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(dateString: string): string {
  console.log('formatRelativeTime input:', dateString);
  const date = new Date(dateString);
  console.log('Parsed date (UTC):', date.toISOString());
  console.log('Parsed date (IST):', date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
  
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  console.log('Diff in seconds:', diffInSeconds);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  
  const result = date.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
  console.log('formatRelativeTime output:', result);
  return result;
}

/**
 * Format date to readable string in Indian Standard Time
 */
export function formatDate(dateString: string): string {
  console.log('formatDate input:', dateString);
  const date = new Date(dateString);
  console.log('Parsed date (UTC):', date.toISOString());
  
  const result = date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  console.log('formatDate output:', result);
  return result;
}

/**
 * Format processing time in milliseconds to readable format
 */
export function formatProcessingTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Truncate text to specified length with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

/**
 * Validate file type (PDF only)
 */
export function isValidFileType(file: File): boolean {
  const validTypes = ['application/pdf'];
  return validTypes.includes(file.type) || file.name.toLowerCase().endsWith('.pdf');
}

/**
 * Validate file size
 */
export function isValidFileSize(file: File, maxSizeInBytes: number = 52428800): boolean {
  return file.size <= maxSizeInBytes;
}

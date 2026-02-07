import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { AlertTriangle } from 'lucide-react';

interface AdminRouteProps {
  children: ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const user = authService.getUser();
  const isAdmin = authService.isAdmin();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="rounded-md bg-red-50 p-6 max-w-md border border-red-200">
          <div className="flex">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            <div className="ml-3">
              <h3 className="text-lg font-medium text-red-800">Access Denied</h3>
              <p className="mt-2 text-sm text-red-700">
                You need administrator privileges to access this page.
              </p>
              <p className="mt-1 text-xs text-red-600">
                Your current role: {user.role || 'user'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
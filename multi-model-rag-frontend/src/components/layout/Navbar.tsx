import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Upload, Activity, MessageSquare, LogOut, User, UserCircle, Settings, Users } from 'lucide-react';
import { authService } from '../../services/authService';

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = authService.getUser();
  const isAdmin = authService.isAdmin();

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  // Role-based navigation items
  const navItems = [
    // Common items for all users
    { path: '/upload', label: 'Upload Files', icon: Upload },
    { path: '/pipeline', label: 'Pipeline Status', icon: Activity },
    { path: '/chat', label: 'Chat', icon: MessageSquare },
    
    // Features section - different for admin vs user
    ...(isAdmin 
      ? [{ path: '/admin/features', label: 'Manage Features', icon: Settings }]
      : [{ path: '/features', label: 'Features', icon: Users }]
    ),
    
    // Profile for all users
    { path: '/profile', label: 'Profile', icon: UserCircle },
  ];

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Multi-Modal RAG</h1>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navItems.map(({ path, label, icon: Icon }) => (
                <Link
                  key={path}
                  to={path}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isActive(path)
                      ? 'border-primary text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {label}
                </Link>
              ))}
            </div>
          </div>
          
          {user && (
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-sm text-gray-700">
                <User className="w-4 h-4 mr-2" />
                <div className="flex flex-col">
                  <span className="font-medium">{user.username}</span>
                  {isAdmin && (
                    <span className="text-xs text-blue-600 font-semibold">ADMIN</span>
                  )}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

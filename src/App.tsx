import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import Titlebar from '@/components/layout/Titlebar';
import Sidebar from '@/components/layout/Sidebar';
import ModDetailModal from '@/components/mod/ModDetailModal';
import PublishModModal from '@/components/mod/PublishModModal';
import AuthModal from '@/components/auth/AuthModal';
import DynamicIsland from '@/components/dynamic-island/DynamicIsland';
import HomePage from '@/pages/HomePage';
import ProfilePage from '@/pages/ProfilePage';
import DownloadsPage from '@/pages/DownloadsPage';
import FavoritesPage from '@/pages/FavoritesPage';
import CartPage from '@/pages/CartPage';
import SettingsPage from '@/pages/SettingsPage';
import CreditsPage from '@/pages/CreditsPage';

function AppContent() {
  const { currentPage } = useUIStore();

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage />;
      case 'profile':
        return <ProfilePage />;
      case 'downloads':
        return <DownloadsPage />;
      case 'favorites':
        return <FavoritesPage />;
      case 'cart':
        return <CartPage />;
      case 'settings':
        return <SettingsPage />;
      case 'credits':
        return <CreditsPage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentPage}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25 }}
        className="h-full"
      >
        {renderPage()}
      </motion.div>
    </AnimatePresence>
  );
}

function App() {
  const { authModal } = useUIStore();

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      useAuthStore.getState().fetchProfile();
    }
    useNotificationStore.getState().fetchNotifications();
    const interval = setInterval(() => {
      if (localStorage.getItem('access_token')) {
        useNotificationStore.getState().fetchNotifications();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-screen w-screen bg-background overflow-hidden text-foreground">
      {/* Sidebar */}
      <Sidebar />

      {/* Titlebar */}
      <Titlebar />

      {/* Main Content */}
      <main className="absolute top-[50px] left-16 right-0 bottom-0 overflow-hidden">
        <AppContent />
      </main>

      {/* Overlays */}
      <ModDetailModal />
      <PublishModModal />
      {authModal !== 'none' && <AuthModal />}
      <DynamicIsland />

      {/* Toast notifications */}
      <Toaster
        position="top-left"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1A1A1E',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.08)',
            fontSize: '13px',
            borderRadius: '10px',
          },
          success: {
            iconTheme: {
              primary: '#e4e4e7',
              secondary: '#1A1A1E',
            },
          },
          error: {
            iconTheme: {
              primary: '#a1a1aa',
              secondary: '#1A1A1E',
            },
          },
        }}
      />
    </div>
  );
}

export default App;

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
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
import AdminPage from '@/pages/AdminPage';

const PAGES = ['home', 'profile', 'downloads', 'favorites', 'cart', 'settings', 'credits', 'admin'] as const;

function AppContent() {
  const { currentPage } = useUIStore();
  const prevPageRef = useRef(currentPage);

  // Track previous page for direction
  useEffect(() => {
    prevPageRef.current = currentPage;
  }, [currentPage]);

  return (
    <div className="relative h-full">
      {PAGES.map((page) => (
        <motion.div
          key={page}
          initial={false}
          animate={{
            opacity: currentPage === page ? 1 : 0,
            y: currentPage === page ? 0 : 8,
          }}
          transition={{ duration: 0.15 }}
          className={`absolute inset-0 overflow-hidden ${currentPage === page ? 'z-10' : 'z-0 pointer-events-none'}`}
          aria-hidden={currentPage !== page}
        >
          {page === 'home' && <HomePage />}
          {page === 'profile' && <ProfilePage />}
          {page === 'downloads' && <DownloadsPage />}
          {page === 'favorites' && <FavoritesPage />}
          {page === 'cart' && <CartPage />}
          {page === 'settings' && <SettingsPage />}
          {page === 'credits' && <CreditsPage />}
          {page === 'admin' && <AdminPage />}
        </motion.div>
      ))}
    </div>
  );
}

function App() {
  const { authModal } = useUIStore();

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      useAuthStore.getState().fetchProfile();
      useNotificationStore.getState().fetchNotifications();
    }
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
      <main className="absolute top-[42px] left-[80px] right-2 bottom-2 rounded-2xl bg-background/90 backdrop-blur-xl border border-foreground/[0.06] overflow-hidden">
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

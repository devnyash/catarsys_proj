import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { authApi } from '@/api/auth';
import { api } from '@/api/client';
import { useAuthStore } from '@/store/authStore';

export default function TelegramCallback() {
  const [error, setError] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');
      const storedState = sessionStorage.getItem('tg_oidc_state');

      if (!code || !state) {
        setError('Неверные параметры авторизации');
        return;
      }

      if (state !== storedState) {
        setError('Ошибка безопасности: неверный state');
        return;
      }

      try {
        const res = await authApi.telegramCallback({ code, state });
        api.setTokens(res.tokens.access_token, res.tokens.refresh_token);

        const user = {
          id: res.user.id,
          email: res.user.email,
          username: res.user.username,
          displayName: res.user.username,
          avatar: '',
          isVerified: true,
          isActive: true,
          isBanned: false,
          role: res.user.role as 'user' | 'moderator' | 'admin' | 'superadmin',
          balance: res.balance ?? 0,
          followersCount: 0,
          followingCount: 0,
          socials: {},
          createdAt: new Date().toISOString(),
        };

        useAuthStore.setState({ user, isAuthenticated: true, isLoading: false });
        sessionStorage.removeItem('tg_oidc_state');
        window.location.href = '/';
      } catch (err) {
        setError('Ошибка авторизации через Telegram');
        console.error(err);
      }
    };

    handleCallback();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        {error ? (
          <>
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
              <span className="text-2xl">✕</span>
            </div>
            <p className="text-foreground">{error}</p>
            <a
              href="/"
              className="px-4 py-2 bg-foreground text-background rounded-lg text-sm inline-block"
            >
              На главную
            </a>
          </>
        ) : (
          <>
            <Loader2 className="w-8 h-8 animate-spin text-foreground mx-auto" />
            <p className="text-muted-foreground">Авторизация через Telegram...</p>
          </>
        )}
      </div>
    </div>
  );
}

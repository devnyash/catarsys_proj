import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, User, ArrowRight, Shield, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import toast from 'react-hot-toast';

export default function AuthModal() {
  const { authModal, setAuthModal } = useUIStore();
  const { login, register } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    if (resendCooldown > 0) {
      intervalRef.current = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [resendCooldown]);

  useEffect(() => {
    if (authModal !== 'verify' && authModal !== '2fa') {
      setOtpCode('');
      setOtpError(false);
      setResendCooldown(0);
      setTempToken('');
    }
  }, [authModal]);

  if (authModal === 'none') return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Пожалуйста, заполните все поля');
      return;
    }
    setIsLoading(true);
    try {
      const result = await login(email, password);
      setIsLoading(false);
      if (result.success) {
        toast.success('С возвращением!');
        setAuthModal('none');
      } else if (result.needs_2fa) {
        setTempToken('');
        setAuthModal('2fa');
      }
    } catch {
      setIsLoading(false);
      toast.error('Неверный email или пароль');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !username || !password || !confirmPassword) {
      toast.error('Пожалуйста, заполните все поля');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Пароли не совпадают');
      return;
    }
    if (password.length < 8) {
      toast.error('Пароль должен содержать минимум 8 символов');
      return;
    }
    setIsLoading(true);
    const success = await register(email, username, password);
    setIsLoading(false);
    if (success) {
      toast.success('Аккаунт создан! Добро пожаловать!');
      setAuthModal('none');
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        onClick={() => setAuthModal('none')}
      >
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md bg-[#1A1A1E] border border-white/[0.1] rounded-2xl overflow-hidden shadow-2xl shadow-black/50"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close */}
          <button
            onClick={() => setAuthModal('none')}
            className="absolute top-3 right-3 p-2 bg-black/50 hover:bg-black/70 rounded-full text-zinc-400 hover:text-white transition-colors z-10"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="p-6">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-rose-700 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-rose-500/20">
                <span className="text-white font-bold text-lg">C</span>
              </div>
              <h2 className="text-xl font-bold text-white">
                {authModal === 'login' ? 'С возвращением' : 'Создать аккаунт'}
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                {authModal === 'login'
                  ? 'Войдите в свой аккаунт Catarsys'
                  : 'Присоединяйтесь к сообществу Catarsys'}
              </p>
            </div>

            {/* Form */}
            {authModal === 'verify' || authModal === '2fa' ? (
              <div className="space-y-4">
                <div className="text-center">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg ${authModal === '2fa' ? 'bg-gradient-to-br from-amber-500 to-amber-700 shadow-amber-500/20' : 'bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-emerald-500/20'}`}>
                    {authModal === '2fa' ? <Shield className="w-5 h-5 text-white" /> : <Mail className="w-5 h-5 text-white" />}
                  </div>
                  <h3 className="text-lg font-bold text-white">
                    {authModal === '2fa' ? 'Двухфакторная аутентификация' : 'Подтвердите email'}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1">
                    {authModal === '2fa' ? 'Введите 6-значный код из приложения-аутентификатора' : 'Мы отправили 6-значный код на ваш email'}
                  </p>
                </div>

                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={otpCode}
                    onChange={(value) => { setOtpCode(value); setOtpError(false); }}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                {otpError && (
                  <p className="text-[11px] text-rose-400 text-center">
                    Неверный код. Попробуйте снова.
                  </p>
                )}

                <button
                  onClick={async () => {
                    if (otpCode.length !== 6) {
                      toast.error('Пожалуйста, введите 6-значный код');
                      return;
                    }
                    setIsVerifying(true);
                    try {
                      if (authModal === '2fa') {
                        const { verify2FA } = useAuthStore.getState();
                        const success = await verify2FA(otpCode, tempToken);
                        if (success) {
                          toast.success('2FA подтвержден!');
                          setAuthModal('none');
                        }
                      } else {
                        const { verifyEmail } = useAuthStore.getState();
                        const success = await verifyEmail(otpCode);
                        if (success) {
                          toast.success('Email подтвержден!');
                          setAuthModal('none');
                        } else {
                          setOtpError(true);
                        }
                      }
                    } catch {
                      setOtpError(true);
                    } finally {
                      setIsVerifying(false);
                    }
                  }}
                  disabled={isVerifying || otpCode.length !== 6}
                  className="w-full h-10 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isVerifying ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      {authModal === '2fa' ? 'Подтвердить 2FA' : 'Подтвердить'}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="text-center">
                  {resendCooldown > 0 ? (
                    <span className="text-xs text-zinc-500">
                      Отправить повторно через {resendCooldown}с
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        setResendCooldown(60);
                        toast.success('Код отправлен повторно!');
                      }}
                      className="text-xs text-rose-400 hover:text-rose-300 transition-colors"
                    >
                      Отправить повторно
                    </button>
                  )}
                </div>
              </div>
            ) : authModal === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-3">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-10 bg-zinc-800/60 border border-white/[0.06] rounded-lg pl-10 pr-3 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-rose-500/50 transition-colors"
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="password"
                    placeholder="Пароль"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-10 bg-zinc-800/60 border border-white/[0.06] rounded-lg pl-10 pr-3 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-rose-500/50 transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-10 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Войти
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-3">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-10 bg-zinc-800/60 border border-white/[0.06] rounded-lg pl-10 pr-3 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-rose-500/50 transition-colors"
                  />
                </div>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Имя пользователя"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full h-10 bg-zinc-800/60 border border-white/[0.06] rounded-lg pl-10 pr-3 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-rose-500/50 transition-colors"
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="password"
                    placeholder="Пароль (мин 8 символов)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-10 bg-zinc-800/60 border border-white/[0.06] rounded-lg pl-10 pr-3 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-rose-500/50 transition-colors"
                  />
                </div>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="password"
                    placeholder="Подтвердите пароль"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full h-10 bg-zinc-800/60 border border-white/[0.06] rounded-lg pl-10 pr-3 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-rose-500/50 transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-10 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Создать аккаунт
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Toggle */}
            <div className="mt-4 text-center">
              <button
                onClick={() =>
                  setAuthModal(authModal === 'login' ? 'register' : 'login')
                }
                className="text-xs text-zinc-500 hover:text-rose-400 transition-colors"
              >
                {authModal === 'login'
                  ? 'Нет аккаунта? Зарегистрироваться'
                  : 'Уже есть аккаунт? Войти'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

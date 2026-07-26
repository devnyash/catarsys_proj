import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, User, ArrowRight, Shield, Loader2, Upload, AtSign, Camera } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import UserAvatar from '@/components/ui/UserAvatar';
import toast from 'react-hot-toast';

export default function AuthModal() {
  const { authModal, setAuthModal } = useUIStore();
  const { login, register, updateProfile } = useAuthStore();

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
  const [onboardAvatar, setOnboardAvatar] = useState('');
  const [onboardUsername, setOnboardUsername] = useState('');
  const [onboardDragging, setOnboardDragging] = useState(false);
  const [onboardSaving, setOnboardSaving] = useState(false);
  const onboardFileRef = useRef<HTMLInputElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const readOnboardImage = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Выберите изображение');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setOnboardAvatar(reader.result as string);
    reader.readAsDataURL(file);
  };

  const finishOnboarding = async () => {
    const uname = onboardUsername.trim().replace(/^@+/, '');
    setOnboardSaving(true);
    try {
      await updateProfile({
        username: uname || undefined,
        avatar: onboardAvatar || undefined,
      });
      toast.success('Добро пожаловать в Catarsys!');
      setAuthModal('none');
    } catch {
      toast.error('Не удалось сохранить профиль');
    } finally {
      setOnboardSaving(false);
    }
  };

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
    if (!/[A-Z]/.test(password)) {
      toast.error('Пароль должен содержать хотя бы одну заглавную букву');
      return;
    }
    if (!/\d/.test(password)) {
      toast.error('Пароль должен содержать хотя бы одну цифру');
      return;
    }
    setIsLoading(true);
    try {
      const success = await register(email, username, password);
      if (success) {
        toast.success('Аккаунт создан!');
        setOnboardUsername(username);
        setAuthModal('onboarding');
      }
    } catch (error: any) {
      // Show backend validation error if available
      const msg = error?.message || 'Не удалось зарегистрироваться';
      toast.error(msg);
    } finally {
      setIsLoading(false);
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
          className="relative w-full max-w-md bg-card border border-foreground/[0.1] rounded-2xl overflow-hidden shadow-2xl shadow-black/50"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close */}
          <button
            onClick={() => setAuthModal('none')}
            className="absolute top-3 right-3 p-2 bg-black/50 hover:bg-black/70 rounded-full text-zinc-400 hover:text-foreground transition-colors z-10"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="p-6">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-zinc-500 to-zinc-700 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-zinc-500/20">
                <span className="text-foreground font-bold text-lg">C</span>
              </div>
              <h2 className="text-xl font-bold text-foreground">
                {authModal === 'login' ? 'С возвращением' : authModal === 'onboarding' ? 'Настройка профиля' : 'Создать аккаунт'}
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                {authModal === 'login'
                  ? 'Войдите в свой аккаунт Catarsys'
                  : authModal === 'onboarding'
                  ? 'Добавьте аватар и выберите юзернейм'
                  : 'Присоединяйтесь к сообществу Catarsys'}
              </p>
            </div>

            {/* Form */}
            {authModal === 'onboarding' ? (
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-3">
                  <div
                    className={`relative rounded-full transition-colors ${onboardDragging ? 'ring-2 ring-foreground ring-offset-2 ring-offset-card' : ''}`}
                    onDragOver={(e) => { e.preventDefault(); setOnboardDragging(true); }}
                    onDragLeave={() => setOnboardDragging(false)}
                    onDrop={(e) => { e.preventDefault(); setOnboardDragging(false); const f = e.dataTransfer.files?.[0]; if (f) readOnboardImage(f); }}
                    onClick={() => onboardFileRef.current?.click()}
                    title="Перетащите изображение или нажмите, чтобы выбрать"
                    role="button"
                  >
                    <UserAvatar name={onboardUsername} src={onboardAvatar} className="w-20 h-20 text-2xl cursor-pointer" />
                    <div className="absolute -bottom-1 -right-1 p-1.5 bg-foreground text-background rounded-full">
                      <Camera className="w-3.5 h-3.5" />
                    </div>
                    <input ref={onboardFileRef} type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) readOnboardImage(f); }} className="hidden" />
                  </div>
                  <p className="text-[11px] text-zinc-500 text-center flex items-center gap-1.5">
                    <Upload className="w-3 h-3" /> Перетащите фото сюда или нажмите для выбора
                  </p>
                </div>

                <div className="relative">
                  <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="example"
                    value={onboardUsername}
                    onChange={(e) => setOnboardUsername(e.target.value.replace(/^@+/, ''))}
                    className="w-full h-10 bg-foreground/10 border border-foreground/[0.06] rounded-lg pl-10 pr-3 text-sm text-foreground placeholder:text-zinc-500 outline-none focus:border-zinc-500/50 transition-colors"
                  />
                </div>

                <button
                  onClick={finishOnboarding}
                  disabled={onboardSaving}
                  className="w-full h-10 bg-foreground hover:bg-foreground/90 text-background text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {onboardSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : (<><ArrowRight className="w-4 h-4" />Продолжить</>)}
                </button>

                <button
                  onClick={() => setAuthModal('none')}
                  className="w-full text-xs text-zinc-500 hover:text-zinc-400 transition-colors"
                >
                  Пропустить
                </button>
              </div>
            ) : authModal === 'verify' || authModal === '2fa' ? (
              <div className="space-y-4">
                <div className="text-center">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg ${authModal === '2fa' ? 'bg-gradient-to-br from-zinc-500 to-zinc-700 shadow-zinc-500/20' : 'bg-gradient-to-br from-zinc-500 to-zinc-700 shadow-zinc-500/20'}`}>
                    {authModal === '2fa' ? <Shield className="w-5 h-5 text-foreground" /> : <Mail className="w-5 h-5 text-foreground" />}
                  </div>
                  <h3 className="text-lg font-bold text-foreground">
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
                  <p className="text-[11px] text-zinc-400 text-center">
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
                          setOnboardUsername(username);
                          setAuthModal('onboarding');
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
                  className="w-full h-10 bg-foreground hover:bg-foreground/90 text-background text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isVerifying ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <ArrowRight className="w-4 h-4" />
                      {authModal === '2fa' ? 'Подтвердить 2FA' : 'Подтвердить'}
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
                      className="text-xs text-zinc-400 hover:text-zinc-300 transition-colors"
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
                    className="w-full h-10 bg-foreground/10 border border-foreground/[0.06] rounded-lg pl-10 pr-3 text-sm text-foreground placeholder:text-zinc-500 outline-none focus:border-zinc-500/50 transition-colors"
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="password"
                    placeholder="Пароль"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-10 bg-foreground/10 border border-foreground/[0.06] rounded-lg pl-10 pr-3 text-sm text-foreground placeholder:text-zinc-500 outline-none focus:border-zinc-500/50 transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-10 bg-foreground hover:bg-foreground/90 text-background text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                  ) : (
                    <>
                      <ArrowRight className="w-4 h-4" />
                      Войти
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
                    className="w-full h-10 bg-foreground/10 border border-foreground/[0.06] rounded-lg pl-10 pr-3 text-sm text-foreground placeholder:text-zinc-500 outline-none focus:border-zinc-500/50 transition-colors"
                  />
                </div>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Имя пользователя"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full h-10 bg-foreground/10 border border-foreground/[0.06] rounded-lg pl-10 pr-3 text-sm text-foreground placeholder:text-zinc-500 outline-none focus:border-zinc-500/50 transition-colors"
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="password"
                    placeholder="Пароль (мин 8 символов)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-10 bg-foreground/10 border border-foreground/[0.06] rounded-lg pl-10 pr-3 text-sm text-foreground placeholder:text-zinc-500 outline-none focus:border-zinc-500/50 transition-colors"
                  />
                </div>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="password"
                    placeholder="Подтвердите пароль"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full h-10 bg-foreground/10 border border-foreground/[0.06] rounded-lg pl-10 pr-3 text-sm text-foreground placeholder:text-zinc-500 outline-none focus:border-zinc-500/50 transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-10 bg-foreground hover:bg-foreground/90 text-background text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                  ) : (
                    <>
                      <ArrowRight className="w-4 h-4" />
                      Создать аккаунт
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Toggle */}
            {(authModal === 'login' || authModal === 'register') && (
              <div className="mt-4 text-center">
                <button
                  onClick={() =>
                    setAuthModal(authModal === 'login' ? 'register' : 'login')
                  }
                  className="text-xs text-zinc-500 hover:text-zinc-400 transition-colors"
                >
                  {authModal === 'login'
                    ? 'Нет аккаунта? Зарегистрироваться'
                    : 'Уже есть аккаунт? Войти'}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

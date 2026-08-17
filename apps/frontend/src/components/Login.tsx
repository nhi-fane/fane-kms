import React, { useState, useEffect } from 'react';
import { Lock, Mail, Loader2, ArrowRight, Eye, EyeOff, KeyRound } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (token: string, user: any) => void;
}

type ViewState = 'login' | 'forgot' | 'reset' | 'force-change';

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [view, setView] = useState<ViewState>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Forgot/Reset state
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Force change state
  const [tempToken, setTempToken] = useState('');
  const [tempUser, setTempUser] = useState<any>(null);

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // Check URL for reset token
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('resetToken');
    if (tokenFromUrl) {
      setResetToken(tokenFromUrl);
      setView('reset');
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Login failed');

      if (data.user.requirePasswordChange) {
        setTempToken(data.token);
        setTempUser(data.user);
        setView('force-change');
      } else {
        onLoginSuccess(data.token, data.user);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForceChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu nhập lại không khớp');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${baseUrl}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tempToken}`,
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ oldPassword: password, newPassword })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Change password failed');

      // Success, proceed to login
      onLoginSuccess(tempToken, { ...tempUser, requirePasswordChange: false });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const response = await fetch(`${baseUrl}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({ recoveryEmail })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Request failed');

      setMessage(data.message);
      // For dev/testing without SMTP, we log the token
      if (data._dev_token) {
        console.log("DEV TOKEN:", data._dev_token);
        setMessage(data.message + ` (Dev Token in console)`);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu nhập lại không khớp');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${baseUrl}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({ token: resetToken, newPassword })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Reset failed');

      setMessage('Đổi mật khẩu thành công. Vui lòng đăng nhập lại.');
      setTimeout(() => {
        setView('login');
        setPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-dark p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent-purple/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent-blue/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="glass-panel w-full max-w-md p-8 relative z-10 border border-white/10 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-accent-purple to-accent-blue mb-2">
            FanE OS
          </h1>
          <p className="text-text-muted">
            {view === 'login' && 'Đăng nhập hệ thống Quản lý FanE OS'}
            {view === 'forgot' && 'Khôi phục mật khẩu'}
            {view === 'reset' && 'Đặt lại mật khẩu mới'}
            {view === 'force-change' && 'Yêu cầu đổi mật khẩu lần đầu'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm text-center">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-6 p-3 bg-green-500/10 border border-green-500/50 rounded-lg text-green-400 text-sm text-center">
            {message}
          </div>
        )}

        {view === 'login' && (
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm text-text-muted ml-1">Corporate email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={20} />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  placeholder="nhitv@fantasticeggs.vn"
                  className="w-full bg-background-card border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-accent-purple transition-colors"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-text-muted ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={20} />
                <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required
                  placeholder="••••••••"
                  className="w-full bg-background-card border border-white/10 rounded-lg py-3 pl-10 pr-12 text-white focus:outline-none focus:border-accent-purple transition-colors"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white transition-colors">
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <button type="button" onClick={() => { setView('forgot'); setError(''); setMessage(''); }} className="text-sm text-accent-blue hover:text-white transition-colors">
                Forgot password?
              </button>
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-accent-purple to-accent-blue hover:from-accent-purple/80 hover:to-accent-blue/80 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50">
              {loading ? <Loader2 className="animate-spin" size={20} /> : 'Log in'}
              {!loading && <ArrowRight size={20} />}
            </button>
          </form>
        )}

        {view === 'forgot' && (
          <form onSubmit={handleForgot} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm text-text-muted ml-1">Email khôi phục</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={20} />
                <input type="email" value={recoveryEmail} onChange={e => setRecoveryEmail(e.target.value)} required
                  placeholder="nhitv@fantasticeggs.vn"
                  className="w-full bg-background-card border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-accent-purple transition-colors"
                />
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-accent-purple to-accent-blue hover:from-accent-purple/80 hover:to-accent-blue/80 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50">
              {loading ? <Loader2 className="animate-spin" size={20} /> : 'Gửi link khôi phục'}
            </button>
            <button type="button" onClick={() => { setView('login'); setError(''); setMessage(''); }} className="w-full text-center text-sm text-text-muted hover:text-white transition-colors">
              Quay lại Đăng nhập
            </button>
          </form>
        )}

        {view === 'force-change' && (
          <form onSubmit={handleForceChange} className="space-y-6">
            <div className="p-3 bg-orange-500/10 border border-orange-500/50 rounded-lg text-orange-400 text-sm text-center mb-4">
              Vì lý do bảo mật, vui lòng đổi mật khẩu ở lần đăng nhập đầu tiên.
            </div>
            <div className="space-y-2">
              <label className="text-sm text-text-muted ml-1">Mật khẩu mới</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={20} />
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6}
                  placeholder="Nhập mật khẩu mới"
                  className="w-full bg-background-card border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-accent-purple transition-colors"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-text-muted ml-1">Xác nhận mật khẩu mới</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={20} />
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={6}
                  placeholder="Nhập lại mật khẩu mới"
                  className="w-full bg-background-card border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-accent-purple transition-colors"
                />
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-500/80 hover:to-red-500/80 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50">
              {loading ? <Loader2 className="animate-spin" size={20} /> : 'Đổi mật khẩu & Vào hệ thống'}
            </button>
            <button type="button" onClick={() => { setView('login'); setError(''); setTempToken(''); setPassword(''); }} className="w-full text-center text-sm text-text-muted hover:text-white transition-colors">
              Hủy
            </button>
          </form>
        )}

        {view === 'reset' && (
          <form onSubmit={handleReset} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm text-text-muted ml-1">Mật khẩu mới</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={20} />
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6}
                  placeholder="Nhập mật khẩu mới"
                  className="w-full bg-background-card border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-accent-purple transition-colors"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-text-muted ml-1">Xác nhận mật khẩu mới</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={20} />
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={6}
                  placeholder="Nhập lại mật khẩu mới"
                  className="w-full bg-background-card border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-accent-purple transition-colors"
                />
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-accent-purple to-accent-blue hover:from-accent-purple/80 hover:to-accent-blue/80 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50">
              {loading ? <Loader2 className="animate-spin" size={20} /> : 'Lưu mật khẩu mới'}
            </button>
            <button type="button" onClick={() => { setView('login'); setError(''); setMessage(''); window.history.replaceState({}, document.title, window.location.pathname); }} className="w-full text-center text-sm text-text-muted hover:text-white transition-colors">
              Quay lại Đăng nhập
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

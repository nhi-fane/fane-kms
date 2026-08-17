import React, { useState, useEffect } from 'react';
import { User, Lock, Mail, Save, Loader2 } from 'lucide-react';

interface MyProfileProps {
  token: string | null;
}

export const MyProfile: React.FC<MyProfileProps> = ({ token }) => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [telegramId, setTelegramId] = useState('');

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });

  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  async function fetchProfile() {
    try {
      const res = await fetch(`${baseUrl}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true'
        }
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setRecoveryEmail(data.recoveryEmail || '');
        setTelegramId(data.telegramId || '');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProfile();
  }, [token]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg({ type: '', text: '' });
    try {
      const res = await fetch(`${baseUrl}/api/auth/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ recoveryEmail, telegramId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update');
      setProfileMsg({ type: 'success', text: 'Cập nhật thông tin thành công' });
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err.message });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg({ type: '', text: '' });
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Mật khẩu xác nhận không khớp' });
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch(`${baseUrl}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ oldPassword, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change password');
      setPasswordMsg({ type: 'success', text: 'Đổi mật khẩu thành công' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err.message });
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-accent-purple" size={32} /></div>;
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in max-w-4xl mx-auto w-full">
      <div className="flex items-center gap-3 mb-2">
        <User className="text-accent-blue" size={32} />
        <h2 className="text-3xl font-bold text-white m-0">My Profile</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Profile Info Form */}
        <div className="glass-panel p-6 flex flex-col gap-6 border border-white/10 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent-blue/10 blur-[50px] rounded-full pointer-events-none" />
          <h3 className="text-xl font-semibold text-white flex items-center gap-2">
            <Mail className="text-accent-blue" size={20} /> Information
          </h3>

          {profileMsg.text && (
            <div className={`p-3 rounded-lg text-sm ${profileMsg.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/50' : 'bg-green-500/10 text-green-400 border border-green-500/50'}`}>
              {profileMsg.text}
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4 relative z-10">
            <div className="space-y-1">
              <label className="text-sm text-text-muted">Họ và tên</label>
              <input type="text" value={profile?.fullName || ''} disabled className="w-full bg-background/50 border border-white/5 rounded-lg py-2 px-3 text-text-muted cursor-not-allowed" />
            </div>

            <div className="space-y-1">
              <label className="text-sm text-text-muted">Email đăng nhập</label>
              <input type="email" value={profile?.email || ''} disabled className="w-full bg-background/50 border border-white/5 rounded-lg py-2 px-3 text-text-muted cursor-not-allowed" />
            </div>

            <div className="space-y-1">
              <label className="text-sm text-text-muted">Email khôi phục mật khẩu</label>
              <input type="email" value={recoveryEmail} onChange={e => setRecoveryEmail(e.target.value)} placeholder="your.personal@gmail.com" className="w-full bg-background-card border border-white/10 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-accent-blue transition-colors" />
            </div>

            <div className="space-y-1">
              <label className="text-sm text-text-muted">Telegram ID</label>
              <input type="text" value={telegramId} onChange={e => setTelegramId(e.target.value)} placeholder="5925705298" className="w-full bg-background-card border border-white/10 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-accent-blue transition-colors" />
            </div>

            <button type="submit" disabled={savingProfile} className="mt-2 w-full bg-surface-light hover:bg-white/10 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors border border-white/10">
              {savingProfile ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Save
            </button>
          </form>
        </div>

        {/* Change Password Form */}
        <div className="glass-panel p-6 flex flex-col gap-6 border border-white/10 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent-purple/10 blur-[50px] rounded-full pointer-events-none" />
          <h3 className="text-xl font-semibold text-white flex items-center gap-2">
            <Lock className="text-accent-purple" size={20} /> Đổi mật khẩu
          </h3>

          {passwordMsg.text && (
            <div className={`p-3 rounded-lg text-sm ${passwordMsg.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/50' : 'bg-green-500/10 text-green-400 border border-green-500/50'}`}>
              {passwordMsg.text}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4 relative z-10">
            <div className="space-y-1">
              <label className="text-sm text-text-muted">Mật khẩu cũ</label>
              <input type="password" required value={oldPassword} onChange={e => setOldPassword(e.target.value)} className="w-full bg-background-card border border-white/10 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-accent-purple transition-colors" />
            </div>

            <div className="space-y-1">
              <label className="text-sm text-text-muted">Mật khẩu mới (tối thiểu 6 ký tự)</label>
              <input type="password" required minLength={6} value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-background-card border border-white/10 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-accent-purple transition-colors" />
            </div>

            <div className="space-y-1">
              <label className="text-sm text-text-muted">Xác nhận mật khẩu mới</label>
              <input type="password" required minLength={6} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full bg-background-card border border-white/10 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-accent-purple transition-colors" />
            </div>

            <button type="submit" disabled={savingPassword} className="mt-2 w-full bg-gradient-to-r from-accent-purple to-accent-blue hover:from-accent-purple/80 hover:to-accent-blue/80 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all">
              {savingPassword ? <Loader2 className="animate-spin" size={18} /> : <Lock size={18} />} Đổi mật khẩu
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Users, Key, Search, Loader2, Save, Undo2, Plus, PowerOff, Power } from 'lucide-react';
import type { Staff, FieldError } from '../hooks/useDashboardData';
import type { DraftState } from './AdminPortal';

// --- StaffRow Component ---
interface StaffRowProps {
  staff: Staff & { _uiKey: string };
  isAdded: boolean;
  isUpdated: boolean;
  onChange: (uiKey: string, field: keyof Staff, value: any) => void;
  onToggleActive: (uiKey: string, isActive: boolean) => void;
  onResetPassword: (staffId: string) => void;
  errors: FieldError[];
  isResetting: boolean;
  roleOptions: string[];
}

const StaffRow = React.memo(({ staff, isAdded, isUpdated, onChange, onToggleActive, onResetPassword, errors, isResetting, roleOptions }: StaffRowProps) => {
  const [localData, setLocalData] = useState({
    staffId: staff.staffId,
    fullName: staff.fullName,
    role: staff.role,
    team: staff.team,
    email: staff.email || '',
    level: staff.level || 1,
    standardHoursPerDay: staff.standardHoursPerDay || 8
  });
  
  const [isCreatingRole, setIsCreatingRole] = useState(false);

  useEffect(() => {
    setLocalData({
      staffId: staff.staffId,
      fullName: staff.fullName,
      role: staff.role,
      team: staff.team,
      email: staff.email || '',
      level: staff.level || 1,
      standardHoursPerDay: staff.standardHoursPerDay || 8
    });
  }, [staff]);

  const localDataRef = useRef(localData);
  useEffect(() => {
    localDataRef.current = localData;
  }, [localData]);

  useEffect(() => {
    return () => {
      const current = localDataRef.current;
      if (current.staffId !== staff.staffId && current.staffId.trim()) onChange(staff._uiKey, 'staffId', current.staffId);
      if (current.fullName !== staff.fullName && current.fullName.trim()) onChange(staff._uiKey, 'fullName', current.fullName);
      if (current.role !== staff.role) onChange(staff._uiKey, 'role', current.role);
      if (current.team !== staff.team) onChange(staff._uiKey, 'team', current.team);
      if (current.email !== staff.email) onChange(staff._uiKey, 'email', current.email);
      if (current.level !== staff.level) onChange(staff._uiKey, 'level', Number(current.level));
      if (current.standardHoursPerDay !== staff.standardHoursPerDay) onChange(staff._uiKey, 'standardHoursPerDay', Number(current.standardHoursPerDay));
    };
  }, [staff, onChange]);

  const handleBlur = (field: keyof typeof localData) => {
    if ((field === 'staffId' || field === 'fullName' || field === 'email') && !String(localData[field]).trim()) {
      return; 
    }
    const val = (field === 'level' || field === 'standardHoursPerDay') ? Number(localData[field]) : localData[field];
    if (val !== staff[field as keyof Staff]) {
      onChange(staff._uiKey, field as keyof Staff, val);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, field: keyof typeof localData) => {
    if (e.key === 'Escape') {
      setLocalData(prev => ({ ...prev, [field]: staff[field as keyof Staff] || '' }));
      if (field === 'role') setIsCreatingRole(false);
      (e.target as HTMLInputElement).blur();
    }
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '__CREATE_NEW__') {
      setIsCreatingRole(true);
      setLocalData(p => ({...p, role: ''}));
    } else {
      setLocalData(p => ({...p, role: val}));
    }
  };

  const handleRoleBlur = () => {
    if (isCreatingRole && !localData.role.trim()) {
      setIsCreatingRole(false);
      setLocalData(p => ({...p, role: staff.role || ''}));
    } else {
      handleBlur('role');
    }
  };

  const hasError = (field: string) => errors.some(e => e.field === field);

  return (
    <div 
      className={`grid grid-cols-[1fr_1.5fr_1.5fr_1fr_1fr_0.5fr_1fr_auto] gap-4 px-6 py-2 items-center border-b border-white/5 hover:bg-white/5 transition-colors ${isAdded ? 'bg-green-500/10' : isUpdated ? 'bg-yellow-500/10' : ''} ${staff.isActive === false ? 'opacity-50 grayscale' : ''}`}
    >
      <input 
        value={localData.staffId}
        onChange={(e) => setLocalData(p => ({...p, staffId: e.target.value}))}
        onBlur={() => handleBlur('staffId')}
        onKeyDown={(e) => handleKeyDown(e, 'staffId')}
        disabled={!isAdded}
        className={`bg-transparent border ${!localData.staffId.trim() || hasError('staffId') ? 'border-red-500/50 bg-red-500/10' : 'border-transparent hover:border-white/20'} focus:border-accent-blue rounded px-2 py-1 text-white text-sm outline-none w-full disabled:opacity-70 disabled:hover:border-transparent`}
      />
      <input 
        value={localData.fullName}
        onChange={(e) => setLocalData(p => ({...p, fullName: e.target.value}))}
        onBlur={() => handleBlur('fullName')}
        onKeyDown={(e) => handleKeyDown(e, 'fullName')}
        className={`bg-transparent border ${!localData.fullName.trim() || hasError('fullName') ? 'border-red-500/50 bg-red-500/10' : 'border-transparent hover:border-white/20'} focus:border-accent-blue rounded px-2 py-1 text-white text-sm outline-none w-full`}
      />
      <input 
        value={localData.email}
        onChange={(e) => setLocalData(p => ({...p, email: e.target.value}))}
        onBlur={() => handleBlur('email')}
        onKeyDown={(e) => handleKeyDown(e, 'email')}
        placeholder="fane@example.com"
        className={`bg-transparent border ${!localData.email.trim() || hasError('email') ? 'border-red-500/50 bg-red-500/10' : 'border-transparent hover:border-white/20'} focus:border-accent-blue rounded px-2 py-1 text-white text-sm outline-none w-full`}
      />
      {isCreatingRole ? (
        <input 
          value={localData.role}
          onChange={handleRoleChange}
          onBlur={handleRoleBlur}
          onKeyDown={(e) => handleKeyDown(e, 'role')}
          autoFocus
          placeholder="New role name..."
          className={`bg-transparent border ${!localData.role.trim() || hasError('role') ? 'border-red-500/50 bg-red-500/10' : 'border-accent-blue'} focus:border-accent-blue rounded px-2 py-1 text-white text-sm outline-none w-full`}
        />
      ) : (
        <select
          value={localData.role}
          onChange={handleRoleChange}
          onBlur={handleRoleBlur}
          className={`bg-surface border ${!localData.role.trim() || hasError('role') ? 'border-red-500/50 bg-red-500/10' : 'border-transparent hover:border-white/20'} focus:border-accent-blue rounded px-2 py-1 text-text-muted text-sm outline-none w-full`}
        >
          <option value="" disabled>Select Role...</option>
          {roleOptions.map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
          <option value="__CREATE_NEW__" className="text-accent-blue font-bold">+ Create new role...</option>
        </select>
      )}
      <select
        value={localData.team}
        onChange={(e) => setLocalData(p => ({...p, team: e.target.value}))}
        onBlur={() => handleBlur('team')}
        className={`bg-surface border ${!localData.team.trim() || hasError('team') ? 'border-red-500/50 bg-red-500/10' : 'border-transparent hover:border-white/20'} focus:border-accent-blue rounded px-2 py-1 text-text-muted text-sm outline-none w-full`}
      >
        <option value="Creative">Creative</option>
        <option value="Account">Account</option>
        <option value="BOD">BOD</option>
        <option value="Kế toán">Kế toán</option>
        <option value="Phân phối">Phân phối</option>
      </select>
      <input 
        type="number"
        value={localData.level}
        onChange={(e) => setLocalData(p => ({...p, level: Number(e.target.value)}))}
        onBlur={() => handleBlur('level')}
        onKeyDown={(e) => handleKeyDown(e, 'level')}
        className={`bg-transparent border ${hasError('level') ? 'border-red-500/50 bg-red-500/10' : 'border-transparent hover:border-white/20'} focus:border-accent-blue rounded px-2 py-1 text-white text-sm outline-none w-full text-center`}
      />
      <input 
        type="number"
        value={localData.standardHoursPerDay}
        onChange={(e) => setLocalData(p => ({...p, standardHoursPerDay: Number(e.target.value)}))}
        onBlur={() => handleBlur('standardHoursPerDay')}
        onKeyDown={(e) => handleKeyDown(e, 'standardHoursPerDay')}
        className={`bg-transparent border ${hasError('standardHoursPerDay') ? 'border-red-500/50 bg-red-500/10' : 'border-transparent hover:border-white/20'} focus:border-accent-blue rounded px-2 py-1 text-white text-sm outline-none w-full text-center`}
      />
      <div className="flex gap-2 w-20 justify-end">
        {!isAdded && (
          <>
            <button 
              onClick={() => onResetPassword(staff.staffId)}
              disabled={isResetting}
              className={`p-1.5 rounded transition-colors ${isResetting ? 'text-text-muted' : 'text-accent-blue hover:bg-accent-blue/10 hover:text-white'}`}
              title="Reset Password"
            >
              {isResetting ? <Loader2 size={16} className="animate-spin" /> : <Key size={16} />}
            </button>
            <button 
              onClick={() => onToggleActive(staff._uiKey, !(staff.isActive ?? true))}
              className={`p-1.5 rounded transition-colors ${staff.isActive === false ? 'text-green-500 hover:bg-green-500/10' : 'text-red-400 hover:bg-red-400/10'}`}
              title={staff.isActive === false ? "Activate Staff" : "Deactivate Staff"}
            >
              {staff.isActive === false ? <Power size={16} /> : <PowerOff size={16} />}
            </button>
          </>
        )}
      </div>
    </div>
  );
});

// --- Main Component ---
interface Props {
  staff: Staff[];
  token: string;
  draftData: DraftState;
  setDraftData: React.Dispatch<React.SetStateAction<DraftState>>;
  fieldErrors?: FieldError[];
  onSave: () => void;
  onRevert: () => void;
  hasChanges: boolean;
  isValid: boolean;
  isSaving: boolean;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const BASE_ROLES = ["CEO", "Account", "Creative Director", "Creative Lead", "Creative Team", "PO", "Kế toán", "BOD", "Senior Account Executive", "Creative Project Lead", "Staff", "Senior Strategic Planner", "Manager"];

export const AdminStaffManagement: React.FC<Props> = ({ staff, token, draftData, setDraftData, fieldErrors = [], onSave, onRevert, hasChanges, isValid, isSaving }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const roleOptions = useMemo(() => {
    const roles = new Set(BASE_ROLES);
    staff.forEach(s => s.role && roles.add(s.role));
    draftData.staff.added.forEach(s => s.role && roles.add(s.role));
    draftData.staff.updated.forEach(s => s.role && roles.add(s.role));
    return Array.from(roles);
  }, [staff, draftData.staff]);

  const handleAddStaff = () => {
    const hasEmptyNewRow = draftData.staff.added.some(
      s => s.staffId.trim() === '' && s.fullName.trim() === ''
    );
    if (hasEmptyNewRow) return;

    const newStaff = {
      staffId: '', 
      fullName: '',
      firstName: '',
      role: '',
      team: 'Creative',
      email: '',
      level: 1,
      standardHoursPerDay: 8,
      isActive: true,
      _uiKey: `NEW-STAFF-${Date.now()}`
    };
    
    setDraftData(prev => ({
      ...prev,
      staff: {
        ...prev.staff,
        added: [newStaff as any, ...prev.staff.added]
      }
    }));
  };

  const handleChange = (uiKey: string, field: keyof Staff, value: any) => {
    setDraftData(prev => {
      const isAdded = prev.staff.added.find(s => (s as any)._uiKey === uiKey);
      if (isAdded) {
        return {
          ...prev,
          staff: {
            ...prev.staff,
            added: prev.staff.added.map(s => (s as any)._uiKey === uiKey ? { ...s, [field]: value } : s)
          }
        };
      }

      const isUpdated = prev.staff.updated.find(s => s.staffId === uiKey);
      const original = staff.find(s => s.staffId === uiKey);
      
      if (isUpdated) {
        return {
          ...prev,
          staff: {
            ...prev.staff,
            updated: prev.staff.updated.map(s => s.staffId === uiKey ? { ...s, [field]: value } : s)
          }
        };
      } else if (original) {
        return {
          ...prev,
          staff: {
            ...prev.staff,
            updated: [...prev.staff.updated, { ...original, [field]: value }]
          }
        };
      }
      return prev;
    });
  };

  const handleToggleActive = (uiKey: string, isActive: boolean) => {
    handleChange(uiKey, 'isActive', isActive);
  };

  const handleResetPassword = async (staffId: string) => {
    if (!window.confirm(`Bạn có chắc muốn reset mật khẩu cho nhân viên ${staffId} về mặc định (FanE@2026)? Họ sẽ phải đổi mật khẩu ở lần đăng nhập tới.`)) {
      return;
    }
    
    setResettingId(staffId);
    setMessage(null);
    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${baseUrl}/api/admin/staff/${staffId}/reset-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reset failed');
      
      setMessage({ type: 'success', text: `Đã reset mật khẩu cho ${staffId} thành công.` });
      setTimeout(() => setMessage(null), 5000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setResettingId(null);
    }
  };

  const flatList = useMemo(() => {
    const mergedStaff = staff.map(s => {
      const updated = draftData.staff.updated.find(u => u.staffId === s.staffId);
      return updated ? { ...updated, _uiKey: s.staffId } : { ...s, _uiKey: s.staffId };
    });
    let allStaff = [...draftData.staff.added, ...mergedStaff];

    const lowerSearch = debouncedSearchTerm.trim().toLowerCase();
    if (lowerSearch) {
      allStaff = allStaff.filter(s => 
        (s.fullName || '').toLowerCase().includes(lowerSearch) ||
        (s.staffId || '').toLowerCase().includes(lowerSearch) ||
        (s.email || '').toLowerCase().includes(lowerSearch)
      );
    }

    // Sort by added first, then active first, then team, then level
    allStaff.sort((a, b) => {
      const aIsNew = draftData.staff.added.some(s => (s as any)._uiKey === (a as any)._uiKey);
      const bIsNew = draftData.staff.added.some(s => (s as any)._uiKey === (b as any)._uiKey);
      if (aIsNew && !bIsNew) return -1;
      if (!aIsNew && bIsNew) return 1;

      const aActive = a.isActive ?? true;
      const bActive = b.isActive ?? true;
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;

      if (a.team !== b.team) return (a.team || '').localeCompare(b.team || '');
      return (b.level || 0) - (a.level || 0);
    });

    return allStaff;
  }, [staff, draftData.staff, debouncedSearchTerm]);

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="p-6 pb-2 flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-accent-blue" />
              <h3 className="text-2xl font-bold text-white whitespace-nowrap">Staff Management</h3>
            </div>
            <div className="relative w-[300px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted" size={16} />
              <input 
                type="text" 
                placeholder="Search by ID, Name or Email..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-surface-dark border border-white/10 rounded-lg py-1.5 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-accent-blue"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleAddStaff}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md text-white transition-colors text-sm font-medium"
            >
              <Plus size={14} /> New Staff
            </button>
            <button
              onClick={onRevert}
              disabled={!hasChanges || isSaving}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors text-sm ${
                hasChanges && !isSaving 
                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/50' 
                  : 'bg-surface-light text-text-muted border border-white/5 cursor-not-allowed'
              }`}
            >
              <Undo2 size={14} /> Revert
            </button>
            
            <button
              onClick={onSave}
              disabled={!hasChanges || !isValid || isSaving}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors text-sm ${
                hasChanges && isValid && !isSaving
                  ? 'bg-accent-blue text-white hover:bg-accent-blue/90 border border-accent-blue' 
                  : 'bg-surface-light text-text-muted border border-white/5 cursor-not-allowed'
              }`}
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
            </button>
          </div>
        </div>
      </div>

      {message && (
        <div className={`mx-6 px-4 py-3 rounded-lg text-sm border ${message.type === 'error' ? 'bg-red-500/10 text-red-400 border-red-500/50' : 'bg-green-500/10 text-green-400 border-green-500/50'}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-[1fr_1.5fr_1.5fr_1fr_1fr_0.5fr_1fr_auto] gap-4 px-6 py-3 bg-accent-blue/10 border-y border-accent-blue/20 text-xs font-bold text-accent-blue uppercase tracking-wider sticky top-0 z-20 backdrop-blur-md">
        <div>Staff ID</div>
        <div>Full Name</div>
        <div>Email</div>
        <div>Role</div>
        <div>Team</div>
        <div className="text-center">Level</div>
        <div className="text-center" title="Standard Hours/Day">Std Hrs</div>
        <div className="w-20"></div>
      </div>

      <div className="flex-1 bg-surface/10 rounded-b-lg">
        {flatList.map((staffItem) => {
            const isAdded = draftData.staff.added.some(s => (s as any)._uiKey === (staffItem as any)._uiKey);
            const isUpdated = draftData.staff.updated.some(s => s.staffId === (staffItem as any)._uiKey);
            
            return (
              <StaffRow
                key={(staffItem as any)._uiKey}
                staff={staffItem as any}
                isAdded={isAdded}
                isUpdated={isUpdated}
                onChange={handleChange}
                onToggleActive={handleToggleActive}
                onResetPassword={handleResetPassword}
                errors={fieldErrors.filter(e => e.uiKey === (staffItem as any)._uiKey || e.uiKey === staffItem.staffId)}
                isResetting={resettingId === staffItem.staffId}
                roleOptions={roleOptions}
              />
            );
        })}
        {flatList.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-text-muted">
            <p>No staff members found.</p>
          </div>
        )}
      </div>
    </div>
  );
};


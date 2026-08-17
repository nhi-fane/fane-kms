import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, Check, X, Shield, Minus, Pin } from 'lucide-react';

interface Staff {
  staffId: string;
  fullName: string;
  role: string;
}

interface MatrixValue {
  granted: boolean;
  isOverride: boolean;
}

interface Permission {
  code: string;
  name: string;
  category: string;
}

interface MatrixRow {
  permission: Permission;
  staffStatus: Record<string, MatrixValue>;
}

interface PermissionData {
  staff: Staff[];
  matrix: MatrixRow[];
}

interface Props {
  token: string;
}

export const CEOPermissionPortal: React.FC<Props> = ({ token }) => {
  const [data, setData] = useState<PermissionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pinnedStaffIds, setPinnedStaffIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ceoPortalPinnedStaff');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse pinned staff from localStorage');
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('ceoPortalPinnedStaff', JSON.stringify(pinnedStaffIds));
  }, [pinnedStaffIds]);

  const togglePin = (staffId: string) => {
    setPinnedStaffIds(prev => 
      prev.includes(staffId) ? prev.filter(id => id !== staffId) : [...prev, staffId]
    );
  };

  const fetchData = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/permissions/matrix', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch permission matrix');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const togglePermission = async (targetStaffId: string, permissionCode: string, currentValue: MatrixValue) => {
    // If currently true (default or override), and we click it -> we want to revoke it (isGranted: false)
    // If currently false (default or override), and we click it -> we want to grant it (isGranted: true)
    // Wait, the CEO can "Revert to default" too. 
    // Let's implement a cycle: Default -> Explicit Grant -> Explicit Revoke -> Default
    let nextValue: boolean | null = null;
    
    if (!currentValue.isOverride) {
      // It's currently default. Click -> Explicitly invert it.
      nextValue = !currentValue.granted;
    } else {
      // It's currently overridden.
      // If it's an explicit grant (true), clicking it should make it explicit revoke (false).
      // If it's an explicit revoke (false), clicking it should revert to default (null).
      if (currentValue.granted) {
        nextValue = false;
      } else {
        nextValue = null; // Revert to default
      }
    }

    try {
      const res = await fetch('http://localhost:3000/api/permissions/override', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          targetStaffId,
          permissionCode,
          isGranted: nextValue
        })
      });

      if (!res.ok) throw new Error('Failed to update permission');
      
      // Optimistically update UI or re-fetch
      await fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const sortedStaff = useMemo(() => {
    if (!data) return [];
    const pinned = pinnedStaffIds.map(id => data.staff.find(s => s.staffId === id)).filter(Boolean) as Staff[];
    const unpinned = data.staff.filter(s => !pinnedStaffIds.includes(s.staffId));
    return [...pinned, ...unpinned];
  }, [data, pinnedStaffIds]);

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-accent-purple" size={48} /></div>;
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>;
  if (!data) return null;

  // Group matrix by category
  const groupedMatrix: Record<string, MatrixRow[]> = {};
  data.matrix.forEach(row => {
    if (!groupedMatrix[row.permission.category]) {
      groupedMatrix[row.permission.category] = [];
    }
    groupedMatrix[row.permission.category].push(row);
  });

  return (
    <div className="glass-panel p-6 overflow-hidden flex flex-col h-[calc(100vh-120px)]">
      <div className="flex items-center gap-3 mb-6 shrink-0">
        <Shield className="text-accent-blue" size={28} />
        <h2 className="text-2xl font-bold text-white m-0 tracking-wide">CEO Permission Portal</h2>
      </div>
      
      <div className="text-sm text-text-muted mb-4 shrink-0 flex gap-6">
        <div className="flex items-center gap-2"><div className="w-5 h-5 rounded bg-green-500/20 border border-green-500 flex items-center justify-center"><Check size={14} className="text-green-500" /></div> Granted (Default)</div>
        <div className="flex items-center gap-2"><div className="w-5 h-5 rounded bg-green-500/40 border border-green-500 flex items-center justify-center ring-2 ring-white/20"><Check size={14} className="text-green-300" /></div> Explicitly Granted</div>
        <div className="flex items-center gap-2"><div className="w-5 h-5 rounded bg-surface-light border border-white/10 flex items-center justify-center"><Minus size={14} className="text-gray-500" /></div> Not Granted (Default)</div>
        <div className="flex items-center gap-2"><div className="w-5 h-5 rounded bg-red-500/20 border border-red-500 flex items-center justify-center"><X size={14} className="text-red-500" /></div> Explicitly Revoked</div>
      </div>

      <div className="overflow-auto custom-scrollbar flex-1 relative border border-white/5 rounded-lg bg-[#0F0F13]">
        <table className="w-full text-left border-collapse min-w-max">
          <thead className="bg-surface-dark border-b border-white/10 shadow-md">
            <tr>
              <th className="sticky top-0 left-0 z-40 bg-surface-dark p-4 border-r border-white/10 font-semibold text-white min-w-[256px] w-[256px] max-w-[256px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]">
                Permissions
              </th>
              {sortedStaff.map(person => {
                const isPinned = pinnedStaffIds.includes(person.staffId);
                const pinnedIndex = pinnedStaffIds.indexOf(person.staffId);
                const leftOffset = isPinned ? 256 + pinnedIndex * 140 : 'auto';
                const cellClasses = isPinned 
                  ? "sticky top-0 z-40 bg-surface-dark shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)] border-r border-white/10" 
                  : "sticky top-0 z-30 bg-surface-dark border-r border-white/10";
                
                return (
                  <th 
                    key={person.staffId} 
                    className={`p-4 text-center min-w-[140px] w-[140px] max-w-[140px] group relative ${cellClasses}`}
                    style={isPinned ? { left: `${leftOffset}px` } : undefined}
                  >
                    <button 
                      onClick={() => togglePin(person.staffId)}
                      className={`absolute top-2 right-2 p-1 rounded-md transition-all ${isPinned ? 'opacity-100 text-accent-purple bg-accent-purple/10' : 'opacity-0 group-hover:opacity-100 text-text-muted hover:text-white hover:bg-white/10'}`}
                      title={isPinned ? "Unpin staff" : "Pin staff"}
                    >
                      <Pin size={14} className={isPinned ? "fill-accent-purple" : ""} />
                    </button>
                    <div className="text-white font-medium whitespace-nowrap truncate px-2">{person.fullName}</div>
                    <div className="text-xs text-text-muted mt-1 truncate px-2">{person.role}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {Object.entries(groupedMatrix).map(([category, rows]) => (
              <React.Fragment key={category}>
                <tr>
                  <td colSpan={data.staff.length + 1} className="sticky left-0 bg-surface/50 p-3 text-accent-purple font-semibold border-y border-white/10 uppercase tracking-wider text-xs z-20">
                    {category}
                  </td>
                </tr>
                {rows.map(row => (
                  <tr key={row.permission.code} className="group/row hover:bg-white/[0.02] transition-colors border-b border-white/5">
                    <td className="sticky left-0 z-30 bg-[#0F0F13] group-hover/row:bg-[#131317] p-4 border-r border-white/10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)] min-w-[256px] w-[256px] max-w-[256px]">
                      <div className="text-white text-sm font-medium">{row.permission.name}</div>
                      <div className="text-xs text-text-muted mt-1 font-mono">{row.permission.code}</div>
                    </td>
                    {sortedStaff.map(person => {
                      const status = row.staffStatus[person.staffId];
                      const isPinned = pinnedStaffIds.includes(person.staffId);
                      const pinnedIndex = pinnedStaffIds.indexOf(person.staffId);
                      const leftOffset = isPinned ? 256 + pinnedIndex * 140 : 'auto';
                      const cellClasses = isPinned
                        ? "sticky z-30 bg-[#0F0F13] group-hover/row:bg-[#131317] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)] border-r border-white/5"
                        : "border-r border-white/5";

                      return (
                        <td 
                          key={person.staffId} 
                          className={`p-4 text-center min-w-[140px] w-[140px] max-w-[140px] ${cellClasses}`}
                          style={isPinned ? { left: `${leftOffset}px` } : undefined}
                        >
                          <button
                            onClick={() => togglePermission(person.staffId, row.permission.code, status)}
                            className={`w-8 h-8 rounded flex items-center justify-center mx-auto transition-all ${
                              status.isOverride
                                ? status.granted
                                  ? 'bg-green-500/40 border-green-500 ring-2 ring-white/20' // Explicit Grant
                                  : 'bg-red-500/20 border-red-500' // Explicit Revoke
                                : status.granted
                                ? 'bg-green-500/20 border-green-500/50' // Default Grant
                                : 'bg-surface-light border-white/10' // Default Revoke
                            } border hover:opacity-80`}
                          >
                            {status.isOverride ? (
                              status.granted ? <Check size={16} className="text-green-300 drop-shadow-[0_0_5px_rgba(74,222,128,0.8)]" /> : <X size={16} className="text-red-500 drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]" />
                            ) : (
                              status.granted ? <Check size={16} className="text-green-500" /> : <Minus size={16} className="text-gray-500" />
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

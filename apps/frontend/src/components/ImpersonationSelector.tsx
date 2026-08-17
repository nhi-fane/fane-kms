import React, { useState } from 'react';

import type { Staff } from '../hooks/useDashboardData';

interface Props {
  staffList: Staff[];
  token: string;
  onImpersonateSuccess: (newToken: string) => void;
}

export const ImpersonationSelector: React.FC<Props> = ({ staffList, token, onImpersonateSuccess }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);

  const handleImpersonate = async (targetStaffId: string) => {
    setIsImpersonating(true);
    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${baseUrl}/api/auth/impersonate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ targetStaffId })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to impersonate');

      onImpersonateSuccess(json.token);
      setIsOpen(false);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsImpersonating(false);
    }
  };

  return (
    <div className="relative w-full">
      <button
        onClick={() => setIsOpen(true)}
        className="w-full text-left px-4 py-2 text-sm text-text-muted hover:text-white hover:bg-white/5 transition-colors flex items-center justify-between"
        disabled={isImpersonating}
      >
        <span>Impersonate</span>
        <span className="text-xs">▶</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-full top-0 mr-2 w-64 max-h-[60vh] bg-[#151518] border border-white/5 rounded-xl shadow-2xl z-50 flex flex-col custom-scrollbar overflow-hidden">
            <div className="p-3 border-b border-white/5 flex items-center justify-between bg-[#1a1a1f]">
              <div className="text-xs text-text-muted font-medium uppercase tracking-wider">
                Select Staff
              </div>
            </div>
            <div className="p-1 overflow-y-auto">
              {staffList.map(person => (
                <button
                  key={person.staffId}
                  onClick={() => handleImpersonate(person.staffId)}
                  className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/5 rounded-lg transition-colors flex flex-col mb-1"
                >
                  <span className="font-medium">{person.fullName}</span>
                  <span className="text-xs text-text-muted">{person.role}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

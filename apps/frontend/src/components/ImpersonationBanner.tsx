import React from 'react';
import { Eye, AlertCircle } from 'lucide-react';

interface Props {
  impersonatorRole?: string;
  onExit: () => void;
}

export const ImpersonationBanner: React.FC<Props> = ({ impersonatorRole, onExit }) => {
  return (
    <div className="bg-red-500/20 border-b border-red-500/50 p-3 flex items-center justify-between z-50 relative">
      <div className="flex items-center gap-3">
        <Eye className="text-red-400" size={24} />
        <div>
          <h3 className="text-red-400 font-bold m-0 text-sm">Impersonation Mode Active</h3>
          <p className="text-red-200/80 text-xs m-0 flex items-center gap-1">
            <AlertCircle size={12} /> Read-only access. Destructive actions are blocked. Initiated by {impersonatorRole}.
          </p>
        </div>
      </div>
      <button 
        onClick={onExit}
        className="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded transition-colors shadow-lg shadow-red-500/20"
      >
        Exit Impersonation
      </button>
    </div>
  );
};

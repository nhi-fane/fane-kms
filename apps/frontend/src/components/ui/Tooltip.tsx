import React from 'react';
import { HelpCircle } from 'lucide-react';

export const Tooltip = ({ text }: { text: string }) => {
  return (
    <div className="group relative inline-flex items-center justify-center cursor-help ml-2 align-middle">
      <HelpCircle size={16} className="text-text-muted hover:text-accent-purple transition-colors" />
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-64 p-2.5 bg-surface-light text-white text-xs md:text-sm rounded-lg shadow-xl z-50 border border-white/10 pointer-events-none whitespace-normal text-center">
        {text}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-surface-light"></div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import type { Staff } from '../hooks/useDashboardData';
import { ChevronDown, Check, Minus } from 'lucide-react';
import clsx from 'clsx';

interface Props {
  staffList: Staff[];
  selectedStaff: string[];
  setSelectedStaff: (staffIds: string[]) => void;
}

export const TeamStaffSelector: React.FC<Props> = ({ staffList, selectedStaff, setSelectedStaff }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Group staff by team
  const teams = Array.from(new Set(staffList.map(s => s.team || 'Other'))).sort();
  const staffByTeam = teams.reduce((acc, team) => {
    acc[team] = staffList.filter(s => (s.team || 'Other') === team);
    return acc;
  }, {} as Record<string, Staff[]>);

  // Initialize with Creative team if empty (only on first load)
  useEffect(() => {
    if (selectedStaff.length === 0 && staffList.length > 0) {
      const creativeStaff = staffByTeam['Creative']?.map(s => s.staffId) || [];
      if (creativeStaff.length > 0) {
        setSelectedStaff(creativeStaff);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffList]); // Run once when staffList is loaded

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTeamToggle = (team: string) => {
    const teamStaffIds = staffByTeam[team].map(s => s.staffId);
    const allSelected = teamStaffIds.every(id => selectedStaff.includes(id));

    if (allSelected) {
      // Deselect all
      setSelectedStaff(selectedStaff.filter(id => !teamStaffIds.includes(id)));
    } else {
      // Select all (merge)
      const newSelection = new Set([...selectedStaff, ...teamStaffIds]);
      setSelectedStaff(Array.from(newSelection));
    }
  };

  const handleStaffToggle = (staffId: string) => {
    if (selectedStaff.includes(staffId)) {
      setSelectedStaff(selectedStaff.filter(id => id !== staffId));
    } else {
      setSelectedStaff([...selectedStaff, staffId]);
    }
  };

  const getTeamState = (team: string) => {
    const teamStaffIds = staffByTeam[team].map(s => s.staffId);
    const selectedCount = teamStaffIds.filter(id => selectedStaff.includes(id)).length;

    if (selectedCount === 0) return 'unchecked';
    if (selectedCount === teamStaffIds.length) return 'checked';
    return 'indeterminate';
  };

  // Determine display text
  let displayText = "Select staff...";
  if (selectedStaff.length > 0) {
    const creativeIds = staffByTeam['Creative']?.map(s => s.staffId) || [];
    const isOnlyCreative = selectedStaff.length === creativeIds.length && creativeIds.every(id => selectedStaff.includes(id));
    
    if (isOnlyCreative) {
      displayText = `Creative Team (${selectedStaff.length})`;
    } else {
      displayText = `${selectedStaff.length} staff selected`;
    }
  }

  return (
    <div className="relative flex-1 min-w-[250px]" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-[rgba(9,14,26,0.8)] border border-text-muted/20 hover:border-accent-purple text-white px-4 py-2 rounded-lg transition-colors"
      >
        <span className="text-sm truncate">{displayText}</span>
        <ChevronDown size={16} className={clsx("text-text-muted transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute z-[9999] top-full left-0 right-0 mt-2 bg-[rgb(22,31,44)] border border-text-muted/20 rounded-lg shadow-xl overflow-hidden max-h-[400px] flex flex-col">
          <div className="overflow-y-auto p-2 flex flex-col gap-1 custom-scrollbar">
            {teams.map(team => {
              const state = getTeamState(team);
              return (
                <div key={team} className="flex flex-col mb-1">
                  {/* Team Row */}
                  <div 
                    className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-white/5 cursor-pointer group transition-colors"
                    onClick={() => handleTeamToggle(team)}
                  >
                    <div className={clsx(
                      "w-4 h-4 rounded flex items-center justify-center border transition-colors",
                      state === 'checked' ? "bg-accent-purple border-accent-purple" : 
                      state === 'indeterminate' ? "bg-accent-purple/50 border-accent-purple" : 
                      "border-text-muted/40 group-hover:border-accent-purple/50"
                    )}>
                      {state === 'checked' && <Check size={12} className="text-white" />}
                      {state === 'indeterminate' && <Minus size={12} className="text-white" />}
                    </div>
                    <span className="font-semibold text-white/90 text-sm flex-1">{team}</span>
                    <span className="text-xs text-text-muted bg-white/5 px-2 py-0.5 rounded-full">
                      {staffByTeam[team].length}
                    </span>
                  </div>

                  {/* Staff Rows */}
                  <div className="flex flex-col ml-6 pl-3 border-l border-white/5 mt-1 gap-1">
                    {staffByTeam[team].map(staff => {
                      const isChecked = selectedStaff.includes(staff.staffId);
                      return (
                        <div 
                          key={staff.staffId}
                          className="flex items-center gap-3 px-3 py-1.5 rounded-md hover:bg-white/5 cursor-pointer group transition-colors"
                          onClick={() => handleStaffToggle(staff.staffId)}
                        >
                          <div className={clsx(
                            "w-4 h-4 rounded flex items-center justify-center border transition-colors",
                            isChecked ? "bg-accent-purple border-accent-purple" : "border-text-muted/40 group-hover:border-accent-purple/50"
                          )}>
                            {isChecked && <Check size={12} className="text-white" />}
                          </div>
                          <span className={clsx("text-sm transition-colors", isChecked ? "text-white" : "text-text-muted group-hover:text-white/80")}>
                            {staff.fullName}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

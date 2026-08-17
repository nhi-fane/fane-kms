import React from 'react';
import type { Staff } from '../hooks/useDashboardData';
import { format, subDays } from 'date-fns';
import { Calendar, Users } from 'lucide-react';

import { TeamStaffSelector } from './TeamStaffSelector';

interface Props {
  staffList: Staff[];
  dateRange: { start: Date; end: Date };
  setDateRange: (range: { start: Date; end: Date }) => void;
  selectedStaff: string[];
  setSelectedStaff: (staffIds: string[]) => void;
  hideStaffFilter?: boolean;
  allowToday?: boolean;
  title?: string;
  icon?: React.ReactNode;
  hideWrapper?: boolean;
}

export const Zone1ControlPanel: React.FC<Props> = ({
  staffList,
  dateRange,
  setDateRange,
  selectedStaff,
  setSelectedStaff,
  hideStaffFilter = false,
  allowToday = false,
  title,
  icon,
  hideWrapper = false
}) => {
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'start' | 'end') => {
    if (!e.target.value) return;
    const newDate = new Date(e.target.value);
    setDateRange({
      ...dateRange,
      [type]: newDate
    });
  };


  const innerContent = (
    <>
      {/* Title */}
      {title && (
        <div className="flex items-center gap-2 mr-auto">
          {icon}
          <h2 className="text-2xl font-bold text-white m-0 tracking-wide">
            {title}
          </h2>
        </div>
      )}

      {/* Date Filter */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-accent-purple/10 rounded-lg border border-accent-purple/20">
          <Calendar size={20} className="text-accent-purple" />
        </div>
        <div className="flex items-center gap-2" style={{ colorScheme: 'dark' }}>
          <input 
            type="date" 
            value={format(dateRange.start, 'yyyy-MM-dd')}
            max={format(dateRange.end, 'yyyy-MM-dd')}
            onChange={(e) => handleDateChange(e, 'start')}
            onClick={(e) => e.currentTarget.showPicker && e.currentTarget.showPicker()}
            className="bg-background-dark/80 text-white border border-text-muted/20 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-purple transition-all outline-none cursor-pointer"
          />
          <span className="text-text-muted font-medium">to</span>
          <input 
            type="date" 
            value={format(dateRange.end, 'yyyy-MM-dd')}
            min={format(dateRange.start, 'yyyy-MM-dd')}
            max={format(allowToday ? new Date() : subDays(new Date(), 1), 'yyyy-MM-dd')}
            onChange={(e) => handleDateChange(e, 'end')}
            onClick={(e) => e.currentTarget.showPicker && e.currentTarget.showPicker()}
            className="bg-background-dark/80 text-white border border-text-muted/20 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-purple transition-all outline-none cursor-pointer"
          />
        </div>
      </div>

      {/* Staff Filter */}
      {!hideStaffFilter && (
        <>
          <div className="w-px h-8 bg-text-muted/20 hidden md:block"></div>
          <div className="flex items-center gap-3 flex-1 min-w-[300px]">
            <div className="p-2 bg-accent-green/10 rounded-lg border border-accent-green/20">
              <Users size={20} className="text-accent-green" />
            </div>
            <div className="flex-1">
              <TeamStaffSelector 
                staffList={staffList}
                selectedStaff={selectedStaff}
                setSelectedStaff={setSelectedStaff}
              />
            </div>
          </div>
        </>
      )}


    </>
  );

  if (hideWrapper) {
    return <div className="flex flex-wrap items-center gap-6">{innerContent}</div>;
  }

  return (
    <div className="glass-panel flex flex-wrap items-center gap-6">
      {innerContent}
    </div>
  );
};

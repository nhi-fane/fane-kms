import React, { useMemo } from 'react';
import type { Project, Task, Staff } from '../hooks/useDashboardData';
import { Activity, Briefcase, CheckCircle } from 'lucide-react';
import clsx from 'clsx';
import { Tooltip } from './ui/Tooltip';

import { getProjectColor } from '../utils/colorUtils';

interface Props {
  projects: Project[];
  tasks: Task[];
  staff: Staff[];
  dateRange: { start: Date; end: Date };
  selectedStaff: string[];
  hoveredProject?: string | null;
  setHoveredProject?: (code: string | null) => void;
}

const MetricCard = ({ title, value, colorClass, borderClass, bgClass, icon: Icon }: { title: string, value: string | number, colorClass: string, borderClass: string, bgClass: string, icon: any }) => {
  return (
    <div className={clsx(
      "metric-card-inner group transition-all duration-300 hover:-translate-y-1 hover:shadow-lg",
      borderClass,
      "shadow-[inset_0_0_20px_var(--tw-shadow-color),0_0_15px_var(--tw-shadow-color)]"
    )} style={{ '--tw-shadow-color': 'rgba(255,255,255,0.02)' } as React.CSSProperties}>

      <div className="flex justify-between items-start">
        <h3 className="m-0 text-sm md:text-base font-medium text-text-main/90">{title}</h3>
        <div className={clsx("p-2 rounded-lg", bgClass, colorClass)}>
          <Icon size={18} />
        </div>
      </div>

      <div className="text-4xl md:text-5xl font-bold text-text-main leading-none mt-2">
        {value}
      </div>
    </div>
  );
};

export const Zone2Statistics: React.FC<Props> = ({ projects, tasks, dateRange, selectedStaff, hoveredProject, setHoveredProject }) => {
  const stats = useMemo(() => {
    const filteredTasks = tasks.filter(t => {
      const taskStart = new Date(t.startDate);
      const taskEnd = new Date(t.deadline);
      const inDateRange = taskStart <= dateRange.end && taskEnd >= dateRange.start;
      const inStaff = selectedStaff.length === 0 || t.assignees.some(a => selectedStaff.includes(a.staffId));
      return inDateRange && inStaff;
    });

    const activeTasks = filteredTasks.filter(t => t.status !== 'Completed').length;

    const projectCodes = new Set(filteredTasks.map(t => t.projectCode));
    const activeProjectsList = projects.filter(p => projectCodes.has(p.projectCode) && p.status !== 'Closed');
    const activeProjects = activeProjectsList.length;
    const pendingProjects = projects.filter(p => projectCodes.has(p.projectCode) && p.status === 'Pending Feedback').length;

    return { activeTasks, activeProjectsList, activeProjects, pendingProjects };
  }, [projects, tasks, dateRange, selectedStaff]);

  return (
    <div className="glass-panel flex flex-col gap-5">
      <h2 className="text-xl font-semibold m-0 text-white flex items-center gap-2">
        <Activity className="text-accent-blue" size={24} />
        Workload
        <Tooltip text="💡 Thống kê số project & task đang chạy" />
      </h2>
      <div className="flex flex-col gap-4">
        {/* Active Projects (Now Side-by-Side with Legends) */}
        <div className="metric-card-inner flex-none flex flex-col justify-start group border-accent-blue/50 bg-background-card/40 border border-text-muted/10 rounded-2xl p-6 shadow-[inset_0_0_20px_rgba(255,255,255,0.02),0_0_15px_rgba(255,255,255,0.02)] transition-all hover:-translate-y-1 hover:shadow-lg">
          <div className="flex justify-between items-start mb-2">
            <h3 className="m-0 text-sm md:text-base font-medium text-text-main/90">Active Projects</h3>
            <div className="p-2 rounded-lg bg-accent-blue/20 text-accent-blue"><Briefcase size={20} /></div>
          </div>

          <div className="flex items-center gap-6 mt-2 flex-1">
            <div className="text-6xl font-bold text-text-main leading-none">{stats.activeProjects}</div>

            {stats.activeProjects > 0 && (
              <div className="flex flex-col gap-2 border-l border-white/10 pl-6 flex-1 min-w-0">
                {stats.activeProjectsList.map(p => (
                  <div
                    key={p.projectCode}
                    className={clsx(
                      "flex items-center gap-2 text-sm transition-all cursor-pointer",
                      hoveredProject === p.projectCode ? "text-white font-medium drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]" : (hoveredProject ? "text-text-muted/40" : "text-text-muted")
                    )}
                    onMouseEnter={() => setHoveredProject?.(p.projectCode)}
                    onMouseLeave={() => setHoveredProject?.(null)}
                  >
                    <span
                      className={clsx("w-2.5 h-2.5 rounded-full shrink-0 transition-all", hoveredProject === p.projectCode && "shadow-[0_0_8px_currentColor]")}
                      style={{ backgroundColor: getProjectColor(p.projectCode, projects), color: getProjectColor(p.projectCode, projects) }}
                    ></span>
                    <span className="truncate">{p.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Active Tasks (Original layout) */}
        <MetricCard
          title="Active Tasks"
          value={stats.activeTasks}
          colorClass="text-accent-purple"
          borderClass="border-accent-purple/50"
          bgClass="bg-accent-purple/20"
          icon={CheckCircle}
        />

        {/* Pending Feedback */}
        <MetricCard
          title="Pending Feedback"
          value={stats.pendingProjects}
          colorClass="text-accent-orange"
          borderClass="border-accent-orange/50"
          bgClass="bg-accent-orange/20"
          icon={Activity}
        />
      </div>
    </div>
  );
};

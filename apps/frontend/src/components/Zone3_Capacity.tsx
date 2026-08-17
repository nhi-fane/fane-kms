import React, { useMemo } from 'react';
import type { Staff, Task, Project, Timesheet } from '../hooks/useDashboardData';
import { Chart as ChartJS, ArcElement, Tooltip as ChartTooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import clsx from 'clsx';
import { Users } from 'lucide-react';
import { getStandardHours } from '../utils/dateUtils';
import { getProjectColor } from '../utils/colorUtils';
import { Tooltip } from './ui/Tooltip';

ChartJS.register(ArcElement, ChartTooltip, Legend);

interface Props {
  staff: Staff[];
  tasks: Task[];
  projects: Project[];
  timesheets: Timesheet[];
  leaves?: { leaveDate: string | Date; duration: number; status: string; staffId: string }[];
  holidays?: { startDate: string | Date; endDate: string | Date }[];
  dateRange: { start: Date; end: Date };
  selectedStaff: string[];
  hideWrapper?: boolean;
  hoveredProject?: string | null;
  setHoveredProject?: (code: string | null) => void;
}

export const Zone3Capacity: React.FC<Props> = ({ staff, tasks, projects, timesheets, leaves = [], holidays = [], dateRange, selectedStaff, hideWrapper = false, hoveredProject, setHoveredProject }) => {
  const staffToRender = useMemo(() => {
    return selectedStaff.length > 0
      ? staff.filter(s => selectedStaff.includes(s.staffId))
      : staff;
  }, [staff, selectedStaff]);

  const calculateStaffCapacity = (staffId: string) => {
    const st = staff.find(s => s.staffId === staffId);
    const staffLeaves = leaves.filter(l => l.staffId === staffId);
    const standardHours = getStandardHours(dateRange.start, dateRange.end, staffLeaves, holidays, st?.standardHoursPerDay || 8) || 1; // prevent 0 division


    const staffLogs = timesheets.filter(ts => {
      const logDate = new Date(ts.logDate);
      return ts.staffId === staffId && logDate >= dateRange.start && logDate <= dateRange.end;
    });

    const totalLoggedHours = staffLogs.reduce((sum, ts) => sum + ts.hoursLogged, 0);

    // Lỗ hổng 3: staffTasks lúc tính Active Tasks và gán giờ mặc định chưa lọc theo dateRange
    const staffTasks = tasks.filter(t => {
      const taskStart = new Date(t.startDate);
      const taskEnd = new Date(t.deadline);
      const inDateRange = taskStart <= dateRange.end && taskEnd >= dateRange.start;
      return inDateRange && t.assignees.some(a => a.staffId === staffId);
    });

    const usedHours = totalLoggedHours;
    const capacityPercent = Math.round((usedHours / standardHours) * 100);

    const projectHours: Record<string, number> = {};
    staffLogs.forEach(log => {
      const t = tasks.find(tsk => tsk.taskId === log.taskId);
      if (t) {
        projectHours[t.projectCode] = (projectHours[t.projectCode] || 0) + log.hoursLogged;
      }
    });

    return { capacityPercent, projectHours, activeTasks: staffTasks.length, standardHours };
  };

  const innerContent = (
    <>
      {/* Grid that responds to screen size */}
      <div className={clsx("grid gap-6", hideWrapper ? "grid-cols-1 h-full" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3")}>
        {staffToRender.map(s => {
          const { capacityPercent, projectHours, activeTasks, standardHours } = calculateStaffCapacity(s.staffId);
          const isOverload = capacityPercent > 100;

          const usedHours = Object.values(projectHours).reduce((sum, h) => sum + h, 0);
          const unusedHours = standardHours > usedHours ? standardHours - usedHours : 0;

          const chartCodes = Object.keys(projectHours);
          const chartLabels = chartCodes.map(code => projects.find(p => p.projectCode === code)?.name || code);
          const chartDataValues = Object.values(projectHours);

          const currentColors = chartCodes.map(code => {
            const baseColor = getProjectColor(code, projects);
            if (hoveredProject && hoveredProject !== code) {
              return baseColor.replace('rgb', 'rgba').replace(')', ', 0.3)');
            }
            return baseColor;
          });

          if (unusedHours > 0) {
            chartCodes.push('Unused');
            chartLabels.push('Unused Capacity');
            chartDataValues.push(unusedHours);
            currentColors.push(hoveredProject && hoveredProject !== 'Unused' ? 'rgba(148, 163, 184, 0.05)' : 'rgba(148, 163, 184, 0.2)');
          }

          const chartData = {
            labels: chartLabels,
            datasets: [
              {
                data: chartDataValues,
                backgroundColor: currentColors,
                borderWidth: 0,
                hoverOffset: 4,
              },
            ],
          };

          return (
            <div
              key={s.staffId}
              className={clsx(
                "bg-background-card/40 border border-text-muted/10 rounded-2xl p-5 flex flex-col items-center transition-all duration-300 relative",
                !hideWrapper && "hover:-translate-y-1 hover:shadow-lg",
                hideWrapper && "h-full",
                isOverload && "overload-glow"
              )}
            >
              {!hideWrapper && (
                <div className="font-semibold text-white mb-4 text-center w-full truncate" title={s.fullName}>
                  {s.fullName}
                </div>
              )}

              {hideWrapper && (
                <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-6 self-start w-full">
                  <Users className="text-accent-blue" size={20} />
                  Project Allocation
                </h3>
              )}

              <div className={clsx("relative", hideWrapper ? "w-full flex-1 min-h-[220px] max-h-[300px] flex justify-center items-center" : "w-36 h-36")}>
                {Object.values(projectHours).length > 0 ? (
                  <div className={clsx("relative", hideWrapper ? "w-full h-full max-w-[280px] max-h-[280px]" : "w-full h-full")}>
                    <Doughnut
                      data={chartData}
                      options={{
                        cutout: '75%',
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            backgroundColor: 'rgb(22, 31, 44)',
                            titleColor: 'rgb(248, 250, 252)',
                            bodyColor: 'rgb(148, 163, 184)',
                            borderColor: 'rgba(148, 163, 184, 0.2)',
                            borderWidth: 1,
                            padding: 12,
                            displayColors: true,
                            boxPadding: 4,
                            callbacks: {
                              title: function (context: any) {
                                return context[0].label;
                              },
                              label: function (context: any) {
                                if (context.parsed !== null) {
                                  if (context.label === 'Unused Capacity') {
                                    return context.parsed + ' hours unused';
                                  } else {
                                    return context.parsed + ' hours logged';
                                  }
                                }
                                return '';
                              }
                            }
                          }
                        },
                        maintainAspectRatio: false,
                        onHover: (_event, chartElement) => {
                          if (setHoveredProject) {
                            if (chartElement.length > 0) {
                              setHoveredProject(chartCodes[chartElement[0].index]);
                            } else {
                              setHoveredProject(null);
                            }
                          }
                        }
                      }}
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className={clsx(
                        "font-bold text-white",
                        hideWrapper ? "text-3xl" : "text-xl"
                      )}>
                        {capacityPercent}%
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full rounded-full border-[4px] border-text-muted/20" />
                )}
              </div>

              {!hideWrapper && (
                <div className="mt-4 text-sm font-medium px-3 py-1 bg-text-muted/10 rounded-full text-text-muted mb-4">
                  {activeTasks} Active {activeTasks === 1 ? 'Task' : 'Tasks'}
                </div>
              )}

              {hideWrapper && (
                <div className="flex gap-3 justify-center mt-auto pt-4 border-t border-white/5 text-xs text-text-muted flex-wrap w-full">
                  <div
                    className={clsx("flex items-center gap-1.5 transition-all cursor-pointer", hoveredProject === 'Unused' ? 'text-white' : (hoveredProject ? 'opacity-30' : ''))}
                    onMouseEnter={() => setHoveredProject?.('Unused')}
                    onMouseLeave={() => setHoveredProject?.(null)}
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'rgba(148, 163, 184, 0.2)' }}></span>
                    Unused
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend Area (Dynamic global legend) - Only for Dashboard */}
      {!hideWrapper && (
        <div className="flex gap-4 justify-center mt-2 text-xs text-text-muted flex-wrap">
          <div
            className={clsx("flex items-center gap-1.5 transition-all cursor-pointer", hoveredProject === 'Unused' ? 'text-white' : (hoveredProject ? 'opacity-30' : ''))}
            onMouseEnter={() => setHoveredProject?.('Unused')}
            onMouseLeave={() => setHoveredProject?.(null)}
          >
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'rgba(148, 163, 184, 0.2)' }}></span>
            Unused
          </div>
          <div className="flex items-center gap-1.5 ml-auto text-accent-red opacity-80">* Red glow indicates overload</div>
        </div>
      )}
    </>
  );

  if (hideWrapper) {
    return innerContent;
  }

  return (
    <div className="glass-panel flex flex-col gap-5">
      <h2 className="text-xl font-semibold m-0 text-white flex items-center gap-2">
        <Users className="text-accent-purple" size={24} />
        Individual Capacity
        <Tooltip text="💡 Số giờ đã làm theo project" />
      </h2>
      {innerContent}
    </div>
  );
};

import { useState } from 'react';
import { Briefcase, Calendar, Clock, MonitorPlay } from 'lucide-react';
import type { DashboardData } from '../hooks/useDashboardData';
import { subDays } from 'date-fns';
import { Zone1ControlPanel } from './Zone1_ControlPanel';
import { Zone3Capacity } from './Zone3_Capacity';
import { Zone4TimelineEditable } from './Zone4_Timeline_Editable';
import { getStandardHours } from '../utils/dateUtils';
import { getProjectColor } from '../utils/colorUtils';
import clsx from 'clsx';
import { Tooltip } from './ui/Tooltip';
interface MyPortalProps {
  token: string | null;
  currentUser: { staffId: string; fullName: string; role: string };
  data: DashboardData;
  onRefresh: () => void;
}

export function MyPortal({ token, currentUser, data, onRefresh }: MyPortalProps) {
  const [dateRange, setDateRange] = useState({
    start: subDays(subDays(new Date(), 1), 14),
    end: subDays(new Date(), 1)
  });
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);
  const [hoveredProject, setHoveredProject] = useState<string | null>(null);

  if (!data) return null;

  // Filter leaves and timesheets to only this user
  const myLeaves = data.leaves.filter(l => l.staffId === currentUser.staffId);
  const myTimesheets = data.timesheets.filter(t => t.staffId === currentUser.staffId);

  // Calculate Zone 2 metrics
  const myTasks = data.tasks.filter(t => t.assignees?.some(a => a.staffId === currentUser.staffId));

  const filteredTasks = myTasks.filter(t => {
    const taskStart = new Date(t.startDate);
    const taskEnd = new Date(t.deadline);
    return taskStart <= dateRange.end && taskEnd >= dateRange.start;
  });

  const activeTasksList = filteredTasks.filter(t => t.status !== 'Completed');
  const activeTasks = activeTasksList.length;

  const topLevelTasks = activeTasksList.filter(t => !t.parentTaskId || !activeTasksList.some(pt => pt.taskId === t.parentTaskId));
  const getSubTasks = (parentId: string) => activeTasksList.filter(t => t.parentTaskId === parentId);

  // Calculate Zone 3 metrics (Working Hours)
  const staffObj = data.staff.find(s => s.staffId === currentUser.staffId);
  const standardHours = getStandardHours(dateRange.start, dateRange.end, myLeaves, data.holidays, staffObj?.standardHoursPerDay || 8);

  const filteredTimesheets = myTimesheets.filter(t => {
    const logDate = new Date(t.logDate);
    return logDate >= dateRange.start && logDate <= dateRange.end;
  });

  // Calculate active project codes identically to Donut chart
  const activeProjectCodes = new Set<string>();
  filteredTasks.forEach(t => activeProjectCodes.add(t.projectCode));
  filteredTimesheets.forEach(ts => {
    const t = data.tasks.find(tsk => tsk.taskId === ts.taskId);
    if (t) activeProjectCodes.add(t.projectCode);
  });

  const activeProjectsList = data.projects.filter(p => activeProjectCodes.has(p.projectCode) && p.status !== 'Closed');
  const activeProjects = activeProjectsList.length;

  const loggedHours = filteredTimesheets.reduce((acc, t) => acc + t.hoursLogged, 0);
  const approvedHours = filteredTimesheets.filter(t => t.approvalStatus === 'Approved').reduce((acc, t) => acc + t.hoursLogged, 0);

  const maxHours = Math.max(standardHours, loggedHours, 1);
  const standardPct = (standardHours / maxHours) * 100;
  const loggedPct = (loggedHours / maxHours) * 100;
  const approvedPct = (approvedHours / maxHours) * 100;

  // Collision resolution for the 3 legends
  const MIN_GAP = 30; // 30% gap
  const legendsArr = [
    { id: 'standard', pct: standardPct, hours: standardHours, label: 'Standard', color: 'text-text-muted', active: 'text-white scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.6)] font-bold' },
    { id: 'logged', pct: loggedPct, hours: loggedHours, label: 'Logged', color: 'text-yellow-400/90', active: 'text-yellow-300 scale-110 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)] font-bold' },
    { id: 'approved', pct: approvedPct, hours: approvedHours, label: 'Approved', color: 'text-green-400', active: 'text-green-300 scale-110 drop-shadow-[0_0_8px_rgba(74,222,128,0.6)] font-bold' }
  ].sort((a, b) => a.pct - b.pct);

  let p0 = legendsArr[0].pct;
  let p1 = legendsArr[1].pct;
  let p2 = legendsArr[2].pct;

  if (p1 - p0 < MIN_GAP) p1 = p0 + MIN_GAP;
  if (p2 - p1 < MIN_GAP) p2 = p1 + MIN_GAP;
  if (p2 > 100) {
    p2 = 100;
    if (p2 - p1 < MIN_GAP) p1 = p2 - MIN_GAP;
    if (p1 - p0 < MIN_GAP) p0 = p1 - MIN_GAP;
  }

  const legendsResolved = legendsArr.map((l, idx) => ({
    ...l,
    renderPct: Math.max(0, idx === 0 ? p0 : idx === 1 ? p1 : p2)
  }));



  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex items-center">
        <h2 className="text-2xl font-bold text-white m-0">My Portal</h2>
        <Tooltip text="💡 Điền Timesheet & quản lý project, task cá nhân" />
      </div>

      {/* REACTIVE MONITOR SECTION */}
      <div className="glass-panel p-6 flex flex-col gap-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">

          {/* ROW 1: ZONE 1 (Control Panel + Title) */}
          <div className="md:col-span-3">
            <Zone1ControlPanel
              title="Reactive Monitor"
              icon={<MonitorPlay className="text-accent-blue" size={28} />}
              staffList={data.staff}
              dateRange={dateRange}
              setDateRange={setDateRange}
              selectedStaff={[currentUser.staffId]}
              setSelectedStaff={() => { }}
              hideStaffFilter={true}
              hideWrapper={true}
            />
          </div>

          {/* ROW 2 & 3: Active Projects (Col 1) */}
          <div className="md:col-span-1 md:row-span-2 metric-card-inner flex flex-col justify-start group border-accent-blue/50 bg-background-card/40 border border-text-muted/10 rounded-2xl p-6 shadow-[inset_0_0_20px_rgba(255,255,255,0.02),0_0_15px_rgba(255,255,255,0.02)] transition-all hover:-translate-y-1 hover:shadow-lg">
            <div className="flex justify-between items-start mb-2">
              <h3 className="m-0 text-sm md:text-base font-semibold text-text-main/90">Active Projects</h3>
              <div className="p-2 rounded-lg bg-accent-blue/20 text-accent-blue"><Briefcase size={20} /></div>
            </div>
            <div className="flex items-center gap-6 mt-4 flex-1">
              <div className="text-7xl font-bold text-text-main leading-none">{activeProjects}</div>

              {activeProjects > 0 && (
                <div className="flex flex-col gap-3 border-l border-white/10 pl-6 flex-1 min-w-0">
                  {activeProjectsList.map(p => (
                    <div
                      key={p.projectCode}
                      className={clsx(
                        "flex items-center gap-2 transition-all cursor-pointer",
                        hoveredProject === p.projectCode ? "text-white font-medium drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]" : (hoveredProject ? "text-text-muted/40" : "text-text-muted")
                      )}
                      onMouseEnter={() => setHoveredProject(p.projectCode)}
                      onMouseLeave={() => setHoveredProject(null)}
                    >
                      <span
                        className={clsx("w-2.5 h-2.5 rounded-full shrink-0 transition-all", hoveredProject === p.projectCode && "shadow-[0_0_8px_currentColor]")}
                        style={{ backgroundColor: getProjectColor(p.projectCode, data.projects), color: getProjectColor(p.projectCode, data.projects) }}
                      ></span>
                      <span className="truncate text-base">{p.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ROW 2 & 3: Active Tasks (Col 2) */}
          <div className="md:col-span-1 md:row-span-2 metric-card-inner flex flex-col justify-start group border-accent-purple/50 bg-background-card/40 border border-text-muted/10 rounded-2xl p-6 shadow-[inset_0_0_20px_rgba(255,255,255,0.02),0_0_15px_rgba(255,255,255,0.02)] transition-all hover:-translate-y-1 hover:shadow-lg">
            <div className="flex justify-between items-start mb-2">
              <h3 className="m-0 text-sm md:text-base font-semibold text-text-main/90">Active Tasks</h3>
              <div className="p-2 rounded-lg bg-accent-purple/20 text-accent-purple"><Calendar size={20} /></div>
            </div>

            <div className="flex items-start gap-6 mt-4 flex-1">
              <div className="text-7xl font-bold text-text-main leading-none mt-1">{activeTasks}</div>

              {activeTasks > 0 && (
                <div className="flex flex-col gap-3 border-l border-white/10 pl-6 flex-1 min-w-0">
                  {topLevelTasks.map(t => {
                    const subTasks = getSubTasks(t.taskId);
                    return (
                      <div key={t.taskId} className="flex flex-col gap-1.5">
                        <div
                          className={clsx(
                            "flex items-center gap-2 text-sm transition-all cursor-pointer",
                            hoveredProject === t.projectCode ? "text-white font-medium drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]" : (hoveredProject ? "text-text-muted/40" : "text-text-muted")
                          )}
                          onMouseEnter={() => setHoveredProject(t.projectCode)}
                          onMouseLeave={() => setHoveredProject(null)}
                        >
                          <span
                            className={clsx("w-2.5 h-2.5 rounded-full shrink-0 transition-all", hoveredProject === t.projectCode && "shadow-[0_0_8px_currentColor]")}
                            style={{ backgroundColor: getProjectColor(t.projectCode, data.projects), color: getProjectColor(t.projectCode, data.projects) }}
                          ></span>
                          <span className="truncate">{t.name}</span>
                        </div>

                        {subTasks.length > 0 && (
                          <div className="flex flex-col gap-1.5 pl-4 border-l border-white/10 ml-1">
                            {subTasks.map(st => (
                              <div
                                key={st.taskId}
                                className={clsx(
                                  "flex items-center gap-2 text-xs transition-all cursor-pointer",
                                  hoveredProject === st.projectCode ? "text-white font-medium" : (hoveredProject ? "text-text-muted/40" : "text-text-muted")
                                )}
                                onMouseEnter={() => setHoveredProject(st.projectCode)}
                                onMouseLeave={() => setHoveredProject(null)}
                              >
                                <span className="truncate shrink-0 text-text-muted/50">-</span>
                                <span className="truncate">{st.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ROW 2, 3 & 4: Project Allocation (Col 3) */}
          <div className="md:col-span-1 md:row-span-3 h-full">
            <Zone3Capacity
              staff={data.staff.filter(s => s.staffId === currentUser.staffId)}
              tasks={data.tasks}
              projects={data.projects}
              timesheets={myTimesheets}
              leaves={myLeaves}
              holidays={data.holidays}
              dateRange={dateRange}
              selectedStaff={[currentUser.staffId]}
              hideWrapper={true}
              hoveredProject={hoveredProject}
              setHoveredProject={setHoveredProject}
            />
          </div>

          {/* ROW 4: Working Hours (Col 1 & 2) */}
          <div className="md:col-span-2 md:row-span-1 bg-background-card/40 border border-text-muted/10 rounded-2xl p-6 flex flex-col justify-center transition-all hover:-translate-y-1 hover:shadow-lg">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-6">
              <Clock className="text-accent-orange" size={20} />
              Working Hours
            </h3>

            <div className="relative h-8 text-sm w-full font-medium mb-2">
              {legendsResolved.map(l => (
                <div
                  key={l.id}
                  className={`absolute top-0 transition-all duration-500 origin-left whitespace-nowrap ${hoveredBar === l.id ? l.active + ' z-10' : l.color + ' z-0'}`}
                  style={{ left: `${l.renderPct}%`, transform: `translateX(-${l.renderPct}%)` }}
                >
                  {l.label}: <strong className={hoveredBar === l.id ? 'text-inherit' : 'text-white'}>{l.hours}h</strong>
                </div>
              ))}
            </div>

            <div
              className="relative h-10 bg-white/10 rounded-full overflow-hidden border border-white/5 cursor-pointer"
              onMouseLeave={() => setHoveredBar(null)}
            >
              {/* Background Area (Standard Hover Zone) */}
              <div
                className="absolute inset-0 z-0"
                onMouseEnter={() => setHoveredBar('standard')}
              />

              {/* Logged Bar (Gentle Yellow) */}
              <div
                className={`absolute top-0 bottom-0 left-0 z-10 bg-yellow-400/80 transition-all duration-1000 ${hoveredBar === 'logged' ? 'brightness-110 shadow-[0_0_15px_rgba(250,204,21,0.4)]' : ''}`}
                style={{ width: `${loggedPct}%` }}
                onMouseEnter={() => setHoveredBar('logged')}
              ></div>

              {/* Approved Bar (Green) */}
              <div
                className={`absolute top-0 bottom-0 left-0 z-20 bg-green-500 transition-all duration-1000 ${hoveredBar === 'approved' ? 'brightness-110 shadow-[0_0_15px_rgba(74,222,128,0.4)]' : ''}`}
                style={{ width: `${approvedPct}%` }}
                onMouseEnter={() => setHoveredBar('approved')}
              ></div>

              {/* Standard Marker (White line) */}
              <div
                className={`absolute top-0 bottom-0 z-30 w-1 bg-white transition-all duration-500 pointer-events-none ${hoveredBar === 'standard' ? 'shadow-[0_0_15px_rgba(255,255,255,1)] w-1.5 -ml-[1px]' : 'shadow-[0_0_8px_rgba(255,255,255,0.6)]'}`}
                style={{ left: `${standardPct}%` }}
              ></div>
            </div>
          </div>

        </div>
      </div>

      {/* ZONE 4: Timeline */}
      <Zone4TimelineEditable
        tasks={data.tasks}
        projects={data.projects}
        staff={data.staff}
        timesheets={myTimesheets}
        leaves={myLeaves}
        holidays={data.holidays}
        currentUser={currentUser}
        token={token}
        onRefresh={onRefresh}
      />
    </div>
  );
}

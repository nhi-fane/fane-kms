import React, { useMemo, useState } from 'react';
import type { Task, Project, Staff, Timesheet, StaffLeave, CompanyHoliday } from '../hooks/useDashboardData';
import { differenceInDays, format, addDays, isWeekend, startOfDay, isWithinInterval, parseISO } from 'date-fns';
import * as Tooltip from '@radix-ui/react-tooltip';
import clsx from 'clsx';
import { CalendarDays, GripVertical } from 'lucide-react';

interface Props {
  tasks: Task[];
  projects: Project[];
  staff: Staff[];
  timesheets: Timesheet[];
  leaves: StaffLeave[];
  holidays: CompanyHoliday[];
  currentUser?: { staffId: string; fullName: string; role: string };
  token?: string | null;
  onRefresh?: () => void;
}
import { InlineActionModal } from './InlineActionModal';
import { Tooltip as CustomTooltip } from './ui/Tooltip';

const PROJECT_COLORS = [
  'rgb(139, 86, 245)', 'rgb(13, 166, 242)', 'rgb(33, 196, 93)', 'rgb(219, 20, 60)',
  'rgb(249, 118, 31)', 'rgb(236, 72, 153)', 'rgb(20, 184, 166)', 'rgb(234, 179, 8)',
  'rgb(99, 102, 241)', 'rgb(168, 85, 247)', 'rgb(14, 165, 233)', 'rgb(132, 204, 22)',
  'rgb(244, 63, 94)', 'rgb(16, 185, 129)', 'rgb(217, 119, 6)'
];

const getProjectColor = (projectCode: string, projects: Project[]) => {
  const index = projects.findIndex(p => p.projectCode === projectCode);
  return index >= 0 ? PROJECT_COLORS[index % PROJECT_COLORS.length] : PROJECT_COLORS[0];
};

const getRgba = (rgbStr: string, alpha: number) => {
  if (!rgbStr) return 'rgba(0,0,0,1)';
  return rgbStr.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
};

type LaneTask = {
  task: Task;
  startCol: number;
  endCol: number;
  firstLogCol: number | null;
  lastLogCol: number | null;
  deadlineCol: number;
  isOverdue: boolean;
};

type ProjectData = {
  project: Project;
  startCol: number;
  endCol: number;
  lanes: LaneTask[][];
};

type StaffRowData = {
  staff: Staff;
  projectsData: ProjectData[];
  roleWeight: number;
  hasActiveTasksInView: boolean;
};

const packTasksIntoLanes = (tasks: LaneTask[]): LaneTask[][] => {
  type TaskGroup = { items: LaneTask[]; startCol: number; endCol: number; };
  const groupsMap = new Map<string, TaskGroup>();

  tasks.forEach(t => {
    const groupId = t.task.parentTaskId || t.task.taskId;
    if (!groupsMap.has(groupId)) groupsMap.set(groupId, { items: [], startCol: 9999, endCol: -1 });
    const g = groupsMap.get(groupId)!;
    if (!t.task.parentTaskId) g.items.unshift(t);
    else g.items.push(t);
    g.startCol = Math.min(g.startCol, t.startCol);
    g.endCol = Math.max(g.endCol, t.endCol);
  });

  const sortedGroups = Array.from(groupsMap.values()).sort((a, b) => a.startCol - b.startCol);
  const placedGroups: { group: TaskGroup, topLane: number }[] = [];

  for (const g of sortedGroups) {
    let topLane = 0;
    while (true) {
      const height = g.items.length;
      const bottomLane = topLane + height - 1;
      const overlap = placedGroups.some(pg => {
        const pgBottom = pg.topLane + pg.group.items.length - 1;
        const yOverlap = topLane <= pgBottom && bottomLane >= pg.topLane;
        const xOverlap = g.startCol <= pg.group.endCol + 1 && g.endCol + 1 >= pg.group.startCol;
        return yOverlap && xOverlap;
      });
      if (!overlap) { placedGroups.push({ group: g, topLane }); break; }
      topLane++;
    }
  }

  const maxLane = placedGroups.length > 0 ? Math.max(...placedGroups.map(pg => pg.topLane + pg.group.items.length - 1)) : -1;
  const lanes: LaneTask[][] = Array.from({ length: maxLane + 1 }, () => []);
  placedGroups.forEach(pg => pg.group.items.forEach((t, i) => lanes[pg.topLane + i].push(t)));
  return lanes;
};



export const Zone4Timeline: React.FC<Props> = ({ tasks, projects, staff, timesheets, leaves, holidays, currentUser, token, onRefresh }) => {
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [hoveredProject, setHoveredProject] = useState<string | null>(null);
  const [hoveredStaff, setHoveredStaff] = useState<string | null>(null);

  const [staffOrder, setStaffOrder] = useState<string[]>([]);
  const [pinnedStaffIds, setPinnedStaffIds] = useState<string[]>([]);

  const [inlineActionCell, setInlineActionCell] = useState<{ staffId: string, date: Date } | null>(null);

  const [statusFilters, setStatusFilters] = useState({
    active: true,
    pending: false,
    closed: false
  });

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportStartMonth, setExportStartMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [exportEndMonth, setExportEndMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [isExporting, setIsExporting] = useState(false);

  const monthOptions = useMemo(() => {
    const options = [];
    const currentYear = new Date().getFullYear();
    for (let y = currentYear + 1; y >= currentYear - 2; y--) {
      for (let m = 12; m >= 1; m--) {
        options.push(`${y}-${String(m).padStart(2, '0')}`);
      }
    }
    return options;
  }, []);

  const handleExport = async () => {
    if (!token) return;
    setIsExporting(true);
    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${baseUrl}/api/reports/export-timesheet?startMonth=${exportStartMonth}&endMonth=${exportEndMonth}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FanE_Report_${exportStartMonth}_to_${exportEndMonth}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setIsExportModalOpen(false);
    } catch (err) {
      alert('Lỗi xuất báo cáo Excel.');
    } finally {
      setIsExporting(false);
    }
  };

  const availableHalfYears = useMemo(() => {
    if (tasks.length === 0) return ['Today'];
    let minYear = new Date().getFullYear();
    let maxYear = new Date().getFullYear();
    tasks.forEach(t => {
      const y = new Date(t.startDate).getFullYear();
      const endY = new Date(t.deadline).getFullYear();
      if (y < minYear) minYear = y;
      if (endY > maxYear) maxYear = endY;
    });
    const hys: string[] = ['Today'];
    for (let y = minYear; y <= maxYear; y++) {
      hys.push(`${y}Q1`);
      hys.push(`${y}Q2`);
      hys.push(`${y}Q3`);
      hys.push(`${y}Q4`);
    }

    hys.sort((a, b) => {
      const getVal = (str: string) => {
        if (str === 'Today') return startOfDay(new Date()).getTime();
        const year = parseInt(str.substring(0, 4));
        const q = parseInt(str.substring(5, 6));
        return new Date(year, (q - 1) * 3, 1).getTime();
      };
      return getVal(b) - getVal(a);
    });

    return hys;
  }, [tasks]);

  const [selectedHalfYear, setSelectedHalfYear] = useState<string>('Today');

  const { dates, totalDays, months, staffRows, todayCol } = useMemo(() => {
    if (tasks.length === 0 || !selectedHalfYear) return { dates: [], totalDays: 0, months: [], staffRows: [], todayCol: -1 };

    let startD: Date;
    let endD: Date;
    let viewRangeEndD: Date;

    if (selectedHalfYear === 'Today') {
      startD = startOfDay(new Date());
      viewRangeEndD = addDays(startD, 90);
    } else {
      const year = parseInt(selectedHalfYear.substring(0, 4));
      const q = parseInt(selectedHalfYear.substring(5, 6));
      startD = new Date(year, (q - 1) * 3, 1);
      viewRangeEndD = new Date(year, q * 3, 0);
    }

    // Unlimited timeline to the right: at least 3 years from start date
    // Or up to the furthest task deadline + 1 year
    let maxDeadline = startD;
    tasks.forEach(t => {
      const d = startOfDay(new Date(t.deadline));
      if (d > maxDeadline) maxDeadline = d;
    });
    const defaultEndD = addDays(startD, 365 * 3);
    const taskEndD = addDays(maxDeadline, 365);
    endD = defaultEndD > taskEndD ? defaultEndD : taskEndD;
    const totalDays = differenceInDays(endD, startD) + 1;

    const dates = [];
    const monthsData: { month: string; colSpan: number }[] = [];
    let currentMonthStr = '';
    let currentMonthCount = 0;

    for (let i = 0; i < totalDays; i++) {
      const d = addDays(startD, i);
      dates.push(d);

      const mStr = format(d, 'MMMM yyyy');
      if (mStr !== currentMonthStr) {
        if (currentMonthCount > 0) {
          monthsData.push({ month: currentMonthStr, colSpan: currentMonthCount });
        }
        currentMonthStr = mStr;
        currentMonthCount = 1;
      } else {
        currentMonthCount++;
      }
    }
    if (currentMonthCount > 0) {
      monthsData.push({ month: currentMonthStr, colSpan: currentMonthCount });
    }

    const todayCol = differenceInDays(startOfDay(new Date()), startD) + 1;

    const staffRows: StaffRowData[] = staff.map(s => {
      const assignedTasks = tasks.filter(t => {
        if (!t.assignees.some(a => a.staffId === s.staffId)) return false;

        const p = projects.find(pr => pr.projectCode === t.projectCode);
        if (!p) return false;
        if (p.status === 'Closed' && !statusFilters.closed) return false;
        if (p.status === 'Pending Feedback' && !statusFilters.pending) return false;
        if ((p.status === 'In Progress' || p.status === 'Not Started') && !statusFilters.active) return false;

        const tStart = startOfDay(new Date(t.startDate));
        const tEnd = startOfDay(new Date(t.deadline));
        if (tStart > endD || tEnd < startD) return false;

        return true;
      });

      const laneTasks: LaneTask[] = assignedTasks.map(t => {
        const logs = timesheets.filter(ts => ts.taskId === t.taskId && ts.staffId === s.staffId);
        logs.sort((a, b) => new Date(a.logDate).getTime() - new Date(b.logDate).getTime());

        const firstLogD: Date | null = logs.length > 0 ? new Date(logs[0].logDate) : null;
        const lastLogD: Date | null = logs.length > 0 ? new Date(logs[logs.length - 1].logDate) : null;

        const startD_Task = startOfDay(new Date(t.startDate));
        const deadD_Task = startOfDay(new Date(t.deadline));

        const startCol = Math.max(1, differenceInDays(startD_Task, startD) + 1);
        const deadlineCol = Math.min(totalDays, Math.max(startCol, differenceInDays(deadD_Task, startD) + 1));

        const firstLogCol = firstLogD ? Math.max(1, Math.min(totalDays, differenceInDays(startOfDay(firstLogD), startD) + 1)) : null;
        const lastLogCol = lastLogD ? Math.max(1, Math.min(totalDays, differenceInDays(startOfDay(lastLogD), startD) + 1)) : null;

        const isCompleted = t.status === 'Completed';
        const rawEndCol = Math.max(deadlineCol, lastLogCol || 0, !isCompleted ? Math.max(todayCol, deadlineCol) : 0);
        const endCol = Math.min(totalDays, rawEndCol);

        return {
          task: t,
          startCol,
          endCol,
          firstLogCol,
          lastLogCol,
          deadlineCol,
          isOverdue: new Date() > deadD_Task && t.status !== 'Completed'
        };
      });

      const projectGroups: Record<string, ProjectData> = {};

      laneTasks.forEach(lt => {
        const pCode = lt.task.projectCode;
        if (!projectGroups[pCode]) {
          const p = projects.find(pr => pr.projectCode === pCode);
          if (!p) return;
          projectGroups[pCode] = {
            project: p,
            startCol: lt.startCol,
            endCol: Math.max(lt.endCol, lt.deadlineCol),
            lanes: [] as LaneTask[][]
          };
        }
        projectGroups[pCode].startCol = Math.min(projectGroups[pCode].startCol, lt.startCol);
        projectGroups[pCode].endCol = Math.max(projectGroups[pCode].endCol, lt.endCol, lt.deadlineCol);
      });

      const projectsData = Object.values(projectGroups).map(pg => {
        const pTasks = laneTasks.filter(lt => lt.task.projectCode === pg.project.projectCode);
        pTasks.sort((a, b) => {
          if (a.task.parentTaskId === b.task.parentTaskId) return a.startCol - b.startCol;
          if (a.task.parentTaskId === b.task.taskId) return 1;
          if (b.task.parentTaskId === a.task.taskId) return -1;
          return a.startCol - b.startCol;
        });
        return { ...pg, lanes: packTasksIntoLanes(pTasks) };
      });

      const hasActiveTasksInView = assignedTasks.some(t => {
        const tStart = startOfDay(new Date(t.startDate));
        const tEnd = startOfDay(new Date(t.deadline));
        return !(tStart > viewRangeEndD || tEnd < startD);
      });

      return {
        staff: s,
        projectsData,
        roleWeight: s.level || 99,
        hasActiveTasksInView
      };
    });

    return { dates, totalDays, months: monthsData, staffRows, todayCol };
  }, [tasks, staff, timesheets, projects, selectedHalfYear, statusFilters]);

  const renderRows = useMemo(() => {
    let filtered = staffRows;
    if (selectedProjects.size > 0) {
      filtered = filtered.filter(row => {
        return row.projectsData.some(pd => selectedProjects.has(pd.project.projectCode));
      });
    }

    filtered.sort((a, b) => {
      const pinA = pinnedStaffIds.indexOf(a.staff.staffId);
      const pinB = pinnedStaffIds.indexOf(b.staff.staffId);
      if (pinA !== -1 && pinB !== -1) return pinA - pinB;
      if (pinA !== -1) return -1;
      if (pinB !== -1) return 1;

      // 1. Inactive staff are ALWAYS pushed to the bottom, overriding custom order
      if (a.hasActiveTasksInView && !b.hasActiveTasksInView) return -1;
      if (!a.hasActiveTasksInView && b.hasActiveTasksInView) return 1;

      // 2. Custom drag-and-drop order applies within the Active/Inactive groups
      const idxA = staffOrder.indexOf(a.staff.staffId);
      const idxB = staffOrder.indexOf(b.staff.staffId);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;

      // 3. Fallback to Role and Name
      if (a.roleWeight !== b.roleWeight) return a.roleWeight - b.roleWeight;
      return a.staff.fullName.localeCompare(b.staff.fullName);
    });

    return filtered;
  }, [staffRows, selectedProjects, pinnedStaffIds, staffOrder]);

  const toggleProjectFilter = (pCode: string) => {
    const next = new Set(selectedProjects);
    if (next.has(pCode)) next.delete(pCode);
    else next.add(pCode);
    setSelectedProjects(next);
  };

  const togglePinStaff = (staffId: string) => {
    setPinnedStaffIds(prev =>
      prev.includes(staffId) ? prev.filter(id => id !== staffId) : [...prev, staffId]
    );
  };

  const onDragStart = (e: React.DragEvent, staffId: string) => {
    e.dataTransfer.setData('staffId', staffId);
  };

  const onDrop = (e: React.DragEvent, targetStaffId: string) => {
    const draggedId = e.dataTransfer.getData('staffId');
    if (draggedId === targetStaffId) return;

    let currentOrder = staffOrder.length > 0 ? staffOrder : renderRows.map(r => r.staff.staffId);

    if (currentOrder.indexOf(draggedId) === -1) currentOrder = renderRows.map(r => r.staff.staffId);

    const finalDraggedIdx = currentOrder.indexOf(draggedId);
    const targetIdx = currentOrder.indexOf(targetStaffId);

    const newOrder = [...currentOrder];
    newOrder.splice(finalDraggedIdx, 1);
    newOrder.splice(targetIdx, 0, draggedId);

    setStaffOrder(newOrder);
  };

  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [colWidth, setColWidth] = useState(45);

  React.useLayoutEffect(() => {
    if (!scrollContainerRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        const newColWidth = Math.max(45, (width - 250) / 21);
        setColWidth(newColWidth);
      }
    });
    observer.observe(scrollContainerRef.current);
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    if (scrollContainerRef.current) {
      setTimeout(() => {
        if (scrollContainerRef.current) scrollContainerRef.current.scrollLeft = 0;
      }, 50);
    }
  }, [selectedHalfYear]);

  if (totalDays === 0) return <div>No tasks to display</div>;

  return (
    <div className="glass-panel flex flex-col gap-5 relative overflow-hidden">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-6">
            <div className="flex items-center gap-2 mt-1">
              <CalendarDays className="text-accent-green" size={28} />
              <h2 className="text-2xl font-bold text-white m-0 tracking-wide">Project Timeline</h2>
              <CustomTooltip text="💡 Chọn mốc thời gian bắt đầu, pin project & nhân sự cụ thể để xem chi tiết" />
            </div>

            {/* Control Panel wrapper */}
            <div className="flex flex-col items-start gap-2 relative">
              <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 shadow-[inset_0_2px_10px_rgba(0,0,0,0.2)]">
                <div className="flex items-center">
                  <select
                    className="bg-transparent text-white text-sm font-medium outline-none cursor-pointer border-none focus:ring-0"
                    value={selectedHalfYear}
                    onChange={(e) => setSelectedHalfYear(e.target.value)}
                  >
                    {availableHalfYears.map(hy => (
                      <option key={hy} value={hy} className="bg-background-dark">{hy}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-4 text-xs font-medium">
                  <label className="flex items-center gap-1.5 cursor-pointer text-white hover:text-white/80 transition-colors">
                    <input type="checkbox" checked={statusFilters.active} onChange={e => setStatusFilters(s => ({ ...s, active: e.target.checked }))} className="accent-accent-green w-3.5 h-3.5" />
                    Active
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-text-muted hover:text-white transition-colors">
                    <input type="checkbox" checked={statusFilters.pending} onChange={e => setStatusFilters(s => ({ ...s, pending: e.target.checked }))} className="accent-accent-orange w-3.5 h-3.5" />
                    Pending
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-text-muted hover:text-white transition-colors">
                    <input type="checkbox" checked={statusFilters.closed} onChange={e => setStatusFilters(s => ({ ...s, closed: e.target.checked }))} className="accent-text-muted w-3.5 h-3.5" />
                    Closed
                  </label>
                </div>
              </div>
              <button
                onClick={() => setIsExportModalOpen(!isExportModalOpen)}
                className="px-3 py-1.5 bg-accent-blue/20 hover:bg-accent-blue/30 text-accent-blue border border-accent-blue/50 rounded-lg text-[10px] uppercase tracking-wider font-bold transition-colors flex items-center gap-1.5 shadow-sm"
              >
                ⬇️ Export Timesheet
              </button>

              {/* Inline Export Box */}
              {isExportModalOpen && (
                <div className="absolute top-full mt-2 left-0 z-50 bg-background-card border border-white/10 rounded-xl p-4 shadow-2xl w-64 flex flex-col gap-3 animate-fade-in">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Từ tháng</label>
                    <select
                      value={exportStartMonth}
                      onChange={e => setExportStartMonth(e.target.value)}
                      className="bg-background-dark border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-accent-blue transition-all"
                    >
                      {monthOptions.map(m => (
                        <option key={m} value={m}>{format(parseISO(`${m}-01`), 'MM/yyyy')}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Đến tháng</label>
                    <select
                      value={exportEndMonth}
                      onChange={e => setExportEndMonth(e.target.value)}
                      className="bg-background-dark border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-accent-blue transition-all"
                    >
                      {monthOptions.map(m => (
                        <option key={m} value={m}>{format(parseISO(`${m}-01`), 'MM/yyyy')}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={handleExport}
                    className="w-full mt-1 px-3 py-2 rounded-lg font-bold text-xs transition-all text-white bg-accent-blue hover:bg-accent-blue/90 shadow-[0_0_10px_rgba(13,166,242,0.3)] hover:shadow-[0_0_15px_rgba(13,166,242,0.5)] disabled:opacity-50 flex items-center justify-center gap-2"
                    disabled={isExporting}
                  >
                    {isExporting ? 'Exporting...' : 'Download Excel'}
                  </button>
                </div>
              )}
            </div>
          </div>



          <div className="flex flex-wrap gap-2 justify-end max-w-xl">
            {projects
              .filter(p => {
                if (p.status === 'Closed' && !statusFilters.closed) return false;
                if (p.status === 'Pending Feedback' && !statusFilters.pending) return false;
                if ((p.status === 'In Progress' || p.status === 'Not Started') && !statusFilters.active) return false;
                return true;
              })
              .sort((a, b) => (a.status === 'Pending Feedback' ? 1 : 0) - (b.status === 'Pending Feedback' ? 1 : 0))
              .map(p => {
                const isSelected = selectedProjects.has(p.projectCode);
                const isHovered = hoveredProject === p.projectCode;
                const staffHoverGlow = hoveredStaff && staffRows.find(sr => sr.staff.staffId === hoveredStaff)?.projectsData.some(pd => pd.project.projectCode === p.projectCode);
                const isPending = p.status === 'Pending Feedback';

                return (
                  <button
                    key={p.projectCode}
                    onClick={() => toggleProjectFilter(p.projectCode)}
                    onMouseEnter={() => setHoveredProject(p.projectCode)}
                    onMouseLeave={() => setHoveredProject(null)}
                    className={clsx(
                      "px-3 py-1 rounded-full text-xs font-medium transition-all duration-300 border flex items-center gap-1.5",
                      isPending && !isSelected && !isHovered ? "opacity-40 saturate-50" : "opacity-100",
                      isSelected ? "bg-white/20 border-white text-white shadow-[0_0_15px_rgba(255,255,255,0.3)]" : "bg-background-card/50 border-text-muted/20 text-text-muted hover:text-white",
                      (isHovered || staffHoverGlow) && !isSelected && "shadow-[0_0_10px_rgba(255,255,255,0.3)] border-white/50 text-white"
                    )}
                    style={{
                      borderLeftWidth: '4px',
                      borderLeftColor: getProjectColor(p.projectCode, projects)
                    }}
                  >
                    {p.name}
                  </button>
                );
              })}
          </div>
        </div>
      </div>

      <Tooltip.Provider delayDuration={200}>
        <div
          ref={scrollContainerRef}
          className="overflow-x-auto overflow-y-auto h-[1200px] custom-scrollbar pb-4 shadow-[inset_-20px_0_20px_-20px_rgba(0,0,0,0.5)] border border-text-muted/10 rounded-xl"
        >
          <div className="min-w-[1000px]">
            {/* Header: Months */}
            <div
              className="grid border-b border-text-muted/20 pb-1 pt-2 sticky top-0 z-30 bg-background-dark w-fit min-w-full"
              style={{ gridTemplateColumns: `250px repeat(${totalDays}, ${colWidth}px)` }}
            >
              <div className="font-semibold text-white/90 text-sm px-4 sticky left-0 z-40 bg-background-dark border-r border-white/5 flex items-center shadow-[10px_0_20px_-5px_rgba(0,0,0,0.8)]">
                Staff Directory
              </div>
              {months.map((m, i) => (
                <div key={i} className="border-l border-text-muted/10 bg-white/5" style={{ gridColumn: `span ${m.colSpan}` }}>
                  <div
                    className="sticky py-1 text-xs font-bold text-white/70 uppercase tracking-wider w-fit mx-auto"
                    style={{ left: '250px', right: '0px' }}
                  >
                    {m.month}
                  </div>
                </div>
              ))}
            </div>

            {/* Header: Days */}
            <div
              className="grid border-b border-text-muted/20 mb-2 sticky top-[36px] z-30 bg-background-dark w-fit min-w-full"
              style={{ gridTemplateColumns: `250px repeat(${totalDays}, ${colWidth}px)` }}
            >
              <div className="sticky left-0 z-40 bg-background-dark border-r border-white/5 h-full shadow-[10px_0_20px_-5px_rgba(0,0,0,0.8)]"></div>
              {dates.map((d, i) => {
                const isWe = isWeekend(d);
                const isHol = holidays && holidays.some(h => isWithinInterval(d, { start: startOfDay(new Date(h.startDate)), end: startOfDay(new Date(h.endDate)) }));
                return (
                  <div key={i} className={clsx(
                    "text-center text-xs py-1 border-l border-text-muted/10 transition-colors",
                    (isWe || isHol) ? "text-accent-red/60 font-medium" : "text-text-muted",
                    todayCol === i + 1 && "bg-accent-blue/20 text-accent-blue font-bold shadow-[inset_0_-2px_0_rgba(13,166,242,1)]"
                  )}>
                    {format(d, 'd')}
                  </div>
                );
              })}
            </div>

            {/* Staff Rows */}
            <div className="flex flex-col gap-2">
              {renderRows.map(row => {
                const isPinned = pinnedStaffIds.includes(row.staff.staffId);
                const isHovered = hoveredStaff === row.staff.staffId;

                return (
                  <div
                    key={row.staff.staffId}
                    className={clsx(
                      "grid relative group rounded-r-lg transition-all duration-300 border border-transparent w-fit min-w-full",
                      isHovered ? "bg-white/5 border-white/10" : "hover:bg-white/5",
                      hoveredStaff && !isHovered && "opacity-30"
                    )}
                    style={{ gridTemplateColumns: `250px repeat(${totalDays}, ${colWidth}px)` }}
                    onMouseEnter={() => setHoveredStaff(row.staff.staffId)}
                    onMouseLeave={() => setHoveredStaff(null)}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => onDrop(e, row.staff.staffId)}
                  >
                    {/* Y-Axis Label (Sticky) */}
                    <div
                      className="sticky left-0 z-20 bg-background-dark border-r border-white/5 px-2 py-3 flex items-start gap-2 shadow-[10px_0_20px_-5px_rgba(0,0,0,0.8)]"
                      draggable
                      onDragStart={e => onDragStart(e, row.staff.staffId)}
                    >
                      <GripVertical className="text-text-muted/30 hover:text-white cursor-grab mt-1 transition-colors" size={16} />
                      <div className="flex-1 cursor-pointer group-hover:text-white transition-colors" onClick={() => togglePinStaff(row.staff.staffId)}>
                        <div className="font-semibold text-white truncate flex items-center gap-2">
                          {row.staff.fullName}
                          {isPinned && <span className="text-[9px] uppercase tracking-wider bg-accent-purple/80 px-1.5 py-0.5 rounded text-white shadow-[0_0_8px_rgba(139,86,245,0.5)]">Pinned</span>}
                        </div>
                        <div className="text-[11px] text-text-muted truncate mt-0.5">{row.staff.role}</div>
                      </div>
                    </div>

                    {/* Timeline Grid Background (Soft Boundaries) */}
                    <div className="absolute inset-0 left-[250px] flex z-0">
                      {dates.map((d, i) => {
                        const isWe = isWeekend(d);
                        const isHol = holidays && holidays.some(h => isWithinInterval(d, { start: startOfDay(new Date(h.startDate)), end: startOfDay(new Date(h.endDate)) }));
                        const isLeave = leaves && leaves.some(l => l.staffId === row.staff.staffId && l.status === 'Approved' && startOfDay(new Date(l.leaveDate)).getTime() === startOfDay(d).getTime());

                        return (
                          <div
                            key={i}
                            className={clsx(
                              "border-l border-text-muted/5 h-full transition-colors cursor-pointer hover:bg-white/10",
                              (isWe || isHol || isLeave) && "bg-[repeating-linear-gradient(45deg,rgba(148,163,184,0.03),rgba(148,163,184,0.03)_4px,transparent_4px,transparent_8px)]",
                              isLeave && "bg-accent-orange/5"
                            )}
                            style={{ width: `${colWidth}px` }}
                            onClick={() => {
                              if (currentUser && token) {
                                setInlineActionCell({ staffId: row.staff.staffId, date: d });
                              } else {
                                alert("You must be logged in to perform this action.");
                              }
                            }}
                          />
                        );
                      })}
                    </div>

                    {/* Lanes / Projects Container */}
                    <div className="col-span-full col-start-2 relative z-10 flex flex-col justify-center gap-y-4 py-4 px-1 pointer-events-none" style={{ display: 'grid', gridTemplateColumns: `repeat(${totalDays}, ${colWidth}px)` }}>
                      {row.projectsData.map(projData => {
                        if (selectedProjects.size > 0 && !selectedProjects.has(projData.project.projectCode)) return null;
                        const pColor = getProjectColor(projData.project.projectCode, projects);

                        return (
                          <div key={projData.project.projectCode} className="relative rounded-xl border p-2 mt-2 pointer-events-none"
                            style={{
                              gridColumn: `${projData.startCol} / ${projData.endCol + 1}`,
                              borderColor: getRgba(pColor, 0.3),
                              backgroundColor: getRgba(pColor, 0.05),
                            }}>

                            {/* Project Badge at top-left of container (Sticky) */}
                            <div className="sticky left-[258px] z-40 w-fit h-0">
                              <div className="absolute -top-3 px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-md border flex items-center gap-1 whitespace-nowrap"
                                style={{ backgroundColor: pColor, borderColor: getRgba(pColor, 0.5) }}>
                                {projData.project.name}
                                <span className="opacity-80 font-normal">| {projData.project.creativeLead?.firstName || 'No Lead'}</span>
                              </div>
                            </div>


                            {/* Lanes */}
                            <div className="flex flex-col gap-2 mt-2 relative w-full h-full">
                              {projData.lanes.map((lane, lIdx) => (
                                <div key={lIdx} className="relative h-7 w-full">
                                  {lane.map((lt) => {
                                    const isProjectHovered = hoveredProject === lt.task.projectCode;
                                    const dimOther = hoveredProject && !isProjectHovered;

                                    const sC = lt.startCol;
                                    const eC = lt.endCol;
                                    const dC = lt.deadlineCol;

                                    const projSpan = projData.endCol - projData.startCol + 1;
                                    const getLeftPct = (col: number) => `${((col - projData.startCol) / projSpan) * 100}%`;
                                    const getWidthPct = (startCol: number, endCol: number) => `${((endCol - startCol + 1) / projSpan) * 100}%`;

                                    let delayEnd = -1;
                                    if (lt.firstLogCol) {
                                      delayEnd = lt.firstLogCol - 1;
                                    } else if (lt.task.status !== 'Completed') {
                                      delayEnd = todayCol > sC ? Math.min(todayCol, eC) : -1;
                                    }

                                    const isSubTask = !!lt.task.parentTaskId;

                                    return (
                                      <Tooltip.Root key={lt.task.taskId}>
                                        <Tooltip.Trigger asChild>
                                          <div
                                            className={clsx(
                                              "absolute rounded-md cursor-pointer transition-all duration-300 pointer-events-auto",
                                              isSubTask ? "h-5 top-1" : "h-7 top-0",
                                              dimOther ? "opacity-20 saturate-0" : "opacity-100",
                                              isProjectHovered && "z-50 scale-[1.02]",
                                              lt.isOverdue && "animate-pulse"
                                            )}
                                            style={{
                                              left: getLeftPct(sC),
                                              width: getWidthPct(sC, eC)
                                            }}
                                          >
                                            {/* Planned Range */}
                                            <div
                                              className={clsx("absolute top-0 bottom-0 rounded-md transition-all", isProjectHovered && "ring-2 ring-white shadow-[0_0_15px_rgba(255,255,255,0.4)]", lt.isOverdue && "ring-2 ring-accent-red")}
                                              style={{
                                                left: 0,
                                                width: `${((dC - sC + 1) / (eC - sC + 1)) * 100}%`,
                                                backgroundColor: getRgba(pColor, 0.15),
                                                border: `1px solid ${getRgba(pColor, 0.4)}`
                                              }}
                                            />

                                            {/* Delay Dotted Line */}
                                            {delayEnd >= sC && (
                                              <div className="absolute h-full flex items-center z-10" style={{ left: 0, width: `${((delayEnd - sC + 1) / (eC - sC + 1)) * 100}%` }}>
                                                <div className="w-full border-t-[3px] border-dotted" style={{ borderColor: getRgba(pColor, 0.8) }}></div>
                                              </div>
                                            )}

                                            {/* Actual Activity Solid Bar */}
                                            {lt.firstLogCol && lt.lastLogCol && lt.lastLogCol >= lt.firstLogCol && (
                                              <div
                                                className="absolute top-[2px] bottom-[2px] rounded-[4px] shadow-sm transition-all duration-300 z-10"
                                                style={{
                                                  left: `${((lt.firstLogCol - sC) / (eC - sC + 1)) * 100}%`,
                                                  width: `${((lt.lastLogCol - lt.firstLogCol + 1) / (eC - sC + 1)) * 100}%`,
                                                  backgroundColor: pColor,
                                                  backgroundImage: `linear-gradient(90deg, transparent, rgba(255,255,255,0.15) 50%, transparent)`
                                                }}
                                              ></div>
                                            )}

                                            {/* Early Done Dotted Line */}
                                            {lt.task.status === 'Completed' && lt.lastLogCol && lt.lastLogCol < dC && (
                                              <div className="absolute h-full flex items-center z-10" style={{ left: `${((lt.lastLogCol + 1 - sC) / (eC - sC + 1)) * 100}%`, width: `${((dC - (lt.lastLogCol + 1) + 1) / (eC - sC + 1)) * 100}%` }}>
                                                <div className="w-full border-t-[3px] border-dotted" style={{ borderColor: getRgba(pColor, 0.8) }}></div>
                                              </div>
                                            )}

                                            {/* Deadline Red Marker */}
                                            <div
                                              className="absolute h-[140%] w-[2px] bg-accent-red z-20 top-[-20%] shadow-[0_0_5px_rgba(219,20,60,0.8)]"
                                              style={{ left: `calc(${((dC - sC + 1) / (eC - sC + 1)) * 100}% - 2px)` }}
                                            ></div>

                                            {/* Task Name */}
                                            <div className="absolute top-0 bottom-0 left-0 flex items-center px-3 z-30 pointer-events-none overflow-hidden w-full">
                                              <span className={clsx("block font-semibold text-white truncate drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] w-full", isSubTask ? "text-[10px]" : "text-[11px]")}>
                                                {isSubTask ? `↳ ${lt.task.name}` : lt.task.name}
                                              </span>
                                            </div>
                                          </div>
                                        </Tooltip.Trigger>
                                        <Tooltip.Portal>
                                          <Tooltip.Content className="bg-background-card/95 backdrop-blur-xl border border-text-muted/20 px-4 py-3 rounded-xl shadow-2xl text-xs text-white max-w-sm z-50">
                                            <div className="font-bold text-sm mb-2 text-white">{lt.task.name}</div>
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                              <div className="text-text-muted">Project:</div>
                                              <div className="font-medium" style={{ color: pColor }}>{projData.project.name}</div>

                                              <div className="text-text-muted">Status:</div>
                                              <div className={clsx("font-medium", lt.task.status === 'Completed' ? "text-accent-green" : "text-accent-orange")}>{lt.task.status}</div>

                                              <div className="text-text-muted">Start Date:</div>
                                              <div className="font-medium text-white/90">{format(new Date(lt.task.startDate), 'dd/MM/yyyy')}</div>

                                              <div className="text-text-muted">Deadline:</div>
                                              <div className="font-medium text-white/90">{format(new Date(lt.task.deadline), 'dd/MM/yyyy')}</div>

                                              <div className="text-text-muted">First Log:</div>
                                              <div className="font-medium text-white/90">{lt.firstLogCol ? 'Yes' : 'No logs yet'}</div>
                                            </div>
                                            {lt.isOverdue && (
                                              <div className="mt-3 bg-accent-red/20 border border-accent-red/30 px-2 py-1 rounded text-accent-red font-bold text-center animate-pulse">
                                                ⚠️ LATE / OVERDUE
                                              </div>
                                            )}
                                            <Tooltip.Arrow className="fill-background-card/95" />
                                          </Tooltip.Content>
                                        </Tooltip.Portal>
                                      </Tooltip.Root>
                                    );
                                  })}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                      {row.projectsData.length === 0 && (
                        <div className="h-7 flex items-center px-4 text-xs font-medium text-text-muted/30 italic" style={{ gridColumn: '1 / -1' }}>No active tasks assigned</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      </Tooltip.Provider>

      {currentUser && (
        <InlineActionModal
          isOpen={inlineActionCell !== null}
          onClose={() => setInlineActionCell(null)}
          initialDate={inlineActionCell?.date || null}
          initialStaffId={inlineActionCell?.staffId || null}
          projects={projects}
          tasks={tasks}
          staffList={staff}
          currentUser={currentUser}
          token={token || null}
          onRefresh={onRefresh}
        />
      )}

    </div>
  );
};

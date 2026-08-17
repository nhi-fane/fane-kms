import React, { useState, useMemo } from 'react';
import type { Task, Project, Timesheet, Staff } from '../hooks/useDashboardData';
import { AddTaskModal } from './AddTaskModal';
import { CheckSquare, Square, ChevronRight, ChevronDown, ChevronLeft, Plus, CalendarDays } from 'lucide-react';
import clsx from 'clsx';
import { format, eachDayOfInterval, isWeekend, isSameDay, subDays, addDays } from 'date-fns';

interface Zone4Props {
  tasks: Task[];
  projects: Project[];
  staff: Staff[];
  timesheets: Timesheet[];
  leaves: { leaveDate: string | Date; duration: number; status: string; staffId: string }[];
  holidays: { startDate: string | Date; endDate: string | Date }[];
  currentUser: { staffId: string; fullName: string; role: string };
  token: string | null;
  onRefresh?: () => void;
}

export const Zone4TimelineEditable: React.FC<Zone4Props> = ({
  tasks, projects, staff, timesheets, leaves, holidays, currentUser, token, onRefresh
}) => {
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  const [editingCell, setEditingCell] = useState<{ taskId: string, dateStr: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [addingTask, setAddingTask] = useState<{ projectCode: string, parentTaskId: string | null } | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [projectViewMode, setProjectViewMode] = useState<'my' | 'all'>('my');
  const [collapseSubtasks, setCollapseSubtasks] = useState(false);

  const [internalDateRange, setInternalDateRange] = useState({
    start: subDays(new Date(), 14),
    end: addDays(new Date(), 14)
  });

  const handleShiftDates = (daysOffset: number) => {
    setInternalDateRange(prev => ({
      start: addDays(prev.start, daysOffset),
      end: addDays(prev.end, daysOffset)
    }));
  };

  const handleResetToToday = () => {
    setInternalDateRange({
      start: subDays(new Date(), 14),
      end: addDays(new Date(), 14)
    });
  };

  // Date grid columns
  const days = useMemo(() => {
    return eachDayOfInterval({ start: internalDateRange.start, end: internalDateRange.end });
  }, [internalDateRange]);

  const toggleProject = (code: string) => setExpandedProjects(p => ({ ...p, [code]: !p[code] }));
  const toggleTask = (taskId: string) => setExpandedTasks(p => ({ ...p, [taskId]: !p[taskId] }));

  const myTasks = tasks.filter(t => t.assignees?.some(a => a.staffId === currentUser.staffId));
  const myTaskIds = new Set(myTasks.map(t => t.taskId));

  const handleToggleDone = async (task: Task) => {
    const me = task.assignees?.find(a => a.staffId === currentUser.staffId);
    const newStatus = !me?.isDone;

    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      await fetch(`${baseUrl}/api/tasks/${task.taskId}/assignee-status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isDone: newStatus })
      });
      // Optionally trigger reload here or rely on optimistic UI. For now just let user know it takes a sec.
      if (onRefresh) onRefresh();
      else window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Failed to update status");
    }
  };

  const handleSaveTimesheet = async (taskId: string, date: Date, val: string) => {
    setEditingCell(null);
    const num = parseFloat(val);
    if (isNaN(num)) return;

    // Check if exists
    const existing = timesheets.find(ts => ts.taskId === taskId && isSameDay(new Date(ts.logDate), date));

    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      if (existing) {
        if (existing.approvalStatus === 'Approved') {
          alert("Cannot modify approved timesheet");
          return;
        }
        await fetch(`${baseUrl}/api/timesheets/${existing.logId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ hoursLogged: num })
        });
      } else {
        await fetch(`${baseUrl}/api/timesheets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ taskId, hoursLogged: num, logDate: date.toISOString(), logSource: 'Web My Portal' })
        });
      }
      if (onRefresh) onRefresh();
      else window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Failed to save timesheet");
    }
  };

  const isDayOff = (date: Date) => {
    if (isWeekend(date)) return true;
    const isHoliday = holidays.some(h => date >= new Date(h.startDate) && date <= new Date(h.endDate));
    if (isHoliday) return true;
    const isLeave = leaves.some(l => l.status === 'Approved' && isSameDay(new Date(l.leaveDate), date));
    if (isLeave) return true;
    return false;
  };

  // Pre-filter tasks
  const filteredTasks = tasks.filter(t => {
    // 1. Time-range filter
    const taskStart = new Date(t.startDate);
    const taskEnd = new Date(t.deadline);
    const inRange = taskStart <= internalDateRange.end && taskEnd >= internalDateRange.start;
    if (!inRange) return false;

    // 2. Completed filter
    if (!showCompleted && t.status === 'Completed') return false;

    return true;
  });

  // Group by Project & build hierarchy for My Tasks check
  const projectTasks: Record<string, Task[]> = {};

  // Build a quick lookup for parent-child
  const parentIdMap = new Map<string, string>(); // child -> parent
  filteredTasks.forEach(t => {
    if (t.parentTaskId) parentIdMap.set(t.taskId, t.parentTaskId);
  });

  const finalTasks = filteredTasks.filter(t => {
    if (projectViewMode === 'all') return true;

    // 1. Assigned to me
    const assignedToMe = t.assignees?.some(a => a.staffId === currentUser.staffId);
    if (assignedToMe) return true;

    // 2. Has descendant assigned to me
    const hasMyChild = filteredTasks.some(child => {
      if (!child.assignees?.some(a => a.staffId === currentUser.staffId)) return false;
      let curr = child.parentTaskId;
      while (curr) {
        if (curr === t.taskId) return true;
        curr = parentIdMap.get(curr) || null;
      }
      return false;
    });

    if (hasMyChild) return true;

    // 3. Or if it's a subtask, is the parent assigned to me? 
    // (If I am assigned a parent task, I should see all its subtasks for context)
    let p = t.parentTaskId;
    while (p) {
      const parentTask = filteredTasks.find(pt => pt.taskId === p);
      if (parentTask?.assignees?.some(a => a.staffId === currentUser.staffId)) return true;
      p = parentTask?.parentTaskId || null;
    }

    return false;
  });

  finalTasks.forEach(t => {
    if (!projectTasks[t.projectCode]) projectTasks[t.projectCode] = [];
    projectTasks[t.projectCode].push(t);
  });

  const activeProjects = projects.filter(p => projectTasks[p.projectCode]);

  return (
    <div className="glass-panel p-6 overflow-hidden flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <CalendarDays className="text-accent-green" size={28} />
          <h2 className="text-2xl font-bold text-white m-0 tracking-wide">Project Timeline</h2>
        </div>
        <div className="flex items-center gap-6">
          {/* Filter Controls */}
          <div className="flex bg-white/5 p-1 rounded-lg border border-white/10 mr-2">
            <button
              onClick={() => setProjectViewMode('my')}
              className={clsx("px-3 py-1 rounded-md text-sm font-medium transition-colors", projectViewMode === 'my' ? "bg-accent-purple text-white shadow" : "text-text-muted hover:text-white")}
            >
              My projects
            </button>
            <button
              onClick={() => setProjectViewMode('all')}
              className={clsx("px-3 py-1 rounded-md text-sm font-medium transition-colors", projectViewMode === 'all' ? "bg-accent-purple text-white shadow" : "text-text-muted hover:text-white")}
            >
              All projects
            </button>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-text-muted cursor-pointer hover:text-white transition-colors">
              <input
                type="checkbox"
                checked={showCompleted}
                onChange={(e) => setShowCompleted(e.target.checked)}
                className="rounded border-white/20 bg-black/50 text-accent-purple focus:ring-accent-purple focus:ring-offset-black"
              />
              Show completed tasks
            </label>

            <label className="flex items-center gap-2 text-sm text-text-muted cursor-pointer hover:text-white transition-colors">
              <input
                type="checkbox"
                checked={collapseSubtasks}
                onChange={(e) => setCollapseSubtasks(e.target.checked)}
                className="rounded border-white/20 bg-black/50 text-accent-purple focus:ring-accent-purple focus:ring-offset-black"
              />
              Collapse sub-tasks
            </label>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-2 py-1 shadow-[inset_0_2px_10px_rgba(0,0,0,0.2)]">
            <button
              onClick={() => handleShiftDates(-7)}
              className="p-1.5 hover:bg-white/10 rounded text-text-muted hover:text-white transition-colors"
              title="Lùi 7 ngày"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={handleResetToToday}
              className="px-4 py-1 text-xs font-medium hover:bg-white/10 rounded text-text-muted hover:text-white transition-colors border-x border-white/10"
              title="Focus ngày hôm nay"
            >
              Today
            </button>
            <button
              onClick={() => handleShiftDates(7)}
              className="p-1.5 hover:bg-white/10 rounded text-text-muted hover:text-white transition-colors"
              title="Tiến 7 ngày"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto w-full custom-scrollbar pb-4">
        <div className="min-w-max">
          {/* Header */}
          <div className="flex border-b border-white/10 sticky top-0 z-10 bg-background-dark/95 backdrop-blur">
            <div className="w-[300px] shrink-0 p-3 font-semibold text-text-muted">Task Name</div>
            <div className="flex">
              {days.map((d, i) => (
                <div key={i} className={clsx(
                  "w-12 shrink-0 p-2 text-center text-xs border-l border-white/5",
                  isDayOff(d) ? "bg-white/5 text-text-muted/50" : "text-text-main"
                )}>
                  <div className="font-medium">{format(d, 'dd')}</div>
                  <div className="opacity-50">{format(d, 'EE')}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Body */}
          <div className="flex flex-col">
            {activeProjects.map(proj => {
              const pTasks = projectTasks[proj.projectCode];
              const isExpanded = expandedProjects[proj.projectCode] ?? true;

              const parentTasks = pTasks.filter(t => !t.parentTaskId);

              return (
                <div key={proj.projectCode} className="border-b border-white/5 last:border-0">
                  {/* Project Row */}
                  <div className="flex bg-accent-purple/10 border-l-2 border-accent-purple group">
                    <div className="w-[300px] shrink-0 p-2 flex items-center justify-between cursor-pointer hover:bg-white/5"
                      onClick={() => toggleProject(proj.projectCode)}>
                      <div className="flex items-center gap-2 overflow-hidden">
                        {isExpanded ? <ChevronDown size={16} className="text-accent-purple shrink-0" /> : <ChevronRight size={16} className="text-accent-purple shrink-0" />}
                        <span className="font-semibold text-white truncate">{proj.name}</span>
                      </div>
                      <button
                        className="text-xs flex items-center gap-1 text-accent-purple hover:text-white bg-accent-purple/20 hover:bg-accent-purple/40 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAddingTask({ projectCode: proj.projectCode, parentTaskId: null });
                        }}
                        title="Add new task"
                      >
                        <Plus size={12} /> Task
                      </button>
                    </div>
                    <div className="flex bg-black/20">
                      {/* Empty cells for project row */}
                      {days.map((d, i) => (
                        <div key={i} className={clsx("w-12 shrink-0 border-l border-white/5", isDayOff(d) ? "bg-white/5" : "")}></div>
                      ))}
                    </div>
                  </div>

                  {isExpanded && parentTasks.map(pt => {
                    const subTasks = pTasks.filter(t => t.parentTaskId === pt.taskId);
                    const isTaskExpanded = expandedTasks[pt.taskId] ?? !collapseSubtasks;

                    const renderTaskRow = (task: Task, level: number) => {
                      const isAssignedToMe = myTaskIds.has(task.taskId);
                      const me = task.assignees?.find(a => a.staffId === currentUser.staffId);

                      return (
                        <div key={task.taskId} className="flex border-t border-white/5 hover:bg-white/5 transition-colors group">
                          <div className="w-[300px] shrink-0 p-2 flex items-center gap-2 border-r border-white/5"
                            style={{ paddingLeft: `${level * 2.5 + 0.5}rem` }}>

                            {level === 1 && subTasks.length > 0 && (
                              <div className="cursor-pointer text-text-muted hover:text-white" onClick={() => toggleTask(task.taskId)}>
                                {isTaskExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              </div>
                            )}

                            {isAssignedToMe && (
                              <button onClick={() => handleToggleDone(task)} className="text-text-muted hover:text-accent-blue transition-colors">
                                {me?.isDone ? <CheckSquare size={16} className="text-green-400" /> : <Square size={16} />}
                              </button>
                            )}

                            <span className={clsx("text-sm truncate", !isAssignedToMe && "text-text-muted/50", me?.isDone && "line-through opacity-70")}
                              title={task.name}>
                              {task.name}
                            </span>

                            {level === 1 && (
                              <button
                                className="ml-auto text-xs flex items-center gap-1 text-accent-purple hover:text-white bg-accent-purple/20 hover:bg-accent-purple/40 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAddingTask({ projectCode: task.projectCode, parentTaskId: task.taskId });
                                }}
                                title="Add subtask"
                              >
                                <Plus size={12} /> Subtask
                              </button>
                            )}
                          </div>

                          <div className="flex">
                            {days.map((d, i) => {
                              const dateStr = format(d, 'yyyy-MM-dd');
                              const ts = timesheets.find(x => x.taskId === task.taskId && isSameDay(new Date(x.logDate), d));
                              const isEditing = editingCell?.taskId === task.taskId && editingCell?.dateStr === dateStr;

                              return (
                                <div key={i} className={clsx(
                                  "w-12 shrink-0 border-l border-white/5 flex items-center justify-center relative group/cell",
                                  isDayOff(d) ? "bg-white/5" : ""
                                )}
                                  onClick={() => {
                                    if (isAssignedToMe && !me?.isDone) {
                                      setEditingCell({ taskId: task.taskId, dateStr });
                                      setEditValue(ts ? String(ts.hoursLogged) : '');
                                    }
                                  }}>
                                  {isEditing ? (
                                    <input
                                      autoFocus
                                      type="text"
                                      className="w-10 h-6 bg-black text-white text-center text-sm border border-accent-blue rounded"
                                      value={editValue}
                                      onChange={e => setEditValue(e.target.value)}
                                      onBlur={() => handleSaveTimesheet(task.taskId, d, editValue)}
                                      onKeyDown={e => {
                                        if (e.key === 'Enter') handleSaveTimesheet(task.taskId, d, editValue);
                                        if (e.key === 'Escape') setEditingCell(null);
                                      }}
                                    />
                                  ) : (
                                    <span className={clsx(
                                      "text-xs font-medium cursor-pointer w-full h-full flex items-center justify-center hover:bg-white/10 transition-colors",
                                      ts?.approvalStatus === 'Approved' ? "text-green-400" : "text-accent-orange"
                                    )}>
                                      {ts ? ts.hoursLogged : ''}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    };

                    return (
                      <React.Fragment key={pt.taskId}>
                        {renderTaskRow(pt, 1)}
                        {isTaskExpanded && subTasks.map(st => renderTaskRow(st, 2))}
                      </React.Fragment>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <AddTaskModal
        isOpen={addingTask !== null}
        onClose={() => setAddingTask(null)}
        initialProjectCode={addingTask?.projectCode || null}
        initialParentTaskId={addingTask?.parentTaskId || null}
        projects={projects}
        staffList={staff}
        currentUser={currentUser}
        token={token}
        onRefresh={() => {
          setAddingTask(null);
          if (onRefresh) onRefresh();
        }}
      />
    </div>
  );
};

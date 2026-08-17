import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Staff, Project, Task } from '../hooks/useDashboardData';
import { format } from 'date-fns';
import clsx from 'clsx';

interface InlineActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate: Date | null;
  initialStaffId: string | null;
  projects: Project[];
  tasks: Task[];
  staffList: Staff[];
  currentUser: { staffId: string; fullName: string; role: string };
  token: string | null;
  onRefresh?: () => void;
}

export const InlineActionModal: React.FC<InlineActionModalProps> = ({
  isOpen, onClose, initialDate, initialStaffId, projects, tasks, staffList, currentUser, token, onRefresh
}) => {
  const [actionType, setActionType] = useState<'task' | 'log'>('task');
  
  // Task state
  const [projectCode, setProjectCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  
  // Log state
  const [logTaskId, setLogTaskId] = useState('');
  const [hours, setHours] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActionType('task');
      setProjectCode(projects.length > 0 ? projects[0].projectCode : '');
      setAssigneeIds(initialStaffId ? [initialStaffId] : []);
      setName('');
      setDescription('');
      
      const dateStr = initialDate ? format(initialDate, 'yyyy-MM-dd') : '';
      setDeadline(dateStr); 
      setHours('');
      setLogTaskId('');
    }
  }, [isOpen, initialDate, initialStaffId, projects]);

  if (!isOpen) return null;

  const dateStr = initialDate ? format(initialDate, 'yyyy-MM-dd') : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

      if (actionType === 'task') {
        if (!name || !dateStr || !deadline || assigneeIds.length === 0) {
          alert('Please fill in all required fields (Name, Deadline, and at least 1 Assignee).');
          setIsSubmitting(false);
          return;
        }

        const response = await fetch(`${baseUrl}/api/tasks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            projectCode,
            parentTaskId: null,
            name,
            description,
            startDate: dateStr,
            deadline,
            assigneeIds
          })
        });

        if (!response.ok) throw new Error('Failed to create task');

      } else {
        if (!logTaskId || !hours) {
          alert('Please select a task and enter hours.');
          setIsSubmitting(false);
          return;
        }

        const numHours = parseFloat(hours);
        if (isNaN(numHours) || numHours <= 0) {
          alert('Invalid hours.');
          setIsSubmitting(false);
          return;
        }

        const response = await fetch(`${baseUrl}/api/timesheets`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            taskId: logTaskId,
            hoursLogged: numHours,
            logDate: new Date(dateStr).toISOString(),
            logSource: 'Web Gantt Inline'
          })
        });

        if (!response.ok) throw new Error('Failed to log timesheet');
      }

      if (onRefresh) onRefresh();
      else window.location.reload();
      
      onClose();
    } catch (error: any) {
      console.error(error);
      alert('An error occurred: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleAssignee = (staffId: string) => {
    if (assigneeIds.includes(staffId)) {
      setAssigneeIds(assigneeIds.filter(id => id !== staffId));
    } else {
      setAssigneeIds([...assigneeIds, staffId]);
    }
  };

  const currentStaffObj = staffList.find(s => s.staffId === currentUser.staffId);
  const currentUserLevel = currentStaffObj?.level ?? 99;

  const unselectedStaff = staffList.filter(s => {
    if (!s.isActive) return false;
    if (assigneeIds.includes(s.staffId)) return false;
    
    // Rule: Account can assign anyone
    if (currentUser.role === 'Account') return true;
    // Rule: Can self-assign
    if (s.staffId === currentUser.staffId) return true;
    // Rule: Can assign equal or lower level (higher number = lower level)
    if (s.level >= currentUserLevel) return true;
    
    return false;
  }).sort((a, b) => a.fullName.localeCompare(b.fullName));

  const isSelf = initialStaffId === currentUser.staffId;
  const displayDate = initialDate ? format(initialDate, 'dd/MM/yyyy') : '';

  // For logging timesheet, find active tasks assigned to current user
  const myActiveTasks = tasks.filter(t => 
    t.status !== 'Completed' && 
    t.assignees?.some(a => a.staffId === currentUser.staffId)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1C1C24] border border-white/10 rounded-xl shadow-2xl w-[500px] flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white">Action for {displayDate}</h3>
          <button onClick={onClose} className="p-1 text-text-muted hover:text-white rounded-lg hover:bg-white/10 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Action Toggle */}
        <div className="p-4 border-b border-white/5 flex gap-4">
          <button
            type="button"
            className={clsx(
              "flex-1 py-2 rounded-lg text-sm font-medium transition-colors border",
              actionType === 'task' ? "bg-accent-blue/20 text-accent-blue border-accent-blue/50" : "bg-transparent text-text-muted border-white/10 hover:bg-white/5"
            )}
            onClick={() => setActionType('task')}
          >
            Add New Task
          </button>
          
          <TooltipWrapper disabled={!isSelf} message="You can only log timesheets for yourself">
            <button
              type="button"
              disabled={!isSelf}
              className={clsx(
                "flex-1 py-2 rounded-lg text-sm font-medium transition-colors border",
                actionType === 'log' ? "bg-accent-green/20 text-accent-green border-accent-green/50" : "bg-transparent text-text-muted border-white/10 hover:bg-white/5",
                !isSelf && "opacity-50 cursor-not-allowed"
              )}
              onClick={() => {
                if (isSelf) setActionType('log');
              }}
            >
              Log Timesheet
            </button>
          </TooltipWrapper>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          <form id="inlineActionForm" onSubmit={handleSubmit} className="flex flex-col gap-4">
            
            {actionType === 'task' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">Project</label>
                  <select 
                    value={projectCode} 
                    onChange={(e) => setProjectCode(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white text-sm focus:border-accent-blue focus:outline-none focus:ring-1 focus:ring-accent-blue transition-all"
                  >
                    {projects.map(p => (
                      <option key={p.projectCode} value={p.projectCode}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">Task Name <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white text-sm focus:border-accent-blue focus:outline-none focus:ring-1 focus:ring-accent-blue transition-all"
                    placeholder="Enter task name..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">Deadline <span className="text-red-500">*</span></label>
                  <input 
                    type="date" 
                    value={deadline}
                    onChange={e => setDeadline(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white text-sm focus:border-accent-blue focus:outline-none focus:ring-1 focus:ring-accent-blue transition-all [color-scheme:dark]"
                    required
                  />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <label className="text-sm font-medium text-text-muted">Assignees <span className="text-red-500">*</span></label>
                    {assigneeIds.map(id => {
                      const s = staffList.find(st => st.staffId === id);
                      if (!s) return null;
                      return (
                        <span key={id} className="flex items-center gap-1 bg-accent-purple/20 text-accent-purple text-xs px-2 py-1 rounded-md border border-accent-purple/30">
                          {s.fullName}
                          <button type="button" onClick={() => toggleAssignee(id)} className="hover:text-white transition-colors">
                            <X size={12} />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                  <div className="max-h-40 overflow-y-auto custom-scrollbar bg-black/20 rounded-lg border border-white/10 p-2 space-y-1">
                    {unselectedStaff.map(staff => (
                      <label key={staff.staffId} className="flex items-center gap-2 p-2 rounded hover:bg-white/5 cursor-pointer">
                        <div className="flex flex-col flex-1" onClick={() => toggleAssignee(staff.staffId)}>
                          <span className="text-sm text-white">{staff.fullName}</span>
                          <span className="text-xs text-text-muted">{staff.role}</span>
                        </div>
                      </label>
                    ))}
                    {unselectedStaff.length === 0 && (
                      <div className="p-2 text-xs text-text-muted text-center italic">No more staff to select</div>
                    )}
                  </div>
                </div>
              </>
            )}

            {actionType === 'log' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">Select Task <span className="text-red-500">*</span></label>
                  <select 
                    value={logTaskId} 
                    onChange={(e) => setLogTaskId(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white text-sm focus:border-accent-green focus:outline-none focus:ring-1 focus:ring-accent-green transition-all"
                    required
                  >
                    <option value="" disabled>Select a task...</option>
                    {myActiveTasks.map(t => {
                      const p = projects.find(x => x.projectCode === t.projectCode);
                      return (
                        <option key={t.taskId} value={t.taskId}>
                          [{p?.name || t.projectCode}] {t.name}
                        </option>
                      );
                    })}
                  </select>
                  {myActiveTasks.length === 0 && (
                    <p className="text-xs text-accent-orange mt-1">You have no active tasks to log time against.</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">Hours Logged <span className="text-red-500">*</span></label>
                  <input 
                    type="number" 
                    step="0.5"
                    min="0.5"
                    max="24"
                    value={hours}
                    onChange={e => setHours(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white text-sm focus:border-accent-green focus:outline-none focus:ring-1 focus:ring-accent-green transition-all"
                    placeholder="e.g. 4.5"
                    required
                  />
                </div>
              </>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-white/10">
          <button 
            type="button" 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-text-muted hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            form="inlineActionForm"
            disabled={isSubmitting || (actionType === 'log' && myActiveTasks.length === 0)}
            className={clsx(
              "px-4 py-2 text-sm font-medium text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed",
              actionType === 'task' ? "bg-accent-blue hover:bg-accent-blue/90 shadow-[0_0_15px_rgba(42,133,255,0.3)]" : "bg-accent-green hover:bg-accent-green/90 shadow-[0_0_15px_rgba(33,196,93,0.3)]"
            )}
          >
            {isSubmitting ? 'Saving...' : (actionType === 'task' ? 'Add Task' : 'Log Timesheet')}
          </button>
        </div>

      </div>
    </div>
  );
};

// A simple tooltip wrapper for disabled state
const TooltipWrapper: React.FC<{ disabled: boolean, message: string, children: React.ReactNode }> = ({ disabled, message, children }) => {
  if (!disabled) return <>{children}</>;
  return (
    <div className="relative group flex-1 flex">
      {children}
      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
        {message}
      </div>
    </div>
  );
};

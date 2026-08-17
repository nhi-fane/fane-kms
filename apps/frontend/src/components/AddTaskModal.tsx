import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Staff, Project } from '../hooks/useDashboardData';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialProjectCode: string | null;
  initialParentTaskId?: string | null;
  projects: Project[];
  staffList: Staff[];
  currentUser: { staffId: string; fullName: string; role: string };
  token: string | null;
  onRefresh?: () => void;
}

export const AddTaskModal: React.FC<AddTaskModalProps> = ({
  isOpen, onClose, initialProjectCode, initialParentTaskId, projects, staffList, currentUser, token, onRefresh
}) => {
  const [projectCode, setProjectCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [deadline, setDeadline] = useState('');
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setProjectCode(initialProjectCode || (projects.length > 0 ? projects[0].projectCode : ''));
      setAssigneeIds([currentUser.staffId]);
      setName('');
      setDescription('');
      setStartDate('');
      setDeadline('');
    }
  }, [isOpen, initialProjectCode, currentUser.staffId, projects]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !startDate || !deadline || assigneeIds.length === 0) {
      alert('Please fill in all required fields (Name, Start Date, Deadline, and at least 1 Assignee).');
      return;
    }

    setIsSubmitting(true);
    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          projectCode,
          parentTaskId: initialParentTaskId || null,
          name,
          description,
          startDate,
          deadline,
          assigneeIds
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create task');
      }

      if (onRefresh) onRefresh();
      else window.location.reload();
    } catch (error: any) {
      console.error(error);
      alert('An error occurred while creating the task: ' + error.message);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1C1C24] border border-white/10 rounded-xl shadow-2xl w-[500px] flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white">Add New Task</h3>
          <button onClick={onClose} className="p-1 text-text-muted hover:text-white rounded-lg hover:bg-white/10 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          <form id="addTaskForm" onSubmit={handleSubmit} className="flex flex-col gap-4">
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">Start Date <span className="text-red-500">*</span></label>
                <input 
                  type="date" 
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white text-sm focus:border-accent-blue focus:outline-none focus:ring-1 focus:ring-accent-blue transition-all [color-scheme:dark]"
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

            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">Description (Optional)</label>
              <textarea 
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white text-sm focus:border-accent-blue focus:outline-none focus:ring-1 focus:ring-accent-blue transition-all min-h-[80px]"
                placeholder="Enter task description..."
              />
            </div>
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
            form="addTaskForm"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-accent-blue hover:bg-accent-blue/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-[0_0_15px_rgba(42,133,255,0.3)] transition-all"
          >
            {isSubmitting ? 'Saving...' : 'Add Task'}
          </button>
        </div>

      </div>
    </div>
  );
};

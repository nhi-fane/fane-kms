import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Client, Project, Staff, FieldError } from '../hooks/useDashboardData';
import type { DraftState } from './AdminPortal';
import { Search, Plus, Trash2, ChevronDown, Folder, Save, Undo2, Loader2, Briefcase } from 'lucide-react';

// --- ProjectRow Component ---
interface ProjectRowProps {
  project: Project & { _uiKey: string };
  isAdded: boolean;
  isUpdated: boolean;
  staff: Staff[];
  onChange: (uiKey: string, field: keyof Project, value: string) => void;
  onDelete: (uiKey: string) => void;
  errors: FieldError[];
}

const ProjectRow = React.memo(({ project, isAdded, isUpdated, staff, onChange, onDelete, errors }: ProjectRowProps) => {
  const [localData, setLocalData] = useState({
    projectCode: project.projectCode,
    name: project.name,
    creativeLeadId: project.creativeLeadId || '',
    startDate: project.startDate ? project.startDate.split('T')[0] : '',
    endDate: project.endDate ? project.endDate.split('T')[0] : '',
    status: project.status || 'Not Started'
  });

  useEffect(() => {
    setLocalData({
      projectCode: project.projectCode,
      name: project.name,
      creativeLeadId: project.creativeLeadId || '',
      startDate: project.startDate ? project.startDate.split('T')[0] : '',
      endDate: project.endDate ? project.endDate.split('T')[0] : '',
      status: project.status || 'Not Started'
    });
  }, [project]);

  const localDataRef = useRef(localData);
  useEffect(() => {
    localDataRef.current = localData;
  }, [localData]);

  useEffect(() => {
    return () => {
      // Cleanup on unmount (e.g. virtual scroll): flush unblurred localData to draftData
      const current = localDataRef.current;
      const originalCode = project.projectCode;
      const originalName = project.name;
      const originalLead = project.creativeLeadId || '';
      const originalStart = project.startDate ? project.startDate.split('T')[0] : '';
      const originalEnd = project.endDate ? project.endDate.split('T')[0] : '';
      const originalStatus = project.status || 'Not Started';

      if (current.projectCode !== originalCode && current.projectCode.trim()) onChange(project._uiKey, 'projectCode', current.projectCode as any);
      if (current.name !== originalName && current.name.trim()) onChange(project._uiKey, 'name', current.name as any);
      if (current.creativeLeadId !== originalLead) onChange(project._uiKey, 'creativeLeadId', current.creativeLeadId as any);
      if (current.status !== originalStatus) onChange(project._uiKey, 'status', current.status as any);
      
      if (current.startDate !== originalStart) {
        const val = current.startDate ? new Date(current.startDate).toISOString() : null;
        onChange(project._uiKey, 'startDate', val as any);
      }
      if (current.endDate !== originalEnd) {
        const val = current.endDate ? new Date(current.endDate).toISOString() : null;
        onChange(project._uiKey, 'endDate', val as any);
      }
    };
  }, [project, onChange]);

  const handleBlur = (field: keyof Project) => {
    if ((field === 'projectCode' || field === 'name') && !localData[field].trim()) {
      return; // prevent pushing empty required fields
    }
    
    // Format dates back to ISO string if needed or just pass the YYYY-MM-DD
    // DB schema expects ISO Date, but YYYY-MM-DD is valid for Prisma Date parsing.
    // For simplicity, we just pass the YYYY-MM-DD string, the backend will parse it to Date.
    let valueToPass = (localData as any)[field];
    if (field === 'startDate' || field === 'endDate') {
        valueToPass = (localData as any)[field] ? new Date((localData as any)[field]).toISOString() : null;
    }

    if (valueToPass !== project[field]) {
      onChange(project._uiKey, field, valueToPass as any);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, field: keyof Project) => {
    if (e.key === 'Escape') {
      let originalValue = project[field] || '';
      if (field === 'startDate' || field === 'endDate') {
          originalValue = originalValue ? (originalValue as string).split('T')[0] : '';
      }
      setLocalData(prev => ({
        ...prev,
        [field]: originalValue
      }));
      (e.target as HTMLInputElement).blur();
    }
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };


  return (
    <div 
      className={`grid grid-cols-[1fr_1.5fr_1.5fr_1fr_1fr_1fr_auto] gap-4 px-6 py-2 items-center border-b border-white/5 hover:bg-white/5 transition-colors ${isAdded ? 'bg-green-500/10' : isUpdated ? 'bg-yellow-500/10' : ''} ${errors.some(e => e.field === 'version') ? 'bg-red-500/10 border-red-500/30' : ''}`}
    >
      <input 
        value={localData.projectCode}
        onChange={(e) => setLocalData(p => ({...p, projectCode: e.target.value}))}
        onBlur={() => handleBlur('projectCode')}
        onKeyDown={(e) => handleKeyDown(e, 'projectCode')}
        disabled={!isAdded}
        title={errors.find(e => e.field === 'projectCode')?.message || ''}
        className={`bg-transparent border ${!localData.projectCode.trim() || errors.find(e => e.field === 'projectCode') ? 'border-red-500/50 bg-red-500/10' : 'border-transparent hover:border-white/20'} focus:border-accent-purple rounded px-2 py-1 text-white text-sm outline-none w-full disabled:opacity-70 disabled:hover:border-transparent`}
      />
      <input 
        value={localData.name}
        onChange={(e) => setLocalData(p => ({...p, name: e.target.value}))}
        onBlur={() => handleBlur('name')}
        onKeyDown={(e) => handleKeyDown(e, 'name')}
        placeholder="Project Name"
        title={errors.find(e => e.field === 'name')?.message || ''}
        className={`bg-transparent border ${!localData.name.trim() || errors.find(e => e.field === 'name') ? 'border-red-500/50 bg-red-500/10' : 'border-transparent hover:border-white/20'} focus:border-accent-purple rounded px-2 py-1 text-white text-sm outline-none w-full`}
      />
      <select
        value={localData.creativeLeadId}
        onChange={(e) => setLocalData(p => ({...p, creativeLeadId: e.target.value}))}
        onBlur={() => handleBlur('creativeLeadId')}
        title={errors.find(e => e.field === 'creativeLeadId')?.message || ''}
        className={`bg-surface border ${errors.find(e => e.field === 'creativeLeadId') ? 'border-red-500/50 bg-red-500/10' : 'border-white/10 hover:border-white/20'} focus:border-accent-purple rounded px-2 py-1 text-text-muted text-sm outline-none w-full`}
      >
        <option value="">-- Lead --</option>
        {staff.map(s => (
          <option key={s.staffId} value={s.staffId}>{s.fullName}</option>
        ))}
      </select>
      <input 
        type="date"
        value={localData.startDate}
        onChange={(e) => setLocalData(p => ({...p, startDate: e.target.value}))}
        onBlur={() => handleBlur('startDate')}
        title={errors.find(e => e.field === 'startDate')?.message || ''}
        className={`bg-transparent border ${errors.find(e => e.field === 'startDate') ? 'border-red-500/50 bg-red-500/10' : 'border-transparent hover:border-white/20'} focus:border-accent-purple rounded px-2 py-1 text-text-muted text-sm outline-none w-full [color-scheme:dark]`}
      />
      <input 
        type="date"
        value={localData.endDate}
        onChange={(e) => setLocalData(p => ({...p, endDate: e.target.value}))}
        onBlur={() => handleBlur('endDate')}
        title={errors.find(e => e.field === 'endDate')?.message || ''}
        className={`bg-transparent border ${errors.find(e => e.field === 'endDate') ? 'border-red-500/50 bg-red-500/10' : 'border-transparent hover:border-white/20'} focus:border-accent-purple rounded px-2 py-1 text-text-muted text-sm outline-none w-full [color-scheme:dark]`}
      />
      <select
        value={localData.status}
        onChange={(e) => setLocalData(p => ({...p, status: e.target.value}))}
        onBlur={() => handleBlur('status')}
        title={errors.find(e => e.field === 'status')?.message || ''}
        className={`bg-surface border ${errors.find(e => e.field === 'status') ? 'border-red-500/50 bg-red-500/10' : 'border-white/10 hover:border-white/20'} focus:border-accent-purple rounded px-2 py-1 text-text-muted text-sm outline-none w-full`}
      >
        <option value="Not Started">Not Started</option>
        <option value="In Progress">In Progress</option>
        <option value="Pending Feedback">Pending Feedback</option>
        <option value="Closed">Closed</option>
        <option value="Cancelled">Cancelled</option>
      </select>
      <button 
        onClick={() => onDelete(project._uiKey)}
        className={`p-1 transition-colors ${errors.find(e => e.field === 'delete') ? 'text-red-500 animate-pulse' : 'text-text-muted hover:text-red-400'}`}
        title={errors.find(e => e.field === 'delete')?.message || 'Delete Project'}
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
});

// --- Main Component ---
interface Props {
  clients: Client[];
  projects: Project[];
  staff: Staff[];
  draftData: DraftState;
  setDraftData: React.Dispatch<React.SetStateAction<DraftState>>;
  fieldErrors?: FieldError[];
  onSave: () => void;
  onRevert: () => void;
  hasChanges: boolean;
  isValid: boolean;
  isSaving: boolean;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

type FlatListItem = 
  | { type: 'header', client: Client }
  | { type: 'project', project: Project & { _uiKey: string } }
  | { type: 'footer', clientCode: string, archivedCount: number };

export const AdminProjectManagement: React.FC<Props> = ({ clients, projects, staff, draftData, setDraftData, fieldErrors = [], onSave, onRevert, hasChanges, isValid, isSaving }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [expandedArchives, setExpandedArchives] = useState<Set<string>>(new Set());

  const toggleArchive = (clientCode: string) => {
    setExpandedArchives(prev => {
      const next = new Set(prev);
      if (next.has(clientCode)) next.delete(clientCode);
      else next.add(clientCode);
      return next;
    });
  };

  const handleAddProject = (clientCode: string) => {
    const hasEmptyNewRow = draftData.projects.added.some(
      p => p.clientCode === clientCode && p.projectCode.trim() === '' && p.name.trim() === ''
    );
    if (hasEmptyNewRow) return;

    const newProject = {
      projectCode: '', 
      name: '',
      clientCode,
      creativeLeadId: '',
      startDate: new Date().toISOString(),
      endDate: null,
      status: 'Not Started',
      _uiKey: `NEW-PROJ-${Date.now()}`
    };
    
    setDraftData(prev => ({
      ...prev,
      projects: {
        ...prev.projects,
        added: [newProject as any, ...prev.projects.added]
      }
    }));
  };

  const handleChange = (uiKey: string, field: keyof Project, value: string) => {
    setDraftData(prev => {
      const isAdded = prev.projects.added.find(p => (p as any)._uiKey === uiKey);
      if (isAdded) {
        return {
          ...prev,
          projects: {
            ...prev.projects,
            added: prev.projects.added.map(p => (p as any)._uiKey === uiKey ? { ...p, [field]: value } : p)
          }
        };
      }

      const isUpdated = prev.projects.updated.find(p => p.projectCode === uiKey);
      const original = projects.find(p => p.projectCode === uiKey);
      
      if (isUpdated) {
        return {
          ...prev,
          projects: {
            ...prev.projects,
            updated: prev.projects.updated.map(p => p.projectCode === uiKey ? { ...p, [field]: value } : p)
          }
        };
      } else if (original) {
        return {
          ...prev,
          projects: {
            ...prev.projects,
            updated: [...prev.projects.updated, { ...original, [field]: value }]
          }
        };
      }
      return prev;
    });
  };

  const handleDelete = (uiKey: string) => {
    setDraftData(prev => {
      const isAdded = prev.projects.added.find(p => (p as any)._uiKey === uiKey);
      if (isAdded) {
        return {
          ...prev,
          projects: {
            ...prev.projects,
            added: prev.projects.added.filter(p => (p as any)._uiKey !== uiKey)
          }
        };
      }

      return {
        ...prev,
        projects: {
          ...prev.projects,
          updated: prev.projects.updated.filter(p => p.projectCode !== uiKey),
          deleted: [...prev.projects.deleted, uiKey]
        }
      };
    });
  };

  const flatList = useMemo(() => {
    const list: FlatListItem[] = [];
    const activeDbClients = clients.filter(c => !draftData.clients.deleted.includes(c.clientCode));
    const mergedClients = activeDbClients.map(c => {
      const updated = draftData.clients.updated.find(u => u.clientCode === c.clientCode);
      return updated ? { ...updated } : { ...c };
    });
    const allClients = [...draftData.clients.added, ...mergedClients].sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    const activeDbProjects = projects.filter(p => !draftData.projects.deleted.includes(p.projectCode));
    const mergedProjects = activeDbProjects.map(p => {
      const updated = draftData.projects.updated.find(u => u.projectCode === p.projectCode);
      return updated ? { ...updated, _uiKey: p.projectCode } : { ...p, _uiKey: p.projectCode };
    });
    const allProjects = [...draftData.projects.added, ...mergedProjects];

    const lowerSearch = debouncedSearchTerm.trim().toLowerCase();

    allClients.forEach(client => {
      let clientProjects = allProjects.filter(p => p.clientCode === client.clientCode);
      
      const clientMatch = (client.name || '').toLowerCase().includes(lowerSearch) || 
                          (client.clientCode || '').toLowerCase().includes(lowerSearch);
      
      if (lowerSearch) {
        clientProjects = clientProjects.filter(p => 
          (p.name || '').toLowerCase().includes(lowerSearch) || 
          (p.projectCode || '').toLowerCase().includes(lowerSearch)
        );
        if (!clientMatch && clientProjects.length === 0) return;
      }

      clientProjects.sort((a, b) => {
        const aIsNew = draftData.projects.added.some(c => (c as any)._uiKey === (a as any)._uiKey);
        const bIsNew = draftData.projects.added.some(c => (c as any)._uiKey === (b as any)._uiKey);
        if (aIsNew && !bIsNew) return -1;
        if (!aIsNew && bIsNew) return 1;

        if (!a.endDate && b.endDate) return -1;
        if (a.endDate && !b.endDate) return 1;
        if (!a.endDate && !b.endDate) return 0;
        return new Date(b.endDate!).getTime() - new Date(a.endDate!).getTime();
      });

      const activeProj = clientProjects.filter(p => ['Not Started', 'In Progress', 'Pending Feedback'].includes(p.status || 'Not Started'));
      const archivedProj = clientProjects.filter(p => ['Closed', 'Cancelled'].includes(p.status || 'Not Started'));

      list.push({ type: 'header', client });

      activeProj.forEach(p => {
        list.push({ type: 'project', project: p as any });
      });

      if (expandedArchives.has(client.clientCode) || lowerSearch) {
        archivedProj.forEach(p => {
          list.push({ type: 'project', project: p as any });
        });
      }

      if (archivedProj.length > 0 && !expandedArchives.has(client.clientCode) && !lowerSearch) {
        list.push({ type: 'footer', clientCode: client.clientCode, archivedCount: archivedProj.length });
      }
    });

    return list;
  }, [clients, projects, draftData, debouncedSearchTerm, expandedArchives]);

  return (
    <div className="glass-panel flex flex-col gap-4 flex-1">
      <div className="p-6 pb-2 flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <Briefcase className="w-8 h-8 text-accent-blue" />
              <h3 className="text-2xl font-bold text-white whitespace-nowrap">Project Data</h3>
            </div>
            <div className="relative w-[300px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted" size={16} />
              <input 
                type="text" 
                placeholder="Search by Project Code or Name..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-surface-dark border border-white/10 rounded-lg py-1.5 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-accent-purple"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onRevert}
              disabled={!hasChanges || isSaving}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors text-sm ${
                hasChanges && !isSaving 
                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/50' 
                  : 'bg-surface-light text-text-muted border border-white/5 cursor-not-allowed'
              }`}
            >
              <Undo2 size={14} /> Revert
            </button>
            
            <button
              onClick={onSave}
              disabled={!hasChanges || !isValid || isSaving}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors text-sm ${
                hasChanges && isValid && !isSaving
                  ? 'bg-accent-purple text-white hover:bg-accent-purple/90 border border-accent-purple' 
                  : 'bg-surface-light text-text-muted border border-white/5 cursor-not-allowed'
              }`}
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_1.5fr_1.5fr_1fr_1fr_1fr_auto] gap-4 px-6 py-3 bg-accent-blue/10 border-y border-accent-blue/20 text-xs font-bold text-accent-blue uppercase tracking-wider sticky top-0 z-20 backdrop-blur-md">
        <div>Project Code</div>
        <div>Name</div>
        <div>Creative Lead</div>
        <div>Start Date</div>
        <div>End Date</div>
        <div>Status</div>
        <div className="w-8"></div>
      </div>

      <div className="flex-1 bg-surface/10 rounded-b-lg">
        {flatList.map((item) => {
            if (item.type === 'header') {
              return (
                <div
                  key={`header-${item.client.clientCode}`}
                  className="flex justify-between items-center px-4 py-2 bg-surface-dark border-b border-white/10"
                >
                  <div className="flex items-center gap-2 text-white font-semibold">
                    <Folder size={18} className="text-accent-blue" />
                    {item.client.name} <span className="text-text-muted text-sm font-normal">({item.client.clientCode})</span>
                  </div>
                  <button onClick={() => handleAddProject(item.client.clientCode)} className="flex items-center gap-1 px-2 py-1 bg-white/5 hover:bg-white/10 text-white rounded transition-colors text-xs">
                    <Plus size={14} /> New Project
                  </button>
                </div>
              );
            }

            if (item.type === 'footer') {
              return (
                <div
                  key={`footer-${item.clientCode}`}
                  className="flex items-center px-12 py-1 border-b border-white/5 bg-black/10"
                >
                  <button onClick={() => toggleArchive(item.clientCode)} className="flex items-center gap-1 text-sm text-text-muted hover:text-white transition-colors">
                    <ChevronDown size={14} /> Expand {item.archivedCount} archived projects
                  </button>
                </div>
              );
            }

            if (item.type === 'project') {
              const project = item.project;
              const isAdded = draftData.projects.added.some(p => (p as any)._uiKey === project._uiKey);
              const isUpdated = draftData.projects.updated.some(p => p.projectCode === project._uiKey);
              
              return (
                <ProjectRow
                  key={project._uiKey}
                  project={project}
                  isAdded={isAdded}
                  isUpdated={isUpdated}
                  staff={staff}
                  onChange={handleChange}
                  onDelete={handleDelete}
                  errors={fieldErrors.filter(e => e.uiKey === project._uiKey || e.uiKey === project.projectCode)}
                />
              );
            }
        })}
      </div>
    </div>
  );
};

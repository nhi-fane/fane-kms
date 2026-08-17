import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Client, Project, FieldError } from '../hooks/useDashboardData';
import type { DraftState } from './AdminPortal';
import { Search, Plus, Trash2, Save, Undo2, Loader2, Users } from 'lucide-react';

// --- ClientRow Component ---
interface ClientRowProps {
  client: Client & { _uiKey: string };
  isAdded: boolean;
  isUpdated: boolean;
  onChange: (uiKey: string, field: keyof Client, value: string) => void;
  onDelete: (uiKey: string) => void;
  errors: FieldError[];
}

const ClientRow = React.memo(({ client, isAdded, isUpdated, onChange, onDelete, errors }: ClientRowProps) => {
  // Local state for fast typing without triggering global re-renders
  const [localData, setLocalData] = useState({
    clientCode: client.clientCode,
    name: client.name,
    legalName: client.legalName || '',
    industry: client.industry || ''
  });

  // Sync from props if external changes happen (e.g. revert)
  useEffect(() => {
    setLocalData({
      clientCode: client.clientCode,
      name: client.name,
      legalName: client.legalName || '',
      industry: client.industry || ''
    });
  }, [client.clientCode, client.name, client.legalName, client.industry]);

  const localDataRef = useRef(localData);
  useEffect(() => {
    localDataRef.current = localData;
  }, [localData]);

  useEffect(() => {
    return () => {
      // Cleanup on unmount (e.g. virtual scroll): flush unblurred localData to draftData
      const current = localDataRef.current;
      const originalCode = client.clientCode;
      const originalName = client.name;
      const originalLegal = client.legalName || '';
      const originalIndustry = client.industry || '';

      if (current.clientCode !== originalCode && current.clientCode.trim()) onChange((client as any)._uiKey, 'clientCode', current.clientCode as any);
      if (current.name !== originalName && current.name.trim()) onChange((client as any)._uiKey, 'name', current.name as any);
      if (current.legalName !== originalLegal) onChange((client as any)._uiKey, 'legalName', current.legalName as any);
      if (current.industry !== originalIndustry) onChange((client as any)._uiKey, 'industry', current.industry as any);
    };
  }, [client, onChange]);

  const handleBlur = (field: keyof Client) => {
    if ((field === 'clientCode' || field === 'name') && !(localData as any)[field].trim()) {
      return;
    }
    
    if ((localData as any)[field] !== (client as any)[field]) {
      onChange((client as any)._uiKey, field, (localData as any)[field]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, field: keyof Client) => {
    if (e.key === 'Escape') {
      // Revert local state to props
      setLocalData(prev => ({
        ...prev,
        [field]: client[field] || ''
      }));
      (e.target as HTMLInputElement).blur();
    }
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div 
      className={`grid grid-cols-[1.5fr_2fr_2fr_2fr_auto] gap-4 px-6 py-2 items-center border-b border-white/5 hover:bg-white/5 transition-colors ${isAdded ? 'bg-green-500/10' : isUpdated ? 'bg-yellow-500/10' : ''} ${errors.some(e => e.field === 'version') ? 'bg-red-500/10 border-red-500/30' : ''}`}
    >
      <input 
        value={localData.clientCode}
        onChange={(e) => setLocalData(p => ({...p, clientCode: e.target.value}))}
        onBlur={() => handleBlur('clientCode')}
        onKeyDown={(e) => handleKeyDown(e, 'clientCode')}
        disabled={!isAdded}
        autoFocus={isAdded && client.clientCode === '' && client.name === ''}
        placeholder="Client Code"
        title={errors.find(e => e.field === 'clientCode')?.message || ''}
        className={`bg-transparent border ${!localData.clientCode.trim() || errors.find(e => e.field === 'clientCode') ? 'border-red-500/50 bg-red-500/10' : 'border-transparent hover:border-white/20'} focus:border-accent-purple rounded px-2 py-1 text-white text-sm outline-none w-full disabled:opacity-70 disabled:hover:border-transparent`}
      />
      <input 
        value={localData.name}
        onChange={(e) => setLocalData(p => ({...p, name: e.target.value}))}
        onBlur={() => handleBlur('name')}
        onKeyDown={(e) => handleKeyDown(e, 'name')}
        placeholder="Client Name"
        title={errors.find(e => e.field === 'name')?.message || ''}
        className={`bg-transparent border ${!localData.name.trim() || errors.find(e => e.field === 'name') ? 'border-red-500/50 bg-red-500/10' : 'border-transparent hover:border-white/20'} focus:border-accent-purple rounded px-2 py-1 text-white text-sm outline-none w-full`}
      />
      <input 
        value={localData.legalName}
        onChange={(e) => setLocalData(p => ({...p, legalName: e.target.value}))}
        onBlur={() => handleBlur('legalName')}
        onKeyDown={(e) => handleKeyDown(e, 'legalName')}
        placeholder="Legal Name (Optional)"
        title={errors.find(e => e.field === 'legalName')?.message || ''}
        className={`bg-transparent border ${errors.find(e => e.field === 'legalName') ? 'border-red-500/50 bg-red-500/10' : 'border-transparent hover:border-white/20'} focus:border-accent-purple rounded px-2 py-1 text-text-muted text-sm outline-none w-full`}
      />
      <input 
        value={localData.industry}
        onChange={(e) => setLocalData(p => ({...p, industry: e.target.value}))}
        onBlur={() => handleBlur('industry')}
        onKeyDown={(e) => handleKeyDown(e, 'industry')}
        placeholder="Industry (Optional)"
        title={errors.find(e => e.field === 'industry')?.message || ''}
        className={`bg-transparent border ${errors.find(e => e.field === 'industry') ? 'border-red-500/50 bg-red-500/10' : 'border-transparent hover:border-white/20'} focus:border-accent-purple rounded px-2 py-1 text-text-muted text-sm outline-none w-full`}
      />
      <button 
        onClick={() => onDelete(client._uiKey)}
        className={`p-1 transition-colors ${errors.find(e => e.field === 'delete') ? 'text-red-500 animate-pulse' : 'text-text-muted hover:text-red-400'}`}
        title={errors.find(e => e.field === 'delete')?.message || 'Delete Client'}
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
  draftData: DraftState;
  setDraftData: React.Dispatch<React.SetStateAction<DraftState>>;
  fieldErrors?: FieldError[];
  onSave: () => void;
  onRevert: () => void;
  hasChanges: boolean;
  isValid: boolean;
  isSaving: boolean;
}

// Custom hook for debounce
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

export const AdminClientManagement: React.FC<Props> = ({ clients, projects, draftData, setDraftData, fieldErrors = [], onSave, onRevert, hasChanges, isValid, isSaving }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  const [showArchived, setShowArchived] = useState(false);

  // Determine if a client is archived
  const isClientArchived = (clientCode: string) => {
    const activeProjects = projects.filter(p => !draftData.projects.deleted.includes(p.projectCode));
    const mergedProjects = [
      ...draftData.projects.added,
      ...activeProjects.map(p => draftData.projects.updated.find(u => u.projectCode === p.projectCode) || p)
    ];

    const clientProjects = mergedProjects.filter(p => p.clientCode === clientCode);
    if (clientProjects.length === 0) return false;
    return clientProjects.every(p => p.status === 'Cancelled' || p.status === 'Closed');
  };

  const displayClients = useMemo(() => {
    const activeDbClients = clients.filter(c => !draftData.clients.deleted.includes(c.clientCode));
    const mergedDbClients = activeDbClients.map(c => {
      const updated = draftData.clients.updated.find(u => u.clientCode === c.clientCode);
      return updated ? { ...updated, _uiKey: c.clientCode } : { ...c, _uiKey: c.clientCode };
    });

    let all = [...draftData.clients.added, ...mergedDbClients];

    // Filter by search (with trim to avoid spaces bug)
    if (debouncedSearchTerm.trim()) {
      const lower = debouncedSearchTerm.trim().toLowerCase();
      all = all.filter(c => 
        (c.name || '').toLowerCase().includes(lower) || 
        (c.clientCode || '').toLowerCase().includes(lower) ||
        (c.legalName && c.legalName.toLowerCase().includes(lower))
      );
    }

    // Filter out archived if not showing
    if (!showArchived) {
      all = all.filter(c => !isClientArchived(c.clientCode));
    }

    // Sort alphabetically by name
    all.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    // Put new (added) clients at the top
    all.sort((a, b) => {
      const aIsNew = draftData.clients.added.some(c => (c as any)._uiKey === (a as any)._uiKey);
      const bIsNew = draftData.clients.added.some(c => (c as any)._uiKey === (b as any)._uiKey);
      if (aIsNew && !bIsNew) return -1;
      if (!aIsNew && bIsNew) return 1;
      return 0;
    });

    return all;
  }, [clients, projects, draftData, debouncedSearchTerm, showArchived]);

  const handleAdd = () => {
    // Prevent spamming empty rows
    const hasEmptyNewRow = draftData.clients.added.some(c => c.clientCode.trim() === '' && c.name.trim() === '');
    if (hasEmptyNewRow) return;

    const newClient = {
      clientCode: '', 
      name: '',
      legalName: '',
      industry: '',
      _uiKey: `NEW-${Date.now()}`
    };
    setDraftData(prev => ({
      ...prev,
      clients: {
        ...prev.clients,
        added: [newClient, ...prev.clients.added]
      }
    }));
  };

  const handleChange = (uiKey: string, field: keyof Client, value: string) => {
    setDraftData(prev => {
      const isAdded = prev.clients.added.find(c => (c as any)._uiKey === uiKey);
      if (isAdded) {
        return {
          ...prev,
          clients: {
            ...prev.clients,
            added: prev.clients.added.map(c => (c as any)._uiKey === uiKey ? { ...c, [field]: value } : c)
          }
        };
      }

      // Existing client
      const isUpdated = prev.clients.updated.find(c => c.clientCode === uiKey);
      const original = clients.find(c => c.clientCode === uiKey);
      
      if (isUpdated) {
        return {
          ...prev,
          clients: {
            ...prev.clients,
            updated: prev.clients.updated.map(c => c.clientCode === uiKey ? { ...c, [field]: value } : c)
          }
        };
      } else if (original) {
        return {
          ...prev,
          clients: {
            ...prev.clients,
            updated: [...prev.clients.updated, { ...original, [field]: value }]
          }
        };
      }
      return prev;
    });
  };

  const handleDelete = (uiKey: string) => {
    setDraftData(prev => {
      const isAdded = prev.clients.added.find(c => (c as any)._uiKey === uiKey);
      if (isAdded) {
        return {
          ...prev,
          clients: {
            ...prev.clients,
            added: prev.clients.added.filter(c => (c as any)._uiKey !== uiKey)
          }
        };
      }

      return {
        ...prev,
        clients: {
          ...prev.clients,
          updated: prev.clients.updated.filter(c => c.clientCode !== uiKey),
          deleted: [...prev.clients.deleted, uiKey]
        }
      };
    });
  };

  return (
    <div className="glass-panel flex flex-col gap-4 flex-1">
      <div className="p-6 pb-2 flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-accent-blue" />
              <h3 className="text-2xl font-bold text-white whitespace-nowrap">Client Data</h3>
            </div>
            <div className="relative w-[300px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted" size={16} />
              <input 
                type="text" 
                placeholder="Search by Client Code or Name..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-surface-dark border border-white/10 rounded-lg py-1.5 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-accent-purple"
              />
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-3">
              <button 
                onClick={handleAdd}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-blue/20 text-accent-blue hover:bg-accent-blue/30 border border-accent-blue/50 rounded-md transition-colors text-sm font-medium"
              >
                <Plus size={14} /> New Client
              </button>

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

            <label className="flex items-center gap-2 text-text-muted text-xs cursor-pointer hover:text-white mr-1 mt-1">
              <input 
                type="checkbox" 
                checked={showArchived}
                onChange={e => setShowArchived(e.target.checked)}
                className="rounded border-white/20 bg-surface text-accent-purple focus:ring-accent-purple"
              />
              Show Archived Clients
            </label>
          </div>
        </div>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-[1.5fr_2fr_2fr_2fr_auto] gap-4 px-6 py-3 bg-accent-blue/10 border-y border-accent-blue/20 text-sm font-bold text-accent-blue sticky top-0 z-10 backdrop-blur-md">
        <div>Client Code</div>
        <div>Name</div>
        <div>Legal Name</div>
        <div>Industry</div>
        <div className="w-8"></div>
      </div>

      {/* Table Body */}
      <div className="bg-surface/10 rounded-b-lg flex-1">
        {displayClients.map((clientObj) => {
          const client = clientObj as Client & { _uiKey: string };
          const isAdded = draftData.clients.added.some(c => (c as any)._uiKey === client._uiKey);
          const isUpdated = draftData.clients.updated.some(c => c.clientCode === client._uiKey);
          
          return (
            <ClientRow
              key={client._uiKey}
              client={client}
              isAdded={isAdded}
              isUpdated={isUpdated}
              onChange={handleChange}
              onDelete={handleDelete}
              errors={fieldErrors.filter(e => e.uiKey === client._uiKey || e.uiKey === client.clientCode)}
            />
          );
        })}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import type { DashboardData, Client, Project, FieldError } from '../hooks/useDashboardData';

import { AdminClientManagement } from './AdminClientManagement';
import { AdminProjectManagement } from './AdminProjectManagement';
import { AdminStaffManagement } from './AdminStaffManagement';
import { Tooltip } from './ui/Tooltip';
interface AdminPortalProps {
  token: string;
  data: DashboardData;
  currentUser: any;
  onRefresh: () => void;
}

export type DraftState = {
  clients: {
    added: Client[];
    updated: Client[];
    deleted: string[];
  };
  projects: {
    added: Project[];
    updated: Project[];
    deleted: string[];
  };
  staff: {
    added: any[];
    updated: any[];
    deleted: string[];
  };
};

export const AdminPortal: React.FC<AdminPortalProps> = ({ token, data, currentUser, onRefresh }) => {
  const [draftData, setDraftData] = useState<DraftState>({
    clients: { added: [], updated: [], deleted: [] },
    projects: { added: [], updated: [], deleted: [] },
    staff: { added: [], updated: [], deleted: [] }
  });

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldError[]>([]);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'clients' | 'projects' | 'staff'>('clients');

  const hasClientChanges =
    draftData.clients.added.length > 0 ||
    draftData.clients.updated.length > 0 ||
    draftData.clients.deleted.length > 0;

  const hasProjectChanges =
    draftData.projects.added.length > 0 ||
    draftData.projects.updated.length > 0 ||
    draftData.projects.deleted.length > 0;

  const hasStaffChanges =
    draftData.staff.added.length > 0 ||
    draftData.staff.updated.length > 0;

  const isClientDataValid = ![...draftData.clients.added, ...draftData.clients.updated].some(
    c => !c.clientCode.trim() || !c.name.trim()
  );

  const isProjectDataValid = ![...draftData.projects.added, ...draftData.projects.updated].some(
    p => !p.projectCode.trim() || !p.name.trim() || !p.clientCode.trim() || !p.creativeLeadId.trim() || !p.startDate
  );

  const isStaffDataValid = ![...draftData.staff.added, ...draftData.staff.updated].some(
    s => !s.staffId.trim() || !s.fullName.trim() || !s.role.trim() || !s.team.trim() || !s.email.trim()
  );

  const handleRevert = (type: 'clients' | 'projects' | 'staff') => {
    if (window.confirm(`Are you sure you want to revert all unsaved ${type} changes?`)) {
      setDraftData(prev => ({
        ...prev,
        [type]: { added: [], updated: [], deleted: [] }
      }));
      setError(null);
      setSuccessMsg(null);
      setFieldErrors([]);
    }
  };

  const handleSave = async (type: 'clients' | 'projects' | 'staff') => {
    const isValid = type === 'clients' ? isClientDataValid : type === 'projects' ? isProjectDataValid : isStaffDataValid;
    const hasChanges = type === 'clients' ? hasClientChanges : type === 'projects' ? hasProjectChanges : hasStaffChanges;

    if (!hasChanges || !isValid || isSaving) return;
    setIsSaving(true);
    setError(null);
    setFieldErrors([]);
    setSuccessMsg(null);

    try {
      const payload = {
        clients: type === 'clients' ? draftData.clients : { added: [], updated: [], deleted: [] },
        projects: type === 'projects' ? {
          added: draftData.projects.added,
          updated: draftData.projects.updated,
          deleted: draftData.projects.deleted
        } : { added: [], updated: [], deleted: [] },
        staff: type === 'staff' ? draftData.staff : { added: [], updated: [], deleted: [] }
      };

      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const endpoint = type === 'staff' ? '/api/admin/staff/bulk-save' : '/api/admin/bulk-save';

      const res = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const errorData = await res.json();
      if (!res.ok) {
        if (errorData.fieldErrors) {
          setFieldErrors(errorData.fieldErrors);
        }
        if (res.status === 409) {
          setError(errorData.error || "Dữ liệu đã bị thay đổi bởi người khác. Vui lòng tải lại trang để tránh mất dữ liệu.");
        } else {
          setError(errorData.error || "Failed to save changes.");
        }
        return;
      }
      setSuccessMsg('Changes saved successfully!');

      // Clear draft
      setDraftData(prev => ({
        ...prev,
        [type]: { added: [], updated: [], deleted: [] }
      }));

      // Refresh data from backend
      onRefresh();

      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center">
        <h2 className="text-2xl font-bold text-white m-0">Admin Portal</h2>
        <Tooltip text="💡 Quản lý dữ liệu client, project, staff" />
      </div>

      {(!isClientDataValid || !isProjectDataValid) && (
        <div className="bg-yellow-500/10 border border-yellow-500/50 text-yellow-500 p-4 rounded-lg text-sm">
          ⚠️ Vui lòng điền đầy đủ các trường bắt buộc (Client Code/Name hoặc Project Code/Name/Lead/Start Date) cho các dòng đang chỉnh sửa.
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-lg">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="bg-green-500/10 border border-green-500/50 text-green-400 p-4 rounded-lg">
          {successMsg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-white/10 mb-2">
        <button
          onClick={() => setActiveTab('clients')}
          className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'clients' ? 'border-accent-purple text-white bg-white/5' : 'border-transparent text-text-muted hover:text-white hover:bg-white/5'}`}
        >
          Clients
        </button>
        <button
          onClick={() => setActiveTab('projects')}
          className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'projects' ? 'border-accent-purple text-white bg-white/5' : 'border-transparent text-text-muted hover:text-white hover:bg-white/5'}`}
        >
          Projects
        </button>
        {['CEO', 'BOD', 'PO'].includes(currentUser?.role) && (
          <button
            onClick={() => setActiveTab('staff')}
            className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'staff' ? 'border-accent-blue text-white bg-white/5' : 'border-transparent text-text-muted hover:text-white hover:bg-white/5'}`}
          >
            Staff
          </button>
        )}
      </div>

      {activeTab === 'clients' && (
        <div className="flex-1 animate-fade-in bg-surface rounded-lg border border-white/10 flex flex-col">
          <AdminClientManagement
            clients={data.clients}
            projects={data.projects}
            draftData={draftData}
            setDraftData={setDraftData}
            fieldErrors={fieldErrors}
            onSave={() => handleSave('clients')}
            onRevert={() => handleRevert('clients')}
            hasChanges={hasClientChanges}
            isValid={isClientDataValid}
            isSaving={isSaving}
          />
        </div>
      )}

      {activeTab === 'projects' && (
        <div className="flex-1 animate-fade-in bg-surface rounded-lg border border-white/10 flex flex-col relative">
          <AdminProjectManagement
            clients={data.clients}
            projects={data.projects}
            staff={data.staff}
            draftData={draftData}
            setDraftData={setDraftData}
            fieldErrors={fieldErrors}
            onSave={() => handleSave('projects')}
            onRevert={() => handleRevert('projects')}
            hasChanges={hasProjectChanges}
            isValid={isProjectDataValid}
            isSaving={isSaving}
          />
        </div>
      )}

      {activeTab === 'staff' && ['CEO', 'BOD', 'PO'].includes(currentUser?.role) && (
        <div className="flex-1 min-h-[600px] animate-fade-in bg-surface rounded-lg border border-white/10 flex flex-col">
          <AdminStaffManagement
            staff={data.staff}
            token={token}
            draftData={draftData}
            setDraftData={setDraftData}
            onSave={() => handleSave('staff')}
            onRevert={() => handleRevert('staff')}
            hasChanges={hasStaffChanges}
            isValid={isStaffDataValid}
            isSaving={isSaving}
          />
        </div>
      )}
    </div>
  );
};

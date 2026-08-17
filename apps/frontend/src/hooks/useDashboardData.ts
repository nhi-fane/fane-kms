import { useState, useEffect } from 'react';

// Interfaces mapping to backend schema
export interface Staff {
  staffId: string;
  fullName: string;
  firstName: string;
  role: string;
  level: number;
  costPerHour: number;
  standardHoursPerDay: number;
  telegramId?: string | null;
  team: string;
  email?: string;
  isActive?: boolean;
}

export interface StaffLeave {
  logId: string;
  staffId: string;
  duration: number;
  leaveDate: string;
  session: string;
  status: string;
}

export interface CompanyHoliday {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

export interface FieldError {
  uiKey: string;
  field: string;
  message: string;
}

export interface Client {
  clientCode: string;
  name: string;
  legalName?: string | null;
  industry?: string | null;
  version?: number;
}

export interface Project {
  projectCode: string;
  clientCode: string;
  creativeLeadId: string;
  name: string;
  status: string;
  startDate: string;
  endDate: string | null;
  creativeLead?: { firstName: string; fullName: string };
  version?: number;
}

export interface TaskAssignee {
  taskId: string;
  staffId: string;
  isDone: boolean;
}

export interface Task {
  taskId: string;
  projectCode: string;
  name: string;
  status: string;
  startDate: string;
  deadline: string;
  parentTaskId?: string | null;
  assignees: TaskAssignee[];
}

export interface Timesheet {
  logId: string;
  taskId: string;
  staffId: string;
  hoursLogged: number;
  logDate: string;
  approvalStatus: string;
}

export interface DashboardData {
  staff: Staff[];
  projects: Project[];
  tasks: Task[];
  timesheets: Timesheet[];
  leaves: StaffLeave[];
  holidays: CompanyHoliday[];
  clients: Client[];
}

export const useDashboardData = (token: string | null) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [trigger, setTrigger] = useState(0);

  const refresh = () => setTrigger(t => t + 1);

  useEffect(() => {
    const fetchData = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const response = await fetch(`${baseUrl}/api/dashboard`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'ngrok-skip-browser-warning': 'true'
          }
        });
        
        if (response.status === 401) {
          localStorage.removeItem('fane_token');
          window.location.reload();
          return;
        }

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        setData(result);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, trigger]);

  return { data, loading, error, refresh };
};

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/error';
import { authenticate, censorSensitiveData, requireWriteAccess, checkPermission } from './middleware/auth';
import { getClients } from './controllers/client';
import { getProjects, createProject } from './controllers/project';
import { getStaff } from './controllers/staff';
import { updateTaskAssignee, createTask } from './controllers/task';
import { logTimesheet, editTimesheet, approveTimesheet, unapproveTimesheet } from './controllers/timesheet';
import { getDashboardData } from './controllers/dashboard';
import { getMyPortalData } from './controllers/myPortal';
import { bot } from './bot';
import { login, impersonate, me, updateProfile, changePassword, forgotPassword, resetPassword } from './controllers/auth';
import { adminResetPassword, bulkSave, bulkSaveStaff } from './controllers/admin';
import { getPermissionMatrix, overridePermission } from './controllers/permissions';
import { exportTimesheet } from './controllers/reports';

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.post('/api/auth/login', login);
app.post('/api/auth/impersonate', authenticate, checkPermission('system:impersonate'), impersonate);
app.get('/api/auth/me', authenticate, me);
app.put('/api/auth/me', authenticate, updateProfile);
app.post('/api/auth/change-password', authenticate, changePassword);
app.post('/api/auth/forgot-password', forgotPassword);
app.post('/api/auth/reset-password', resetPassword);

// Permissions & Auth Core
app.get('/api/permissions/matrix', authenticate, checkPermission('system:grant_permission'), getPermissionMatrix);
app.post('/api/permissions/override', authenticate, checkPermission('system:grant_permission'), overridePermission);
app.use(bot.webhookCallback('/webhook/telegram'));
app.get('/api/dashboard', authenticate, getDashboardData);
app.get('/api/my-portal', authenticate, getMyPortalData);
app.get('/api/clients', authenticate, getClients);
app.get('/api/projects', authenticate, getProjects);
app.post('/api/projects', authenticate, requireWriteAccess, createProject);
app.get('/api/staff', authenticate, censorSensitiveData, getStaff);

// Admin
app.post('/api/admin/bulk-save', authenticate, requireWriteAccess, bulkSave);
app.post('/api/admin/staff/bulk-save', authenticate, requireWriteAccess, bulkSaveStaff);
app.post('/api/admin/staff/:id/reset-password', authenticate, checkPermission('system:manage_staff'), requireWriteAccess, adminResetPassword);

// Task logic
app.post('/api/tasks', authenticate, createTask);
app.put('/api/tasks/:taskId/assignee-status', authenticate, updateTaskAssignee);

// Timesheet logic
app.post('/api/timesheets', authenticate, logTimesheet);
app.put('/api/timesheets/:logId', authenticate, editTimesheet);
app.put('/api/timesheets/:logId/approve', authenticate, approveTimesheet);
app.put('/api/timesheets/:logId/unapprove', authenticate, unapproveTimesheet);

// Reports
app.get('/api/reports/export-timesheet', authenticate, exportTimesheet);

// Global Error Handler
app.use(errorHandler);

export { app };

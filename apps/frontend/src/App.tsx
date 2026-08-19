import React, { useState } from 'react';
import { useDashboardData } from './hooks/useDashboardData';
import { Zone1ControlPanel } from './components/Zone1_ControlPanel';
import { Zone2Statistics } from './components/Zone2_Statistics';
import { Zone3Capacity } from './components/Zone3_Capacity';
import { Zone4Timeline } from './components/Zone4_Timeline';
import { Login } from './components/Login';
import { MyPortal } from './components/MyPortal';
import { MyProfile } from './components/MyProfile';
import { AdminPortal } from './components/AdminPortal';
import { CEOPermissionPortal } from './components/CEOPermissionPortal';
import { ImpersonationBanner } from './components/ImpersonationBanner';
import { ImpersonationSelector } from './components/ImpersonationSelector';
import { subDays } from 'date-fns';
import { Loader2, MonitorPlay } from 'lucide-react';
import { Tooltip } from './components/ui/Tooltip';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ color: 'red', padding: '20px', background: 'black', height: '100vh', width: '100vw' }}>
          <h1>Something went wrong.</h1>
          <pre>{this.state.error?.toString()}</pre>
          <pre>{this.state.error?.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('fane_token'));
  const [currentView, setCurrentView] = useState<'dashboard' | 'portal' | 'admin' | 'ceo' | 'profile'>('dashboard');
  const [isPortalDropdownOpen, setIsPortalDropdownOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const { data, loading, refresh } = useDashboardData(token);
  const { staff = [], projects = [], tasks = [], timesheets = [], leaves = [], holidays = [] } = data || {};

  const [dateRange, setDateRange] = useState({
    start: subDays(subDays(new Date(), 1), 14),
    end: subDays(new Date(), 1)
  });
  const [selectedStaff, setSelectedStaff] = useState<string[]>([]);
  const [hoveredProject, setHoveredProject] = useState<string | null>(null);

  const handleLoginSuccess = (newToken: string) => {
    localStorage.setItem('fane_token', newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('fane_token');
    setToken(null);
  };

  const isOldDomain = window.location.hostname.includes('workers.dev');

  const migrationBanner = isOldDomain ? (
    <div className="bg-orange-500/20 border-b border-orange-500/50 p-3 text-center text-orange-200">
      <span className="font-semibold">Lưu ý:</span> Hệ thống đã chuyển sang tên miền mới. Vui lòng truy cập <a href="https://fane-traffic.pages.dev" className="font-bold underline hover:text-white">fane-traffic.pages.dev</a> để trải nghiệm đầy đủ tính năng và không bị gián đoạn.
    </div>
  ) : null;

  if (!token) {
    return (
      <ErrorBoundary>
        {migrationBanner}
        <Login onLoginSuccess={handleLoginSuccess} />
      </ErrorBoundary>
    );
  }

  // Get current user info from token payload (basic decode)
  let currentUser: any = { staffId: '', fullName: 'User', role: '', team: '', isReadOnly: false, impersonatorRole: '' };
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join('')
    );
    const payload = JSON.parse(jsonPayload);

    currentUser = {
      staffId: payload.staffId,
      fullName: payload.fullName || 'User',
      role: payload.role || '',
      team: payload.team || '',
      isReadOnly: payload.isReadOnly || false,
      impersonatorRole: payload.impersonatorRole || ''
    };

    // Try to get real name from fetched data
    const match = staff.find(s => s.staffId === currentUser.staffId);
    if (match) {
      currentUser.fullName = match.fullName;
      if (match.team) currentUser.team = match.team;
    }
  } catch (e) {
    // Ignore error
  }

  return (
    <ErrorBoundary>
      {currentUser.isReadOnly && (
        <ImpersonationBanner
          impersonatorRole={currentUser.impersonatorRole}
          onExit={handleLogout}
        />
      )}
      {migrationBanner}
      <div className="min-h-screen bg-background-dark p-4 md:p-6 lg:p-8">
        <div className="max-w-[1600px] mx-auto flex flex-col gap-6">

          <header className="mb-2 flex justify-between items-start">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-accent-purple mb-2 drop-shadow-[0_0_15px_rgba(157,78,221,0.5)] cursor-pointer" onClick={() => setCurrentView('dashboard')}>
                FanE Traffic Management Dashboard
              </h1>
              <p className="text-text-muted text-base md:text-lg">
                Reactive Monitor & Project Timeline
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* User Menu Dropdown */}
              <div className="relative z-50">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface hover:bg-surface-light border border-white/10 transition-colors text-white font-medium"
                >
                  <span>👤 {currentUser.fullName}</span>
                  <span className="text-xs text-text-muted">▼</span>
                </button>

                {isUserMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)} />
                    <div className="absolute right-0 mt-2 w-56 bg-[#151518] border border-white/5 rounded-xl shadow-2xl z-50 flex flex-col py-1">
                      <div className="px-4 py-3 border-b border-white/5 mb-1 bg-[#1a1a1f] rounded-t-xl">
                        <div className="font-medium text-white text-sm">{currentUser.fullName}</div>
                        <div className="text-xs text-text-muted mt-0.5">{currentUser.role}</div>
                      </div>

                      <button
                        onClick={() => {
                          setCurrentView('profile');
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/5 transition-colors"
                      >
                        My Profile
                      </button>

                      <button
                        onClick={() => {
                          handleLogout();
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-white/5 hover:text-red-300 transition-colors"
                      >
                        Log out
                      </button>

                      {!currentUser.isReadOnly && ['PO', 'CEO', 'BOD'].includes(currentUser.role) && (
                        <div>
                          <ImpersonationSelector
                            staffList={staff}
                            token={token}
                            onImpersonateSuccess={(newToken) => {
                              localStorage.setItem('fane_token', newToken);
                              setToken(newToken);
                              setIsUserMenuOpen(false);
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="relative flex items-center">
                {currentView === 'dashboard' ? (
                  <>
                    <div className="flex items-center">
                      <button
                        onClick={() => setIsPortalDropdownOpen(!isPortalDropdownOpen)}
                        className="text-sm px-4 py-2 rounded-lg transition-colors border bg-surface hover:bg-surface-light border-accent-purple text-accent-purple hover:text-white flex items-center gap-2"
                      >
                        Go to Portal <span className="text-xs">▼</span>
                      </button>
                      <Tooltip text="💡 Truy cập portal cá nhân, để xem công việc & quản lý dữ liệu." />
                    </div>
                    {isPortalDropdownOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setIsPortalDropdownOpen(false)}
                        />
                        <div className="absolute right-0 mt-2 w-56 bg-[#151518] border border-white/5 rounded-xl shadow-2xl z-50 flex flex-col py-1">
                          <button
                            onClick={() => {
                              setCurrentView('portal');
                              setIsPortalDropdownOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/5 transition-colors"
                          >
                            My Portal
                          </button>
                          {(currentUser.role?.toLowerCase() === 'ceo' || currentUser.role?.toLowerCase() === 'account' || currentUser.role?.toLowerCase() === 'bod') && (
                            <button
                              onClick={() => {
                                setCurrentView('admin');
                                setIsPortalDropdownOpen(false);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/5 transition-colors"
                            >
                              Admin Portal
                            </button>
                          )}
                          {currentUser.role === 'CEO' && (
                            <button
                              onClick={() => {
                                setCurrentView('ceo');
                                setIsPortalDropdownOpen(false);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-accent-purple hover:bg-white/5 transition-colors font-medium"
                            >
                              CEO Permission Portal
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <button
                    onClick={() => setCurrentView('dashboard')}
                    className="text-sm px-4 py-2 rounded-lg transition-colors border bg-accent-purple text-white border-accent-purple"
                  >
                    ⬅ Back to Dashboard
                  </button>
                )}
              </div>
            </div>
          </header>

          {loading ? (
            <div className="flex py-20 w-full items-center justify-center">
              <div className="glass-panel flex flex-col items-center gap-4">
                <Loader2 className="animate-spin text-accent-purple" size={48} />
                <h2 className="text-xl font-medium text-white m-0">Loading Data...</h2>
              </div>
            </div>
          ) : currentView === 'portal' ? (
            <MyPortal token={token} currentUser={currentUser} data={data!} onRefresh={refresh} />
          ) : currentView === 'profile' ? (
            <MyProfile token={token} />
          ) : currentView === 'admin' ? (
            <AdminPortal token={token} data={data!} currentUser={currentUser} onRefresh={refresh} />
          ) : currentView === 'ceo' ? (
            <CEOPermissionPortal token={token} />
          ) : (
            <>
              {/* Reactive Monitor Wrapper */}
              <div className="glass-panel flex flex-col gap-6 p-6">
                <div className="flex flex-wrap items-center justify-between gap-6">
                  <div className="flex items-center gap-2">
                    <MonitorPlay className="text-accent-blue" size={28} />
                    <h2 className="text-2xl font-bold text-white m-0 tracking-wide">Reactive Monitor</h2>
                    <Tooltip text="💡 Chọn khoảng thời gian và tên nhân sự để lọc dữ liệu hiển thị bên dưới" />
                  </div>

                  {/* Zone 1 */}
                  <Zone1ControlPanel
                    staffList={staff}
                    dateRange={dateRange}
                    setDateRange={setDateRange}
                    selectedStaff={selectedStaff}
                    setSelectedStaff={setSelectedStaff}
                    hideWrapper={true}
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] xl:grid-cols-[320px_1fr] gap-6">
                  {/* Zone 2 */}
                  <Zone2Statistics
                    projects={projects}
                    tasks={tasks}
                    staff={staff}
                    dateRange={dateRange}
                    selectedStaff={selectedStaff}
                    hoveredProject={hoveredProject}
                    setHoveredProject={setHoveredProject}
                  />

                  {/* Zone 3 */}
                  <Zone3Capacity
                    staff={staff}
                    tasks={tasks}
                    projects={projects}
                    timesheets={timesheets}
                    leaves={leaves}
                    holidays={holidays}
                    dateRange={dateRange}
                    selectedStaff={selectedStaff}
                    hoveredProject={hoveredProject}
                    setHoveredProject={setHoveredProject}
                  />
                </div>
              </div>

              {/* Zone 4 */}
              <Zone4Timeline
                tasks={tasks}
                projects={projects}
                staff={staff}
                timesheets={timesheets}
                leaves={leaves}
                holidays={holidays}
                currentUser={currentUser}
                token={token}
                onRefresh={refresh}
              />
            </>
          )}

        </div>
      </div>
    </ErrorBoundary>
  );
}

export default App;

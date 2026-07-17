import React, { useState, useEffect } from 'react';
import { 
  BellRing, LayoutDashboard, Radio, FileCode, Sliders, ListFilter, Play, Code, LogOut, Globe, User, HelpCircle,
  Lock, Layers, Zap, Shield, BookOpen
} from 'lucide-react';
import { LoginView } from './components/LoginView';
import { OverviewTab } from './components/OverviewTab';
import { ApplicationsTab } from './components/ApplicationsTab';
import { TemplatesTab } from './components/TemplatesTab';
import { ProvidersTab } from './components/ProvidersTab';
import { LoggerTab } from './components/LoggerTab';
import { PlaygroundTab } from './components/PlaygroundTab';
import { ApiDocsTab } from './components/ApiDocsTab';
import { QueuesTab } from './components/QueuesTab';
import { VaultTab } from './components/VaultTab';
import { EventsTab } from './components/EventsTab';
import { UsersTab } from './components/UsersTab';
import Portal from './components/Portal';
import { Application, Template, Provider, NotificationLog, AnalyticsSummary } from './types';

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('aa_auth_token'));
  const [user, setUser] = useState<any>(JSON.parse(localStorage.getItem('aa_user_data') || 'null'));
  const [activeTab, setActiveTab] = useState('overview');

  // Master Data States
  const [applications, setApplications] = useState<Application[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary>({
    totalCount: 0,
    sentCount: 0,
    failedCount: 0,
    pendingCount: 0,
    deliveryRate: 100,
    channelDistribution: [],
    dailyMetrics: [],
    providerHealth: [],
    topTemplates: [],
  });

  const [loading, setLoading] = useState(false);
  const [liveToast, setLiveToast] = useState<string | null>(null);

  // Authentication Success Callback
  const handleLoginSuccess = (accessToken: string, userData: any) => {
    localStorage.setItem('aa_auth_token', accessToken);
    localStorage.setItem('aa_user_data', JSON.stringify(userData));
    setToken(accessToken);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('aa_auth_token');
    localStorage.removeItem('aa_user_data');
    setToken(null);
    setUser(null);
  };

  const hasPermission = (permCode: string) => {
    if (user?.role === 'administrator') return true;
    return user?.permissions?.includes(permCode) || false;
  };

  // Master Data Refresh Wrapper
  const refreshAllData = async () => {
    if (!token) return;
    setLoading(true);

    const headers = { 'Authorization': `Bearer ${token}` };

    try {
      const [appsRes, tempsRes, provsRes, logsRes, statsRes] = await Promise.all([
        fetch('/api/applications', { headers }),
        fetch('/api/templates', { headers }),
        fetch('/api/providers', { headers }),
        fetch('/api/logs', { headers }),
        fetch('/api/analytics', { headers }),
      ]);

      if (appsRes.ok) setApplications(await appsRes.json());
      if (tempsRes.ok) setTemplates(await tempsRes.json());
      if (provsRes.ok) setProviders(await provsRes.json());
      if (logsRes.ok) setLogs(await logsRes.json());
      if (statsRes.ok) setAnalytics(await statsRes.json());
    } catch (err) {
      console.error('Failed to sync master datasets:', err);
    } finally {
      setLoading(false);
    }
  };

  // SSE Stream Listening
  useEffect(() => {
    if (!token) return;

    // Load initial data first
    refreshAllData();

    // Subscribe to SSE updates
    const sse = new EventSource('/api/events/subscribe');

    sse.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const { type, data } = payload;

        if (type === 'insert_log') {
          // Add to log list
          setLogs(prev => [data, ...prev]);
          
          // Trigger Visual Toast Notification
          setLiveToast(`Event Triggered: ${data.template_name} -> ${data.recipient}`);
          setTimeout(() => setLiveToast(null), 4000);

          // Increment Analytics totals instantly for perfect UX
          setAnalytics(prev => {
            const total = prev.totalCount + 1;
            const pending = prev.pendingCount + 1;
            return {
              ...prev,
              totalCount: total,
              pendingCount: pending,
              deliveryRate: Math.round((prev.sentCount / total) * 100),
            };
          });
        } else if (type === 'update_log') {
          // Update specific log entry
          setLogs(prev => prev.map(log => log.id === data.id ? { ...log, ...data } : log));

          // Retrigger full analytics sync after delay to capture metrics cleanly
          setTimeout(() => {
            fetch('/api/analytics', { headers: { 'Authorization': `Bearer ${token}` } })
              .then(res => res.json())
              .then(stats => setAnalytics(stats))
              .catch(() => {});
          }, 1200);
        }
      } catch (err) {
        console.error('Failed to parse incoming EventSource stream:', err);
      }
    };

    sse.onerror = () => {
      console.warn('SSE stream temporarily disconnected. Retrying...');
    };

    return () => {
      sse.close();
    };
  }, [token]);

  // Actions wrappers
  const handleAddApplication = async (name: string, environment: string) => {
    const res = await fetch('/api/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ name, environment })
    });
    if (res.ok) refreshAllData();
  };

  const handleDeleteApplication = async (id: string) => {
    if (!confirm('Revoke this application and key? Integrations using this credential will fail.')) return;
    const res = await fetch(`/api/applications/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) refreshAllData();
  };

  const handleAddTemplate = async (name: string, subject: string, content: string, channel: any, variables: string[], status: string) => {
    const res = await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ name, subject, content, channel, variables, status })
    });
    if (res.ok) refreshAllData();
  };

  const handleUpdateTemplate = async (id: string, name: string, subject: string, content: string, channel: any, variables: string[], status: string, version: number) => {
    const res = await fetch(`/api/templates/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ name, subject, content, channel, variables, status, version })
    });
    if (res.ok) refreshAllData();
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Delete this template? Dispatched event notifications referencing this template will fail.')) return;
    const res = await fetch(`/api/templates/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) refreshAllData();
  };

  const handleAddProvider = async (name: string, channel: any, config: any, priority: number, is_active: boolean) => {
    const res = await fetch('/api/providers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ name, channel, config, priority, is_active })
    });
    if (res.ok) refreshAllData();
  };

  const handleUpdateProvider = async (id: string, name: string, channel: any, config: any, priority: number, is_active: boolean, health_status: any) => {
    const res = await fetch(`/api/providers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ name, channel, config, priority, is_active, health_status })
    });
    if (res.ok) refreshAllData();
  };

  const handleToggleActiveProvider = async (id: string, is_active: boolean, channel: string) => {
    const res = await fetch(`/api/providers/${id}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ is_active, channel })
    });
    if (res.ok) refreshAllData();
  };

  const handleDeleteProvider = async (id: string) => {
    if (!confirm('Delete this provider gateway config? Outbound notification queues on this channel may stall.')) return;
    const res = await fetch(`/api/providers/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) refreshAllData();
  };

  // Guard: Auth login
  if (!token) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex font-sans antialiased relative">
      
      {/* Real-time System Toast Alert */}
      {liveToast && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 border border-indigo-500/30 text-white p-3.5 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex items-center gap-3 animate-bounce">
          <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg">
            <BellRing className="w-4 h-4 animate-swing" />
          </div>
          <div>
            <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider block font-mono">Live Ingress Event</span>
            <span className="text-xs text-slate-300 font-medium">{liveToast}</span>
          </div>
        </div>
      )}

      {/* Sidebar navigation */}
      <aside className="w-60 bg-slate-950 border-r border-slate-900 flex flex-col justify-between shrink-0">
        <div>
          {/* Brand */}
          <div className="p-4 border-b border-slate-900 flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-500 rounded flex items-center justify-center">
              <span className="text-[11px] font-black text-white">AA</span>
            </div>
            <div>
              <h1 className="text-sm font-extrabold tracking-tight text-white leading-none">AuraAlert</h1>
              <span className="text-[9px] text-slate-500 font-mono tracking-wide mt-1 block">PLATFORM_ADMIN_V2.4</span>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="p-3 space-y-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold tracking-wide uppercase transition-all cursor-pointer ${
                activeTab === 'overview' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Telemetry Overview
            </button>

            <button
              onClick={() => setActiveTab('applications')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold tracking-wide uppercase transition-all cursor-pointer ${
                activeTab === 'applications' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              Apps & SDK Keys
            </button>

            <button
              onClick={() => setActiveTab('templates')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold tracking-wide uppercase transition-all cursor-pointer ${
                activeTab === 'templates' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              Templates Config
            </button>

            <button
              onClick={() => setActiveTab('providers')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold tracking-wide uppercase transition-all cursor-pointer ${
                activeTab === 'providers' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              Gateway Adapters
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold tracking-wide uppercase transition-all cursor-pointer ${
                activeTab === 'logs' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              Streams Logger
            </button>

            <div className="h-px bg-slate-900 my-2" />
            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest px-3 block mb-1">Advanced Services</span>

            <button
              onClick={() => setActiveTab('queues')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold tracking-wide uppercase transition-all cursor-pointer ${
                activeTab === 'queues' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              Queue Pipeline
            </button>

            <button
              onClick={() => setActiveTab('vault')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold tracking-wide uppercase transition-all cursor-pointer ${
                activeTab === 'vault' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
              }`}
            >
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              Security Vault
            </button>

            <button
              onClick={() => setActiveTab('events')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold tracking-wide uppercase transition-all cursor-pointer ${
                activeTab === 'events' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Schema Registry
            </button>

            <button
              onClick={() => setActiveTab('users')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold tracking-wide uppercase transition-all cursor-pointer ${
                activeTab === 'users' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-indigo-400" />
              IAM Directory
            </button>

            <div className="h-px bg-slate-900 my-2" />

            <button
              onClick={() => setActiveTab('playground')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold tracking-wide uppercase transition-all cursor-pointer ${
                activeTab === 'playground' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
              }`}
            >
              <Play className="w-3.5 h-3.5" />
              API Playground
            </button>

            <button
              onClick={() => setActiveTab('docs')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold tracking-wide uppercase transition-all cursor-pointer ${
                activeTab === 'docs' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              Developer Docs
            </button>

            <button
              onClick={() => setActiveTab('portal')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold tracking-wide uppercase transition-all cursor-pointer ${
                activeTab === 'portal' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Developer Portal
            </button>
          </nav>
        </div>

        {/* User profile footer */}
        <div className="p-3 border-t border-slate-900 bg-slate-900/10 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700/80 flex items-center justify-center text-slate-300 font-bold shrink-0 text-xs uppercase font-mono">
              {user?.email ? user.email[0] : 'U'}
            </div>
            <div className="truncate">
              <span className="text-xs font-semibold text-white block truncate capitalize leading-tight">{user?.role || 'Guest'}</span>
              <span className="text-[9px] text-slate-500 block truncate font-mono mt-0.5" title={user?.email}>{user?.email || 'unknown'}</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-slate-500 hover:text-rose-400 p-1 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
            title="Disconnect Auth"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>

      {/* Main dashboard content container */}
      <main className="flex-1 bg-[#020617] flex flex-col min-w-0 overflow-y-auto custom-scrollbar">
        {/* Top Header System Status */}
        <div className="h-11 border-b border-slate-900 bg-slate-950/40 flex items-center justify-between px-6 shrink-0 font-mono text-[10px] text-slate-400">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse" />
              <span>POSTGRES: <strong className="text-emerald-400">ONLINE</strong></span>
            </div>
            <span className="text-slate-800">|</span>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_#6366f1] animate-pulse" />
              <span>STREAM: <strong className="text-indigo-400">SUBSCRIBED</strong></span>
            </div>
            <span className="text-slate-800">|</span>
            <span className="hidden sm:inline text-slate-500 font-mono">POOL: <strong className="text-slate-300">AWS-POOL-0</strong></span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden md:inline text-slate-500 font-mono">API SUITE: <strong className="text-indigo-400">v2.4.0-Enterprise</strong></span>
            <span className="hidden md:inline text-slate-800">|</span>
            <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-sans font-bold">SYSTEM ACTIVE</span>
          </div>
        </div>

        <div className="p-6 max-w-7xl w-full mx-auto space-y-5">
          {activeTab === 'overview' && (
            <OverviewTab analytics={analytics} onRefresh={refreshAllData} loading={loading} />
          )}
          {activeTab === 'applications' && (
            <ApplicationsTab 
              applications={applications} 
              onAddApplication={handleAddApplication} 
              onDeleteApplication={handleDeleteApplication}
              token={token}
              hasPermission={hasPermission}
            />
          )}
          {activeTab === 'templates' && (
            <TemplatesTab 
              templates={templates} 
              onAddTemplate={handleAddTemplate} 
              onDeleteTemplate={handleDeleteTemplate} 
              onUpdateTemplate={handleUpdateTemplate}
              token={token}
              hasPermission={hasPermission}
            />
          )}
          {activeTab === 'providers' && (
            <ProvidersTab 
              providers={providers} 
              onAddProvider={handleAddProvider} 
              onDeleteProvider={handleDeleteProvider} 
              onUpdateProvider={handleUpdateProvider}
              onToggleActive={handleToggleActiveProvider}
              token={token}
              hasPermission={hasPermission}
            />
          )}
          {activeTab === 'logs' && (
            <LoggerTab logs={logs} onRefresh={refreshAllData} loading={loading} token={token} />
          )}
          {activeTab === 'queues' && (
            <QueuesTab token={token} hasPermission={hasPermission} />
          )}
          {activeTab === 'vault' && (
            <VaultTab token={token} hasPermission={hasPermission} />
          )}
          {activeTab === 'events' && (
            <EventsTab token={token} />
          )}
          {activeTab === 'users' && (
            <UsersTab token={token} currentUser={user} />
          )}
          {activeTab === 'playground' && (
            <PlaygroundTab 
              applications={applications} 
              templates={templates} 
              onNotificationSent={refreshAllData} 
            />
          )}
          {activeTab === 'docs' && (
            <ApiDocsTab />
          )}
          {activeTab === 'portal' && (
            <Portal />
          )}
        </div>
      </main>
    </div>
  );
}

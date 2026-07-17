import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Key, 
  Copy, 
  Check, 
  Globe, 
  Settings, 
  X, 
  Save, 
  Sliders, 
  Paintbrush, 
  Webhook, 
  Activity,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Application } from '../types';

interface ApplicationsTabProps {
  applications: Application[];
  onAddApplication: (name: string, env: 'development' | 'sandbox' | 'production') => Promise<void>;
  onDeleteApplication: (id: string) => Promise<void>;
  token: string;
  hasPermission?: (permCode: string) => boolean;
}

export function ApplicationsTab({ applications, onAddApplication, onDeleteApplication, token, hasPermission }: ApplicationsTabProps) {
  const canManage = hasPermission ? hasPermission('MANAGE_APPLICATIONS') : true;

  const [name, setName] = useState('');
  const [env, setEnv] = useState<'development' | 'sandbox' | 'production'>('development');
  const [submitting, setSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Tenant configuration drawer state
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [rateLimit, setRateLimit] = useState(100);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [webhookActive, setWebhookActive] = useState(false);
  const [brandColor, setBrandColor] = useState('#6366f1');
  const [brandSenderName, setBrandSenderName] = useState('AuraAlert Relay');
  const [savingSettings, setSavingSettings] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleCopy = (key: string, id: string) => {
    navigator.clipboard.writeText(key);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      await onAddApplication(name, env);
      setName('');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenSettings = (app: Application) => {
    setSelectedApp(app);
    setRateLimit(app.rate_limit || 150);
    setWebhookUrl(app.webhook_url || '');
    setWebhookSecret(app.webhook_secret || 'whsec_' + Math.random().toString(36).substring(2, 12));
    setWebhookActive(app.webhook_active || false);
    setBrandColor(app.branding?.primaryColor || '#6366f1');
    setBrandSenderName(app.branding?.senderName || 'AuraAlert Enterprise Relay');
    setSuccessMsg('');
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;

    setSavingSettings(true);
    try {
      const res = await fetch(`/api/applications/${selectedApp.id}/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          rate_limit: rateLimit,
          webhook_url: webhookUrl,
          webhook_secret: webhookSecret,
          webhook_active: webhookActive,
          branding: {
            primaryColor: brandColor,
            senderName: brandSenderName
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        // Update local selected application attributes
        selectedApp.rate_limit = rateLimit;
        selectedApp.webhook_url = webhookUrl;
        selectedApp.webhook_secret = webhookSecret;
        selectedApp.webhook_active = webhookActive;
        selectedApp.branding = {
          primaryColor: brandColor,
          senderName: brandSenderName
        };
        setSuccessMsg('Tenant control plane configuration saved successfully!');
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="space-y-4 font-sans" id="applications-tab-container">
      <div className="border-b border-slate-900 pb-4">
        <h2 className="text-base font-bold text-white uppercase tracking-tight flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-500" />
          Application Registries
        </h2>
        <p className="text-slate-400 text-xs mt-0.5">Register software modules and configure tenant settings including webhook payloads and brand aesthetics.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Register Form */}
        <div className="bg-slate-950/40 border border-slate-900 rounded-lg p-3.5 h-fit shadow-sm">
          <h3 className="text-xs font-bold text-slate-300 mb-3 flex items-center gap-2 uppercase tracking-wide border-b border-slate-900 pb-2">
            <Plus className="w-3.5 h-3.5 text-indigo-400" />
            Integrate Application
          </h3>
          {canManage ? (
            <form onSubmit={handleCreate} className="space-y-3.5">
              <div>
                <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1.5">Module / App Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Core E-Commerce Shop"
                  className="w-full bg-slate-950 border border-slate-900 rounded-md px-3 py-1.5 text-xs text-white placeholder-slate-700 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1.5">Environment Scope</label>
                <select
                  value={env}
                  onChange={(e) => setEnv(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-900 rounded-md px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="development">Development (Test Sandbox)</option>
                  <option value="sandbox">Staging / Sandbox</option>
                  <option value="production">Production (Real delivery)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 px-3 rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Generating Secrets...' : 'GENERATE SDK KEYS'}
              </button>
            </form>
          ) : (
            <div className="bg-slate-900/30 rounded-lg p-3 border border-slate-900/50 text-[11px] text-slate-400 leading-relaxed flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <span>
                <strong>Privilege Gate:</strong> Your role lacks <code>MANAGE_APPLICATIONS</code>. You have read-only access to SDK credentials.
              </span>
            </div>
          )}

          {/* Quick Note */}
          <div className="mt-4 p-3 bg-slate-900/20 border border-slate-900 rounded-md">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 mb-1">
              <Globe className="w-3.5 h-3.5 text-indigo-400" />
              API Authentication
            </span>
            <p className="text-[10px] text-slate-500 leading-normal font-sans">
              Every registered application receives a secure, unique API access credential. Developers use this key inside headers to hit AuraAlert endpoints.
            </p>
          </div>
        </div>

        {/* Right: Existing Applications List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-950/40 border border-slate-900 rounded-lg overflow-hidden">
            <div className="p-3.5 border-b border-slate-900 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wide">Registered Access Clients ({applications.length})</h3>
            </div>

            {applications.length === 0 ? (
              <div className="p-10 text-center text-slate-500 font-mono text-xs">
                No access clients registered yet. Use the sidebar to initiate key generation.
              </div>
            ) : (
              <div className="divide-y divide-slate-900">
                {applications.map((app) => (
                  <div key={app.id} className="p-3.5 hover:bg-slate-900/10 transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white font-sans">{app.name}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider font-mono ${
                            app.environment === 'production' 
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                              : app.environment === 'sandbox'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {app.environment}
                          </span>
                        </div>
                        <p className="text-[9px] text-slate-500 font-mono mt-1">CLIENT_ID: {app.id} • Registered: {new Date(app.created_at).toLocaleDateString()}</p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenSettings(app)}
                          className="text-slate-400 hover:text-white p-1 hover:bg-slate-900 rounded transition-colors cursor-pointer"
                          title="Configure Tenant Settings"
                        >
                          <Settings className="w-3.5 h-3.5" />
                        </button>
                        {canManage && (
                          <button
                            onClick={() => onDeleteApplication(app.id)}
                            className="text-slate-500 hover:text-rose-400 p-1 hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
                            title="Revoke Credentials"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* API Key Display Block */}
                    <div className="mt-3 flex items-center justify-between p-2 bg-slate-950 border border-slate-900 rounded-md">
                      <div className="flex items-center gap-2 min-w-0">
                        <Key className="w-3 h-3 text-indigo-400 shrink-0" />
                        <span className="text-[11px] font-mono text-slate-300 truncate select-all">{app.api_key}</span>
                      </div>
                      <button
                        onClick={() => handleCopy(app.api_key, app.id)}
                        className="text-slate-400 hover:text-indigo-400 p-1 hover:bg-slate-900 rounded shrink-0 transition-colors cursor-pointer"
                        title="Copy Key"
                      >
                        {copiedId === app.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>

                    {/* Webhooks & Rate limits Overview badge if customized */}
                    {(app.rate_limit || app.webhook_active) && (
                      <div className="mt-2 flex items-center gap-3 text-[10px] font-mono text-slate-500">
                        <span>Rate limit: <strong className="text-slate-300">{app.rate_limit || 150} req/s</strong></span>
                        {app.webhook_active && (
                          <span className="text-emerald-400 flex items-center gap-0.5 font-bold">
                            <Webhook className="w-3 h-3" /> WEBHOOK ACTIVE
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Drawer overlay for Tenant settings */}
      {selectedApp && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-lg bg-slate-950 border-l border-slate-900 h-full p-6 overflow-y-auto space-y-6 flex flex-col justify-between">
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-tight">SaaS Tenant Config</h3>
                  <span className="text-[10px] font-mono text-slate-400">Application ID: {selectedApp.id}</span>
                </div>
                <button
                  onClick={() => setSelectedApp(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-900 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Settings */}
              <form onSubmit={handleSaveSettings} className="space-y-5 text-left">
                {/* Section 1: Throttling & Rate Limits */}
                <div className="space-y-2.5">
                  <h4 className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                    <Sliders className="w-3.5 h-3.5" /> Rate Limiting (SLA Guard)
                  </h4>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-slate-400 block">Peak Ingress Rate (Req/Sec)</label>
                    <input
                      type="number"
                      required
                      min={10}
                      max={1000}
                      value={rateLimit}
                      onChange={(e) => setRateLimit(parseInt(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 px-3 py-1.5 rounded-md text-xs font-mono text-slate-200 focus:outline-none"
                    />
                    <p className="text-[9px] text-slate-500">Exceeding transactions receive HTTP Code 429 Too Many Requests instantly.</p>
                  </div>
                </div>

                {/* Section 2: Outbox Webhooks */}
                <div className="space-y-2.5 pt-2 border-t border-slate-900/60">
                  <h4 className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                    <Webhook className="w-3.5 h-3.5" /> Event Delivery Webhooks
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-mono text-slate-400 block">Active Status</label>
                      <input
                        type="checkbox"
                        checked={webhookActive}
                        onChange={(e) => setWebhookActive(e.target.checked)}
                        className="rounded bg-slate-950 border-slate-900 text-indigo-500 focus:ring-0"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-slate-400 block">Webhook URL</label>
                      <input
                        type="url"
                        placeholder="e.g. https://api.myclient.com/webhooks/notifications"
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 px-3 py-1.5 rounded-md text-xs font-mono text-slate-200 focus:outline-none placeholder-slate-700"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-slate-400 block">Secret Signature Key</label>
                      <input
                        type="text"
                        required
                        value={webhookSecret}
                        onChange={(e) => setWebhookSecret(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 px-3 py-1.5 rounded-md text-xs font-mono text-slate-200 focus:outline-none"
                      />
                      <p className="text-[9px] text-slate-500">Used to sign webhook headers `X-Aura-Signature` for authenticity handshake checks.</p>
                    </div>
                  </div>
                </div>

                {/* Section 3: Brand override options */}
                <div className="space-y-2.5 pt-2 border-t border-slate-900/60">
                  <h4 className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                    <Paintbrush className="w-3.5 h-3.5" /> Tenant Branding Overrides
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-slate-400 block">Brand Accent Color</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={brandColor}
                          onChange={(e) => setBrandColor(e.target.value)}
                          className="w-8 h-7 p-0 bg-transparent border-0 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          required
                          value={brandColor}
                          onChange={(e) => setBrandColor(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 px-3 py-1 text-xs font-mono text-slate-200 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-slate-400 block">Sender Name Label</label>
                      <input
                        type="text"
                        required
                        value={brandSenderName}
                        onChange={(e) => setBrandSenderName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 px-3 py-1 text-xs text-slate-200 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {successMsg && (
                  <div className="p-3.5 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20 text-xs flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>{successMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={savingSettings}
                  className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs py-2 px-3 rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm shadow-indigo-500/20 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {savingSettings ? 'Committing...' : 'SAVE TENANT CONFIG'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

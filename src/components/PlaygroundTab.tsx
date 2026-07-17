import React, { useState, useEffect } from 'react';
import { Play, Code, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { Application, Template } from '../types';

interface PlaygroundTabProps {
  applications: Application[];
  templates: Template[];
  onNotificationSent: () => void;
}

export function PlaygroundTab({ applications, templates, onNotificationSent }: PlaygroundTabProps) {
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [recipient, setRecipient] = useState('');
  
  // Variables payload
  const [variablesPayload, setVariablesPayload] = useState<Record<string, string>>({});
  
  // API response state
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [apiError, setApiError] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (applications.length > 0 && !selectedApp) {
      setSelectedApp(applications[0]);
    }
  }, [applications, selectedApp]);

  useEffect(() => {
    if (templates.length > 0 && !selectedTemplate) {
      setSelectedTemplate(templates[0]);
    }
  }, [templates, selectedTemplate]);

  // Sync variables payload when template changes
  useEffect(() => {
    if (selectedTemplate) {
      const initPayload: Record<string, string> = {};
      selectedTemplate.variables.forEach(v => {
        initPayload[v] = '';
      });
      setVariablesPayload(initPayload);

      // set default recipient hints
      if (selectedTemplate.channel === 'email') {
        setRecipient('customer@company.com');
      } else if (selectedTemplate.channel === 'sms') {
        setRecipient('+15550199');
      } else if (selectedTemplate.channel === 'whatsapp') {
        setRecipient('whatsapp:+15550222');
      } else {
        setRecipient('user-inapp-id');
      }
    }
  }, [selectedTemplate]);

  const handleVarChange = (key: string, val: string) => {
    setVariablesPayload(prev => ({ ...prev, [key]: val }));
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp || !selectedTemplate || !recipient.trim()) return;

    setSending(true);
    setApiError('');
    setApiResponse(null);

    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': selectedApp.api_key
        },
        body: JSON.stringify({
          template: selectedTemplate.name,
          recipient,
          variables: variablesPayload
        })
      });

      const data = await response.json();
      if (response.ok) {
        setApiResponse(data);
        onNotificationSent();
      } else {
        setApiError(data.error || 'Gateway returned an error.');
      }
    } catch (err) {
      setApiError('Failed to dispatch notification payload.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4 font-sans">
      <div className="border-b border-slate-900 pb-4">
        <h2 className="text-base font-bold text-white uppercase tracking-tight flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-500" />
          SDK Event Playground
        </h2>
        <p className="text-slate-400 text-xs mt-0.5">Simulate direct client calls to publish notification events</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Input console */}
        <div className="bg-slate-950/40 border border-slate-900 rounded-lg p-3.5 shadow-sm">
          <h3 className="text-xs font-bold text-slate-300 mb-3 flex items-center gap-2 uppercase tracking-wide border-b border-slate-900 pb-2">
            <Play className="w-3.5 h-3.5 text-indigo-400" />
            Request builder console
          </h3>

          <form onSubmit={handleSendNotification} className="space-y-3.5">
            {/* Select App */}
            <div>
              <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Authorized client application</label>
              <select
                value={selectedApp?.id || ''}
                onChange={(e) => setSelectedApp(applications.find(a => a.id === e.target.value) || null)}
                className="w-full bg-slate-950 border border-slate-900 rounded-md px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                {applications.map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({a.environment})</option>
                ))}
              </select>
            </div>

            {/* Select Template */}
            <div>
              <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Target event template</label>
              <select
                value={selectedTemplate?.id || ''}
                onChange={(e) => setSelectedTemplate(templates.find(t => t.id === e.target.value) || null)}
                className="w-full bg-slate-950 border border-slate-900 rounded-md px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name} (Format: {t.channel.toUpperCase()})</option>
                ))}
              </select>
            </div>

            {/* Recipient Input */}
            <div>
              <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Destination Address / Phone</label>
              <input
                type="text"
                required
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="customer@domain.com"
                className="w-full bg-slate-950 border border-slate-900 rounded-md px-3 py-1.5 text-xs text-white placeholder-slate-700 focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[9px] text-slate-500 font-mono mt-1 leading-normal">
                💡 Tip: Type "timeout" or "fail" inside recipient to trigger AI Fixing diagnostics simulation in Logs.
              </p>
            </div>

            {/* Variable Payloads */}
            {selectedTemplate && selectedTemplate.variables.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-slate-900/60">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono block">
                  Template Variables Detected
                </span>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedTemplate.variables.map(v => (
                    <div key={v}>
                      <label className="block text-slate-500 text-[9px] font-mono mb-1">{`{{${v}}}`}</label>
                      <input
                        type="text"
                        required
                        value={variablesPayload[v] || ''}
                        onChange={(e) => handleVarChange(v, e.target.value)}
                        placeholder={`Value for ${v}`}
                        className="w-full bg-slate-950 border border-slate-900 rounded-md px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={sending || !selectedApp || !selectedTemplate}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-md text-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 transition-all mt-4"
            >
              {sending ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  PUBLISHING EVENT...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  TRIGGER SDK EVENT
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right: Output terminal */}
        <div className="flex flex-col gap-4">
          {/* API Headers Console */}
          <div className="bg-slate-950/40 border border-slate-900 rounded-lg p-3.5 font-mono text-xs text-slate-400 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-900 pb-2 mb-3.5 text-[9px] text-slate-500 font-bold tracking-wider uppercase">
                <span className="flex items-center gap-1">
                  <Code className="w-3.5 h-3.5 text-indigo-400" />
                  API REQUEST / RESPONSE LOG
                </span>
                <span>POST /api/notifications/send</span>
              </div>

              {/* Mock Header call */}
              <div className="space-y-1.5 text-slate-400 text-[11px] mb-4">
                <p><span className="text-rose-400">POST</span> /api/notifications/send HTTP/1.1</p>
                <p><span className="text-indigo-400">Content-Type</span>: application/json</p>
                <p><span className="text-indigo-400">X-API-Key</span>: {selectedApp ? selectedApp.api_key : 'aa_live_key_••••••••••••'}</p>
                <p className="text-slate-600 mt-2">// Request Payload</p>
                <p className="text-slate-300">
                  {`{`}
                </p>
                <p className="text-slate-300 pl-4">
                  {`"template": "${selectedTemplate ? selectedTemplate.name : 'null'}",`}
                </p>
                <p className="text-slate-300 pl-4">
                  {`"recipient": "${recipient || 'null'}",`}
                </p>
                <p className="text-slate-300 pl-4">
                  {`"variables": ${JSON.stringify(variablesPayload, null, 2).replace(/\n/g, '\n    ')}`}
                </p>
                <p className="text-slate-300">
                  {`}`}
                </p>
              </div>
            </div>

            {/* Results display */}
            <div>
              {apiError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded text-[11px] font-sans flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block text-white text-xs">Gateway Error</span>
                    {apiError}
                  </div>
                </div>
              )}

              {apiResponse && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded text-[11px] font-sans flex flex-col justify-between">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold block text-white text-xs">Event Published Successfully!</span>
                      <p className="text-slate-300 text-[10px] mt-1">AuraAlert rendered content and successfully queued job ID:</p>
                      <span className="font-mono text-emerald-400 text-xs block mt-1 bg-slate-950 px-2 py-0.5 rounded border border-slate-900 w-fit">{apiResponse.jobId}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

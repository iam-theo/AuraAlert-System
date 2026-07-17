import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { Template } from '../types';

interface TemplatesTabProps {
  templates: Template[];
  onAddTemplate: (name: string, subject: string, content: string, channel: 'email' | 'sms' | 'whatsapp' | 'in_app', variables: string[], status: 'draft' | 'published') => Promise<void>;
  onDeleteTemplate: (id: string) => Promise<void>;
  onUpdateTemplate: (id: string, name: string, subject: string, content: string, channel: 'email' | 'sms' | 'whatsapp' | 'in_app', variables: string[], status: 'draft' | 'published', version: number) => Promise<void>;
  token: string;
  hasPermission?: (permCode: string) => boolean;
}

export function TemplatesTab({ templates, onAddTemplate, onDeleteTemplate, onUpdateTemplate, token, hasPermission }: TemplatesTabProps) {
  const canManage = hasPermission ? hasPermission('MANAGE_TEMPLATES') : true;
  // CRUD state
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [channel, setChannel] = useState<'email' | 'sms' | 'whatsapp' | 'in_app'>('email');
  const [variablesText, setVariablesText] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('published');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // AI Prompt State
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiChannel, setAiChannel] = useState<'email' | 'sms' | 'whatsapp' | 'in_app'>('email');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const parseVariables = (text: string): string[] => {
    return text.split(',')
      .map(v => v.trim())
      .filter(v => v.length > 0);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !subject.trim() || !content.trim()) return;

    setSubmitting(true);
    const parsedVars = parseVariables(variablesText);

    try {
      if (editingId) {
        const existing = templates.find(t => t.id === editingId);
        const nextVersion = existing ? existing.version + 1 : 1;
        await onUpdateTemplate(editingId, name, subject, content, channel, parsedVars, status, nextVersion);
        setEditingId(null);
      } else {
        await onAddTemplate(name, subject, content, channel, parsedVars, status);
      }
      resetForm();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (t: Template) => {
    setEditingId(t.id);
    setName(t.name);
    setSubject(t.subject);
    setContent(t.content);
    setChannel(t.channel);
    setVariablesText(t.variables.join(', '));
    setStatus(t.status);
  };

  const resetForm = () => {
    setName('');
    setSubject('');
    setContent('');
    setChannel('email');
    setVariablesText('');
    setStatus('published');
    setEditingId(null);
  };

  // Hit the server-side Gemini API
  const handleAISuggest = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiError('');

    try {
      const response = await fetch('/api/templates/ai-suggest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ prompt: aiPrompt, channel: aiChannel })
      });

      const data = await response.json();
      if (response.ok) {
        setName(aiPrompt.toLowerCase().replace(/[^a-z0-9]/g, '.').substring(0, 30));
        setSubject(data.subject || '');
        setContent(data.content || '');
        setChannel(aiChannel);
        setVariablesText((data.variables || []).join(', '));
        // Scroll to form cleanly
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setAiError(data.error || 'Gemini Suggestion failed.');
      }
    } catch (err) {
      setAiError('Failed to communicate with AI model.');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-4 font-sans">
      <div className="border-b border-slate-900 pb-4">
        <h2 className="text-base font-bold text-white uppercase tracking-tight flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-500" />
          Notification Templates
        </h2>
        <p className="text-slate-400 text-xs mt-0.5">Design notification layouts, copies, and target variables</p>
      </div>

      {/* AI Assistant Section */}
      {canManage && (
        <div className="bg-slate-950/40 border border-indigo-500/20 rounded-lg p-3.5 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">AI-Powered Template Suggester</h3>
          </div>
          
          <p className="text-slate-500 text-[11px] mb-3 leading-normal max-w-2xl font-sans">
            Describe what you want to communicate (e.g., "flight delay of 2 hours", "account security warning", "welcome email for signups"). Gemini will automatically generate a highly compelling Subject line, content body, and draft the dynamic placeholders.
          </p>

          {aiError && (
            <div className="mb-3 p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded text-[11px] font-mono">
              {aiError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 relative z-10">
            <div className="md:col-span-2">
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="e.g. Flight delay notification warning"
                className="w-full bg-slate-950 border border-slate-900 rounded-md px-3 py-1.5 text-xs text-white placeholder-slate-700 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <select
                value={aiChannel}
                onChange={(e) => setAiChannel(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-900 rounded-md px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="email">Email Format</option>
                <option value="sms">SMS Text</option>
                <option value="whatsapp">WhatsApp Template</option>
                <option value="in_app">In-App Alert</option>
              </select>
            </div>
            <button
              onClick={handleAISuggest}
              disabled={aiLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-1.5 px-3 rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              {aiLoading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  DRAFT WITH AI
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Create/Edit Form */}
        <div className="bg-slate-950/40 border border-slate-900 rounded-lg p-3.5 h-fit shadow-sm">
          <h3 className="text-xs font-bold text-slate-300 mb-3 flex items-center gap-2 uppercase tracking-wide border-b border-slate-900 pb-2">
            <Plus className="w-3.5 h-3.5 text-indigo-400" />
            {editingId ? 'Modify Template' : 'Design Custom Template'}
          </h3>

          {canManage ? (
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Template Event Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. otp.requested"
                  disabled={!!editingId}
                  className="w-full bg-slate-950 border border-slate-900 rounded-md px-3 py-1.5 text-xs font-mono text-indigo-400 placeholder-slate-700 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Channel Routing</label>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-900 rounded-md px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="email">Email</option>
                  <option value="sms">SMS Text</option>
                  <option value="whatsapp">WhatsApp Message</option>
                  <option value="in_app">In-App Alert</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Subject Line / Title</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Your verification code is {{otp}}"
                  className="w-full bg-slate-950 border border-slate-900 rounded-md px-3 py-1.5 text-xs text-white placeholder-slate-700 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Content Body</label>
                <textarea
                  required
                  rows={5}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Hi {{firstName}},\n\nYour OTP is {{otpCode}}."
                  className="w-full bg-slate-950 border border-slate-900 rounded-md px-3 py-1.5 text-xs text-white placeholder-slate-700 focus:outline-none focus:border-indigo-500 font-sans leading-relaxed"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider">Dynamic Placeholders</label>
                  <span className="text-[9px] text-slate-500 font-mono">Comma-separated</span>
                </div>
                <input
                  type="text"
                  value={variablesText}
                  onChange={(e) => setVariablesText(e.target.value)}
                  placeholder="firstName, otpCode"
                  className="w-full bg-slate-950 border border-slate-900 rounded-md px-3 py-1.5 text-xs text-slate-300 placeholder-slate-700 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-900 rounded-md px-3 py-1.5 text-xs text-white focus:outline-none"
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  {editingId && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="w-1/2 bg-slate-900 hover:bg-slate-800 text-slate-400 py-1.5 rounded-md text-xs cursor-pointer border border-slate-800 font-bold"
                    >
                      X
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1.5 rounded-md text-xs cursor-pointer disabled:opacity-50"
                  >
                    {editingId ? 'APPLY' : 'SAVE'}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div className="bg-slate-900/30 rounded-lg p-3 border border-slate-900/50 text-[11px] text-slate-400 leading-relaxed flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <span>
                <strong>Privilege Gate:</strong> Your role lacks <code>MANAGE_TEMPLATES</code>. You have read-only access to templates.
              </span>
            </div>
          )}
        </div>

        {/* Right: Existing Templates */}
        <div className="lg:col-span-2 space-y-4">
          {templates.length === 0 ? (
            <div className="bg-slate-950/40 border border-slate-900 rounded-lg p-10 text-center text-slate-500 font-mono text-xs">
              No templates available. Use the suggester or creator to create templates.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {templates.map((t) => (
                <div key={t.id} className="bg-slate-950/40 border border-slate-900 rounded-lg p-3.5 hover:border-indigo-500/20 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono text-indigo-400 font-semibold truncate max-w-[130px]">{t.name}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="px-1.5 py-0.5 bg-slate-950 border border-slate-900 rounded text-[8px] font-mono font-bold uppercase text-slate-400">
                          {t.channel}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase ${
                          t.status === 'published' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {t.status}
                        </span>
                      </div>
                    </div>

                    <h4 className="text-xs font-bold text-white mb-1.5 leading-snug truncate">{t.subject}</h4>
                    <p className="text-[11px] text-slate-400 line-clamp-3 leading-normal mb-3.5 whitespace-pre-wrap font-sans">{t.content}</p>
                  </div>

                  <div>
                    {/* Variables used badge list */}
                    <div className="flex flex-wrap gap-1.5 mb-3 pt-2.5 border-t border-slate-900/60">
                      {t.variables.length > 0 ? (
                        t.variables.map(v => (
                          <span key={v} className="bg-slate-950 text-slate-500 px-1.5 py-0.5 rounded text-[9px] font-mono border border-slate-900">
                            {`{{${v}}}`}
                          </span>
                        ))
                      ) : (
                        <span className="text-[9px] text-slate-600 italic">No placeholders</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                      <span>v{t.version} • {new Date(t.created_at).toLocaleDateString()}</span>
                      {canManage && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEdit(t)}
                            className="p-1 bg-slate-950 border border-slate-900 hover:text-indigo-400 rounded text-slate-400 transition-colors cursor-pointer"
                            title="Edit Layout"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => onDeleteTemplate(t.id)}
                            className="p-1 bg-slate-950 border border-slate-900 hover:bg-rose-500/10 hover:text-rose-400 rounded text-slate-400 transition-colors cursor-pointer"
                            title="Delete Template"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

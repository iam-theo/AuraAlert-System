import React, { useState } from 'react';
import { Search, Sparkles, AlertTriangle, CheckCircle, Clock, RefreshCw, X } from 'lucide-react';
import { NotificationLog } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';

interface LoggerTabProps {
  logs: NotificationLog[];
  onRefresh: () => void;
  loading: boolean;
  token: string;
}

export function LoggerTab({ logs, onRefresh, loading, token }: LoggerTabProps) {
  const [search, setSearch] = useState('');
  const [filterChannel, setFilterChannel] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // AI Troubleshoot state
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [troubleshootReport, setTroubleshootReport] = useState<string | null>(null);
  const [troubleshootLoading, setTroubleshootLoading] = useState(false);

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    const matchSearch = log.recipient.toLowerCase().includes(search.toLowerCase()) || 
                        log.template_name.toLowerCase().includes(search.toLowerCase());
    const matchChannel = filterChannel === 'all' || log.channel === filterChannel;
    const matchStatus = filterStatus === 'all' || log.status === filterStatus;
    return matchSearch && matchChannel && matchStatus;
  });

  const handleTroubleshoot = async (id: string) => {
    setSelectedLogId(id);
    setTroubleshootReport(null);
    setTroubleshootLoading(true);

    try {
      const response = await fetch(`/api/logs/${id}/troubleshoot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setTroubleshootReport(data.troubleshooting);
      } else {
        setTroubleshootReport(`### ❌ Troubleshooting Request Failed\n${data.error || 'Unable to analyze failure logs.'}`);
      }
    } catch (err) {
      setTroubleshootReport('### ❌ Network Error\nFailed to establish connection with local troubleshooting diagnostic service.');
    } finally {
      setTroubleshootLoading(false);
    }
  };

  return (
    <div className="space-y-4 font-sans relative">
      {/* Troubleshooting Sidebar Drawer */}
      {selectedLogId && (
        <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-slate-950 border-l border-slate-900 shadow-2xl z-50 flex flex-col justify-between">
          <div className="p-3.5 border-b border-slate-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">AI Diagnostics & Fixing</h3>
            </div>
            <button 
              onClick={() => { setSelectedLogId(null); setTroubleshootReport(null); }}
              className="text-slate-400 hover:text-white p-1 hover:bg-slate-900 rounded transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 p-4 overflow-y-auto bg-slate-950/40 custom-scrollbar">
            {troubleshootLoading ? (
              <div className="h-48 flex flex-col items-center justify-center gap-2.5">
                <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" />
                <p className="text-[10px] text-slate-500 font-mono animate-pulse">Gemini is parsing gateway failure payloads...</p>
              </div>
            ) : troubleshootReport ? (
              <div className="markdown-body text-xs leading-relaxed text-slate-300">
                <MarkdownRenderer content={troubleshootReport} />
              </div>
            ) : null}
          </div>

          <div className="p-3 border-t border-slate-900 bg-slate-950 flex justify-end">
            <button
              onClick={() => { setSelectedLogId(null); setTroubleshootReport(null); }}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 font-bold rounded text-[10px] uppercase font-mono cursor-pointer border border-slate-800"
            >
              CLOSE REPORT
            </button>
          </div>
        </div>
      )}

      {/* Main layout header */}
      <div className="border-b border-slate-900 pb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white uppercase tracking-tight flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            Message Logs Tracker
          </h2>
          <p className="text-slate-400 text-xs mt-0.5">Monitor system queues, retry backoffs, and delivery statuses</p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          SYNC LOGS
        </button>
      </div>

      {/* Search & Filters block */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-950/40 border border-slate-900 p-3 rounded-lg">
        <div className="relative md:col-span-2">
          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-500">
            <Search className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search recipient address or templates..."
            className="w-full bg-slate-950 border border-slate-900 rounded-md pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-700 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <select
            value={filterChannel}
            onChange={(e) => setFilterChannel(e.target.value)}
            className="w-full bg-slate-950 border border-slate-900 rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Routing channels</option>
            <option value="email">Email Only</option>
            <option value="sms">SMS Only</option>
            <option value="whatsapp">WhatsApp Only</option>
            <option value="in_app">In-App Only</option>
          </select>
        </div>

        <div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full bg-slate-950 border border-slate-900 rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Queue statuses</option>
            <option value="sent">Sent / Delivered</option>
            <option value="failed">Failed / Dropped</option>
            <option value="pending">Queued</option>
            <option value="retrying">Retrying</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-slate-950/40 border border-slate-900 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-900 text-[9px] font-bold text-slate-500 tracking-wider font-mono">
                <th className="p-2.5">RECIPIENT ADDRESS</th>
                <th className="p-2.5">ROUTING</th>
                <th className="p-2.5">TEMPLATE</th>
                <th className="p-2.5">PROVIDER RELAY</th>
                <th className="p-2.5">STATE</th>
                <th className="p-2.5">RETRIES</th>
                <th className="p-2.5">TIMESTAMP</th>
                <th className="p-2.5 text-right">DIAGNOSTIC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 font-mono text-[11px]">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-600 font-mono text-xs">
                    No matching notification log records found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-900/10 text-slate-300 transition-colors">
                    {/* Recipient */}
                    <td className="p-2.5 max-w-[130px] truncate font-sans text-xs font-semibold text-white">
                      {log.recipient}
                    </td>

                    {/* Channel */}
                    <td className="p-2.5">
                      <span className="px-1.5 py-0.5 bg-slate-950 border border-slate-900 rounded text-[8px] font-bold uppercase text-slate-400">
                        {log.channel}
                      </span>
                    </td>

                    {/* Template */}
                    <td className="p-2.5 text-indigo-400 font-bold truncate max-w-[130px]">
                      {log.template_name}
                    </td>

                    {/* Provider */}
                    <td className="p-2.5 text-slate-400 truncate max-w-[120px]">
                      {log.provider_used || 'system'}
                    </td>

                    {/* Status */}
                    <td className="p-2.5">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                        log.status === 'sent' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : log.status === 'failed'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : log.status === 'retrying'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                      }`}>
                        {log.status === 'sent' && <CheckCircle className="w-2.5 h-2.5" />}
                        {log.status === 'failed' && <AlertTriangle className="w-2.5 h-2.5" />}
                        {log.status === 'retrying' && <Clock className="w-2.5 h-2.5 animate-spin" />}
                        {log.status === 'pending' && <Clock className="w-2.5 h-2.5" />}
                        {log.status}
                      </span>
                    </td>

                    {/* Retries */}
                    <td className="p-2.5 text-slate-500">
                      {log.retry_count}/3
                    </td>

                    {/* Timestamp */}
                    <td className="p-2.5 text-slate-500 text-[10px]">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </td>

                    {/* Actions */}
                    <td className="p-2.5 text-right">
                      {log.status === 'failed' ? (
                        <button
                          onClick={() => handleTroubleshoot(log.id)}
                          className="inline-flex items-center gap-1 text-[8px] font-bold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/20 transition-all cursor-pointer"
                        >
                          <Sparkles className="w-2.5 h-2.5 text-indigo-400 animate-pulse" />
                          AI FIX
                        </button>
                      ) : (
                        <span className="text-slate-700">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

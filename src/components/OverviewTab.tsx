import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell
} from 'recharts';
import { 
  CheckCircle, AlertTriangle, Clock, RefreshCw, Send,
  Shield, Network, FileText, Zap
} from 'lucide-react';
import { AnalyticsSummary } from '../types';

interface OverviewTabProps {
  analytics: AnalyticsSummary;
  onRefresh: () => void;
  loading: boolean;
}

export function OverviewTab({ analytics, onRefresh, loading }: OverviewTabProps) {
  const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'];

  return (
    <div className="space-y-6 font-sans">
      {/* Tab Header */}
      <div className="flex items-center justify-between border-b border-slate-900 pb-4">
        <div>
          <h2 className="text-base font-bold text-white uppercase tracking-tight flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            System Analytics & Telemetry
          </h2>
          <p className="text-slate-400 text-xs mt-0.5">Real-time health telemetry and message dispatch counts</p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          SYNC STATS
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Total Events */}
        <div className="bg-slate-900/40 border border-slate-900 rounded-lg p-3.5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-[10px] font-bold tracking-wider uppercase">Orchestrated</span>
            <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded">
              <Send className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-mono font-black text-white block">{analytics.totalCount}</span>
            <span className="text-slate-500 font-mono text-[9px] block mt-1 leading-normal">Outbound triggers published</span>
          </div>
        </div>

        {/* Delivered/Sent */}
        <div className="bg-slate-900/40 border border-slate-900 rounded-lg p-3.5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-[10px] font-bold tracking-wider uppercase">Successful</span>
            <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded">
              <CheckCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-mono font-black text-white block">{analytics.sentCount}</span>
            <span className="text-slate-500 font-mono text-[9px] block mt-1 leading-normal">Dispatched to carriers</span>
          </div>
        </div>

        {/* Failed */}
        <div className="bg-slate-900/40 border border-slate-900 rounded-lg p-3.5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-[10px] font-bold tracking-wider uppercase">Failed Logs</span>
            <div className="p-1.5 bg-rose-500/10 text-rose-400 rounded">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-mono font-black text-white block">{analytics.failedCount}</span>
            <span className="text-slate-500 font-mono text-[9px] block mt-1 leading-normal">Halted connection issues</span>
          </div>
        </div>

        {/* Retrying/Pending */}
        <div className="bg-slate-900/40 border border-slate-900 rounded-lg p-3.5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-[10px] font-bold tracking-wider uppercase">In Queue</span>
            <div className="p-1.5 bg-amber-500/10 text-amber-400 rounded animate-pulse">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-mono font-black text-white block">{analytics.pendingCount}</span>
            <span className="text-slate-500 font-mono text-[9px] block mt-1 leading-normal">Awaiting retry triggers</span>
          </div>
        </div>

        {/* Delivery Rate */}
        <div className="bg-slate-900/40 border border-slate-900 rounded-lg p-3.5 relative overflow-hidden col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-[10px] font-bold tracking-wider uppercase">SLA Ratio</span>
            <div className="p-1.5 bg-cyan-500/10 text-cyan-400 rounded">
              <Zap className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-mono font-black text-emerald-400 block">{analytics.deliveryRate}%</span>
            <div className="w-full bg-slate-800 h-1 rounded-full mt-2.5 overflow-hidden">
              <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${analytics.deliveryRate}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Daily Metrics Trend */}
        <div className="bg-slate-950/40 border border-slate-900 rounded-lg p-3.5 lg:col-span-2">
          <h3 className="text-xs font-bold text-slate-300 mb-3 flex items-center gap-2 uppercase tracking-wide border-b border-slate-900 pb-2">
            <Network className="w-3.5 h-3.5 text-indigo-400" />
            7-Day Delivery Volume metrics
          </h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.dailyMetrics}>
                <CartesianGrid strokeDasharray="2 2" stroke="#0f172a" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '4px', fontSize: '11px', fontFamily: 'monospace' }} 
                  labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                <Bar dataKey="sent" name="Dispatched" fill="#6366f1" radius={[2, 2, 0, 0]} />
                <Bar dataKey="failed" name="Failed / Dropped" fill="#ef4444" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Channel Distribution */}
        <div className="bg-slate-950/40 border border-slate-900 rounded-lg p-3.5 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-300 mb-3 flex items-center gap-2 uppercase tracking-wide border-b border-slate-900 pb-2">
              <Shield className="w-3.5 h-3.5 text-indigo-400" />
              Channel Volume Share
            </h3>
            <div className="h-40 flex items-center justify-center">
              {analytics.channelDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.channelDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={4}
                      dataKey="count"
                      nameKey="channel"
                    >
                      {analytics.channelDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '4px', fontSize: '11px', fontFamily: 'monospace' }}
                      itemStyle={{ color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <span className="text-slate-500 font-mono text-[10px]">No active distribution</span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5 mt-2 pt-2 border-t border-slate-900 text-[10px] font-mono">
            {analytics.channelDistribution.map((item, index) => (
              <div key={item.channel} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                <span className="text-slate-400 truncate">{item.channel}: <strong className="text-white">{item.count}</strong></span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Telemetry & Status Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Provider Health Telemetry */}
        <div className="bg-slate-950/40 border border-slate-900 rounded-lg p-3.5">
          <h3 className="text-xs font-bold text-slate-300 mb-3 flex items-center gap-2 uppercase tracking-wide border-b border-slate-900 pb-2">
            <Network className="w-3.5 h-3.5 text-indigo-400" />
            Provider handshakes
          </h3>
          <div className="space-y-2">
            {analytics.providerHealth.map((p) => (
              <div key={p.provider} className="flex items-center justify-between p-2.5 bg-slate-900/20 border border-slate-900 rounded-lg">
                <div>
                  <span className="text-xs text-white font-semibold font-mono block">{p.provider}</span>
                  <span className="text-[9px] text-slate-500 font-mono">Relay channel handshakes OK</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right font-mono">
                    <span className="text-[10px] text-slate-500 block">SLA RATE</span>
                    <span className="text-[10px] font-bold text-emerald-400">{p.successRate}% OK</span>
                  </div>
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold font-mono tracking-wide uppercase ${
                    p.status === 'healthy' 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                      : p.status === 'degraded'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}>
                    {p.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Performing Templates */}
        <div className="bg-slate-950/40 border border-slate-900 rounded-lg p-3.5">
          <h3 className="text-xs font-bold text-slate-300 mb-3 flex items-center gap-2 uppercase tracking-wide border-b border-slate-900 pb-2">
            <FileText className="w-3.5 h-3.5 text-indigo-400" />
            Top Event triggers
          </h3>
          {analytics.topTemplates.length > 0 ? (
            <div className="space-y-2">
              {analytics.topTemplates.map((t, idx) => (
                <div key={t.name} className="flex items-center justify-between p-2.5 bg-slate-900/20 border border-slate-900 rounded-lg">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded bg-slate-950 border border-slate-900 flex items-center justify-center text-[10px] text-slate-400 font-mono font-bold">{idx + 1}</span>
                    <div>
                      <span className="text-xs font-mono text-indigo-400 font-semibold block">{t.name}</span>
                      <span className="text-[9px] text-slate-500 font-mono">Database schema matched</span>
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-[9px] text-slate-500 block">TRIGGERS</span>
                    <span className="text-xs font-bold text-white">{t.count}x</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-slate-500 font-mono text-xs">
              Publish some notification events to display top performers.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

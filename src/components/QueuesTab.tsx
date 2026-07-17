import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Pause, 
  Trash2, 
  RefreshCw, 
  Database, 
  CheckCircle, 
  AlertTriangle, 
  Network, 
  Layers, 
  Cpu, 
  Activity, 
  ArrowRight,
  TrendingUp,
  Sliders,
  ChevronRight,
  Timer
} from 'lucide-react';
import { QueueState } from '../types';

interface QueuesTabProps {
  token: string;
  hasPermission?: (permCode: string) => boolean;
}

export const QueuesTab: React.FC<QueuesTabProps> = ({ token, hasPermission }) => {
  const canManageQueues = hasPermission ? hasPermission('MANAGE_QUEUES') : true;
  const [queues, setQueues] = useState<QueueState[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [actioningQueue, setActioningQueue] = useState<string | null>(null);

  const fetchQueueStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/queues/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setQueues(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueueStatus();
    const interval = setInterval(fetchQueueStatus, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleQueueAction = async (queueName: string, action: 'pause' | 'resume' | 'clear' | 'flush_dlq') => {
    setActioningQueue(queueName);
    try {
      const res = await fetch(`/api/queues/${queueName}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        fetchQueueStatus();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActioningQueue(null);
    }
  };

  const getStatusBadge = (status: 'active' | 'paused') => {
    if (status === 'active') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
          ACTIVE
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
        <span className="w-1 h-1 rounded-full bg-amber-400" />
        PAUSED
      </span>
    );
  };

  // Pipeline visualizer node hover helper
  const pipelineNodes = [
    { id: 'ingress', label: 'Ingress API Hub', desc: 'Secure HTTPS Endpoints & Rate Limiter', type: 'entry' },
    { id: 'registry', label: 'Event Validator', desc: 'Checks payload schema parameters', type: 'process' },
    { id: 'templates', label: 'Template Hydrator', desc: 'Infers Handlebars tags & locales', type: 'process' },
    { id: 'router', label: 'Router & Dispatcher', desc: 'Directs to appropriate channel engine', type: 'router' },
    { id: 'workers', label: 'Priority Workers', desc: 'Handles channel broker dispatches', type: 'workers' },
    { id: 'retry', label: 'Backoff Engine', desc: 'Exponential Retry and Jitter Controller', type: 'retry' },
    { id: 'dlq', label: 'Dead Letter Vault', desc: 'Failed message tombstone quarantine', type: 'quarantine' }
  ];

  return (
    <div className="space-y-6" id="queues-tab-container">
      {/* Tab Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-900">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <h2 className="text-base font-bold tracking-tight text-white uppercase font-sans">Distributed Queue Manager</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitor, toggle, and maintain independent channel worker buffers, exponential retries, and dead-letter queues.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchQueueStatus}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/80 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            Refresh Buffers
          </button>
          <button
            onClick={() => handleQueueAction('dlq', 'flush_dlq')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold transition-all cursor-pointer shadow-sm shadow-indigo-500/20"
          >
            <Activity className="w-3 h-3" />
            Flush Dead Letters
          </button>
        </div>
      </div>

      {/* Grid Layout: Visual Pipeline and Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Pipeline Engine Visualizer (2/3 Col on desktop) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 pointer-events-none opacity-5">
              <Network className="w-40 h-40 text-indigo-500" />
            </div>

            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest font-mono">Live Engine Telemetry</span>
                <h3 className="text-xs font-bold text-white uppercase tracking-tight mt-0.5">Visual Pipeline Flow</h3>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Ingress
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Process
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Outbox
                </span>
              </div>
            </div>

            {/* Render Horizontal / Flex-based flowchart nodes */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative py-3">
              {/* Node 1: Ingress */}
              <div 
                className={`p-3 rounded-lg border text-left transition-all cursor-pointer select-none ${
                  selectedNode === 'ingress' 
                    ? 'bg-indigo-500/10 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.15)]' 
                    : 'bg-slate-900/30 border-slate-900 hover:border-slate-800'
                }`}
                onClick={() => setSelectedNode(selectedNode === 'ingress' ? null : 'ingress')}
              >
                <div className="flex items-center justify-between">
                  <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[8px] font-mono font-bold">STAGE 1</span>
                  <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <h4 className="text-xs font-bold text-slate-200 mt-2">Ingress API Hub</h4>
                <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">Enterprise-grade endpoints with dynamic Token-Bucket rate limiting.</p>
              </div>

              {/* Node 2: Validation */}
              <div 
                className={`p-3 rounded-lg border text-left transition-all cursor-pointer select-none ${
                  selectedNode === 'validator' 
                    ? 'bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]' 
                    : 'bg-slate-900/30 border-slate-900 hover:border-slate-800'
                }`}
                onClick={() => setSelectedNode(selectedNode === 'validator' ? null : 'validator')}
              >
                <div className="flex items-center justify-between">
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] font-mono font-bold">STAGE 2</span>
                  <Database className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <h4 className="text-xs font-bold text-slate-200 mt-2">Event Validator</h4>
                <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">Ensures variable schema compatibility & logs events dynamically.</p>
              </div>

              {/* Node 3: Hydration */}
              <div 
                className={`p-3 rounded-lg border text-left transition-all cursor-pointer select-none ${
                  selectedNode === 'hydrator' 
                    ? 'bg-amber-500/10 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)]' 
                    : 'bg-slate-900/30 border-slate-900 hover:border-slate-800'
                }`}
                onClick={() => setSelectedNode(selectedNode === 'hydrator' ? null : 'hydrator')}
              >
                <div className="flex items-center justify-between">
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[8px] font-mono font-bold">STAGE 3</span>
                  <Timer className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <h4 className="text-xs font-bold text-slate-200 mt-2">Template Hydrator</h4>
                <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">Merges runtime variables with selected layouts using Handlebars.</p>
              </div>

              {/* Node 4: Dispatcher */}
              <div 
                className={`p-3 rounded-lg border text-left transition-all cursor-pointer select-none ${
                  selectedNode === 'dispatcher' 
                    ? 'bg-rose-500/10 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.15)]' 
                    : 'bg-slate-900/30 border-slate-900 hover:border-slate-800'
                }`}
                onClick={() => setSelectedNode(selectedNode === 'dispatcher' ? null : 'dispatcher')}
              >
                <div className="flex items-center justify-between">
                  <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[8px] font-mono font-bold">STAGE 4</span>
                  <Network className="w-3.5 h-3.5 text-rose-400" />
                </div>
                <h4 className="text-xs font-bold text-slate-200 mt-2">SLA Router Engine</h4>
                <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">Pushes to active multi-channels and tracks gateway priority limits.</p>
              </div>
            </div>

            {/* Pipeline details section based on selection */}
            <AnimatePresence mode="wait">
              {selectedNode ? (
                <motion.div
                  key={selectedNode}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-4 p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 text-xs flex gap-4 items-start"
                >
                  <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
                    <Activity className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h5 className="font-bold text-white capitalize">{selectedNode.replace('_', ' ')} Pipeline Node</h5>
                    <p className="text-slate-400 mt-1 leading-relaxed">
                      {selectedNode === 'ingress' && 'Under high load, ingress leverages the AWS cluster API endpoints. It validates JWT tokens, rate limits IP calls and streams telemetry requests in real-time.'}
                      {selectedNode === 'validator' && 'Matches payload variables against parameters defined inside the global Event Registry. Ensures templates cannot be executed with blank/invalid data.'}
                      {selectedNode === 'hydrator' && 'Merges localization strings, user profiles, and branding configurations. Pre-renders beautiful emails, SMS blocks or JSON structures.'}
                      {selectedNode === 'dispatcher' && 'Dispatches messages to the appropriate outbound worker thread. Tracks average packet round-trips and fallback broker channels dynamically.'}
                    </p>
                    <div className="mt-3 flex items-center gap-3 text-[10px] font-mono text-slate-500">
                      <span>Status: <strong className="text-emerald-400">Fully Compliant</strong></span>
                      <span>•</span>
                      <span>Worker Threads: <strong className="text-slate-300">32 Active</strong></span>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="mt-4 p-4 rounded-xl bg-slate-900/10 border border-dashed border-slate-900 text-center text-slate-500 text-xs">
                  💡 Click any pipeline stage node to explore details about its distributed architecture.
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Buffers State Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Waiting Buffer */}
            <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-900 text-left">
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block">Total Pending Buffer</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold tracking-tight text-white font-mono">
                  {queues.reduce((acc, curr) => acc + (curr.waiting || 0), 0)}
                </span>
                <span className="text-[10px] text-amber-400 font-mono">Messages</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Ready for thread picker dispatch.</p>
            </div>

            {/* Active Workers Thread Pool */}
            <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-900 text-left">
              <span className="text-[9px] font-mono text-indigo-400 uppercase tracking-widest block">Active Channel Workers</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold tracking-tight text-indigo-400 font-mono">
                  {queues.reduce((acc, curr) => acc + (curr.active || 0), 0)}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Concurrent</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Asynchronous payload transmission loops.</p>
            </div>

            {/* Overall Queue Success Rate */}
            <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-900 text-left">
              <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-widest block">SLA Compliance Rate</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold tracking-tight text-emerald-400 font-mono">99.87%</span>
                <span className="text-[10px] text-emerald-400/80 font-mono">SLA Met</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Calculated within 250ms SLA boundaries.</p>
            </div>
          </div>
        </div>

        {/* Channel Buffer Controls (1/3 Col on desktop) */}
        <div className="space-y-4">
          <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              Broker Buffers Control
            </h3>

            <div className="space-y-3.5">
              {queues.map((q) => (
                <div key={q.name} className="p-3 bg-slate-950 rounded-lg border border-slate-900/80 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        q.name === 'dlq' ? 'bg-rose-500' : q.name === 'retry' ? 'bg-amber-400' : 'bg-indigo-400'
                      }`} />
                      <span className="text-xs font-bold uppercase tracking-wide text-slate-200 font-mono">{q.name} buffer</span>
                    </div>
                    {getStatusBadge(q.status)}
                  </div>

                  {/* Meter Bar */}
                  <div className="h-1 bg-slate-900 rounded-full overflow-hidden mt-1">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        q.name === 'dlq' ? 'bg-rose-500' : q.name === 'retry' ? 'bg-amber-400' : 'bg-indigo-500'
                      }`} 
                      style={{ width: `${Math.min(100, ((q.waiting + q.active) / 20) * 100)}%` }}
                    />
                  </div>

                  {/* Buffer detailed info */}
                  <div className="grid grid-cols-4 gap-1 text-center text-[10px] font-mono mt-1 text-slate-400">
                    <div>
                      <span className="text-slate-600 block text-[8px] uppercase">Queued</span>
                      <span className="font-bold text-slate-300">{q.waiting}</span>
                    </div>
                    <div>
                      <span className="text-slate-600 block text-[8px] uppercase">Active</span>
                      <span className="font-bold text-indigo-400">{q.active}</span>
                    </div>
                    <div>
                      <span className="text-slate-600 block text-[8px] uppercase">Done</span>
                      <span className="font-bold text-emerald-500">{q.completed > 1000 ? `${(q.completed/1000).toFixed(1)}k` : q.completed}</span>
                    </div>
                    <div>
                      <span className="text-slate-600 block text-[8px] uppercase">Fail</span>
                      <span className="font-bold text-rose-500">{q.failed}</span>
                    </div>
                  </div>

                  {/* Buffer specific actions */}
                  {canManageQueues ? (
                    <div className="flex items-center justify-end gap-1.5 mt-2 pt-2 border-t border-slate-900/60">
                      {q.status === 'active' ? (
                        <button
                          onClick={() => handleQueueAction(q.name, 'pause')}
                          disabled={actioningQueue === q.name}
                          className="p-1 rounded hover:bg-slate-900 text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
                          title="Pause Queue Processing"
                        >
                          <Pause className="w-3 h-3" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleQueueAction(q.name, 'resume')}
                          disabled={actioningQueue === q.name}
                          className="p-1 rounded hover:bg-slate-900 text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
                          title="Resume Queue Processing"
                        >
                          <Play className="w-3 h-3" />
                        </button>
                      )}

                      <button
                        onClick={() => handleQueueAction(q.name, 'clear')}
                        disabled={actioningQueue === q.name || (q.waiting === 0 && q.active === 0)}
                        className="p-1 rounded hover:bg-slate-900 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer disabled:opacity-30 disabled:hover:text-slate-500"
                        title="Purge Pending Queue Messages"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>

                      {q.name === 'dlq' && (
                        <button
                          onClick={() => handleQueueAction('dlq', 'flush_dlq')}
                          disabled={actioningQueue === q.name}
                          className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[9px] font-bold tracking-wide transition-colors cursor-pointer"
                        >
                          <RefreshCw className="w-2.5 h-2.5" />
                          FLUSH
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="mt-2 pt-2 border-t border-slate-900/60 text-right text-[9px] font-mono text-slate-600 uppercase tracking-wider">
                      READ-ONLY
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Sliders, 
  AlertCircle, 
  CheckCircle, 
  Database, 
  Cpu, 
  Info,
  ChevronRight,
  ArrowRight,
  Search,
  Check
} from 'lucide-react';
import { EventRegistryEntry } from '../types';

interface EventsTabProps {
  token: string;
}

export const EventsTab: React.FC<EventsTabProps> = ({ token }) => {
  const [events, setEvents] = useState<EventRegistryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Registration Form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEvtName, setNewEvtName] = useState('');
  const [newEvtVars, setNewEvtVars] = useState('');
  const [newEvtPriority, setNewEvtPriority] = useState<'low' | 'normal' | 'high' | 'critical'>('normal');
  const [newEvtMaxRetries, setNewEvtMaxRetries] = useState(3);
  const [newEvtBackoff, setNewEvtBackoff] = useState(2);

  // Payload Validator state
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [jsonPayloadInput, setJsonPayloadInput] = useState('{\n  "firstName": "John",\n  "orderNumber": "AA-89210",\n  "deliveryDate": "July 24th"\n}');
  const [validationResult, setValidationResult] = useState<{ status: 'idle' | 'success' | 'error'; message: string }>({ status: 'idle', message: '' });

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/events/registry', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
        if (data.length > 0 && !selectedEventId) {
          setSelectedEventId(data[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleRegisterEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvtName) return;

    const parsedVars = newEvtVars.split(',').map(v => v.trim()).filter(Boolean);
    const retryPolicy = {
      max_retries: newEvtMaxRetries,
      backoff_factor: newEvtBackoff
    };

    try {
      const res = await fetch('/api/events/registry/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newEvtName,
          variables: parsedVars,
          priority: newEvtPriority,
          retryPolicy
        })
      });

      if (res.ok) {
        // Reset state
        setNewEvtName('');
        setNewEvtVars('');
        setNewEvtPriority('normal');
        setNewEvtMaxRetries(3);
        setNewEvtBackoff(2);
        setShowAddForm(false);
        fetchEvents();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRunPayloadValidation = () => {
    if (!selectedEventId) return;
    const activeEvt = events.find(e => e.id === selectedEventId);
    if (!activeEvt) return;

    try {
      const parsedObj = JSON.parse(jsonPayloadInput);
      const missingVars: string[] = [];
      
      activeEvt.variables.forEach(v => {
        if (parsedObj[v] === undefined || parsedObj[v] === null) {
          missingVars.push(v);
        }
      });

      if (missingVars.length > 0) {
        setValidationResult({
          status: 'error',
          message: `Validation failed: Payload missing required template variables: [${missingVars.join(', ')}]`
        });
      } else {
        setValidationResult({
          status: 'success',
          message: 'Validation success! All variables parsed successfully. Schema is compliant for dispatch.'
        });
      }
    } catch (err: any) {
      setValidationResult({
        status: 'error',
        message: `Syntax error: Invalid JSON syntax. ${err.message}`
      });
    }
  };

  const filteredEvents = events.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPriorityColor = (p: 'low' | 'normal' | 'high' | 'critical') => {
    switch (p) {
      case 'critical': return 'bg-rose-500/15 text-rose-400 border-rose-500/20';
      case 'high': return 'bg-amber-500/15 text-amber-400 border-amber-500/20';
      case 'normal': return 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20';
      case 'low': return 'bg-slate-500/15 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="space-y-6" id="events-tab-container">
      {/* Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-900">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-indigo-400" />
            <h2 className="text-base font-bold tracking-tight text-white uppercase font-sans">Ingress Event Schema Registry</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Strictly validate parameters, define custom priority dispatches, and enforce strict backoff schemas across microservices.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddForm(prev => !prev)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold transition-all cursor-pointer shadow-sm shadow-indigo-500/20"
          >
            <Plus className="w-3.5 h-3.5" />
            Register Event
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Event lists and registry */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Collapse Form for registration */}
          <AnimatePresence>
            {showAddForm && (
              <motion.form
                onSubmit={handleRegisterEvent}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-slate-950/50 border border-slate-900 p-5 rounded-xl space-y-4 overflow-hidden"
              >
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-900">
                  <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                  Define Event parameters
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold font-mono text-slate-400 uppercase">Event Trigger Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. user.onboarded"
                      value={newEvtName}
                      onChange={(e) => setNewEvtName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 px-3 py-2 rounded-lg text-xs font-mono placeholder:text-slate-600 text-slate-200 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold font-mono text-slate-400 uppercase">Template Variables (comma-separated)</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. firstName, promoCode, userEmail"
                      value={newEvtVars}
                      onChange={(e) => setNewEvtVars(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 px-3 py-2 rounded-lg text-xs font-mono placeholder:text-slate-600 text-slate-200 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold font-mono text-slate-400 uppercase font-sans">Queue Priority</label>
                    <select
                      value={newEvtPriority}
                      onChange={(e: any) => setNewEvtPriority(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 px-3 py-2 rounded-lg text-xs text-slate-300 focus:outline-none"
                    >
                      <option value="low">Low Priority</option>
                      <option value="normal">Normal Priority</option>
                      <option value="high">High Priority</option>
                      <option value="critical">Critical (Skip Queue)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold font-mono text-slate-400 uppercase">Max Retries</label>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      required
                      value={newEvtMaxRetries}
                      onChange={(e) => setNewEvtMaxRetries(parseInt(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 px-3 py-2 rounded-lg text-xs font-mono text-slate-200 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold font-mono text-slate-400 uppercase">Backoff Factor</label>
                    <input
                      type="number"
                      step="0.1"
                      min={1}
                      max={5}
                      required
                      value={newEvtBackoff}
                      onChange={(e) => setNewEvtBackoff(parseFloat(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 px-3 py-2 rounded-lg text-xs font-mono text-slate-200 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-3 py-1.5 rounded-lg border border-slate-900 hover:bg-slate-900/50 text-slate-400 hover:text-white text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold cursor-pointer shadow-sm shadow-indigo-500/20"
                  >
                    Commit Schema
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Event Search filter */}
          <div className="relative bg-slate-950/40 border border-slate-900 rounded-xl p-3 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Filter registered event schemas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none text-xs w-full text-slate-200 focus:outline-none font-mono"
            />
          </div>

          {/* Events cards container */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredEvents.map((evt) => (
              <div 
                key={evt.id} 
                onClick={() => setSelectedEventId(evt.id)}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative ${
                  selectedEventId === evt.id 
                    ? 'bg-indigo-500/5 border-indigo-500/40 shadow-md' 
                    : 'bg-slate-950/40 border-slate-900 hover:border-slate-800'
                }`}
              >
                {selectedEventId === evt.id && (
                  <span className="absolute top-3 right-3 p-1 rounded-full bg-indigo-500/20 text-indigo-400">
                    <Check className="w-3 h-3" />
                  </span>
                )}

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wider uppercase border ${getPriorityColor(evt.priority as any)}`}>
                      {evt.priority}
                    </span>
                    <span className="text-xs font-bold text-slate-200 font-mono break-all">{evt.name}</span>
                  </div>

                  {/* Variables badges */}
                  <div>
                    <span className="text-[9px] text-slate-500 block uppercase tracking-wider font-mono">Parameters list:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {evt.variables.map((v) => (
                        <span key={v} className="px-1.5 py-0.2 rounded bg-slate-950 border border-slate-900 text-slate-400 text-[9px] font-mono">
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Backoff policy details */}
                  <div className="pt-2 border-t border-slate-900/60 grid grid-cols-2 text-[10px] font-mono text-slate-500">
                    <span>Retry limit: <strong className="text-slate-300">{(evt.retry_policy as any)?.max_retries || 3}x</strong></span>
                    <span>Factor: <strong className="text-slate-300">{(evt.retry_policy as any)?.backoff_factor || 2.0}s</strong></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Col: Schema Payload Testing and JSON validation */}
        <div className="space-y-4">
          <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              Ingress JSON Validator
            </h3>
            <p className="text-[10px] text-slate-400 mb-3 leading-relaxed">
              Ensure microservice dispatches match schema guidelines prior to dispatch transmission.
            </p>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block font-mono">Payload Editor</label>
                <textarea
                  rows={6}
                  value={jsonPayloadInput}
                  onChange={(e) => setJsonPayloadInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-900 focus:border-indigo-500 p-2 rounded-lg text-xs font-mono text-slate-300 focus:outline-none resize-none"
                />
              </div>

              <button
                onClick={handleRunPayloadValidation}
                disabled={!selectedEventId}
                className="w-full py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Validate JSON Body
              </button>

              {/* Dynamic validation results bubble */}
              {validationResult.status !== 'idle' && (
                <div className={`p-3 rounded-lg text-xs leading-relaxed border ${
                  validationResult.status === 'success' 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                }`}>
                  <div className="flex items-start gap-1.5">
                    {validationResult.status === 'success' ? (
                      <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    )}
                    <span className="font-mono text-[10px] font-semibold break-words">{validationResult.message}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SLA Warning */}
          <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-4 flex gap-3 items-start">
            <Info className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
            <p className="text-[10px] text-slate-400 leading-relaxed">
              **Strict Mode Compliance**: Registered events are cached dynamically inside the SLA Router Node in Redis. Events without schemas will default to a broad loose verification standard.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Shield, UserPlus, Trash2, UserCheck, RefreshCw, AlertCircle, Key } from 'lucide-react';

interface UserRecord {
  id: string;
  email: string;
  role_id: string;
  role_name: string;
  created_at: string;
}

interface RoleRecord {
  id: string;
  name: string;
  description: string;
}

interface UsersTabProps {
  token: string;
  currentUser: any;
}

export function UsersTab({ token, currentUser }: UsersTabProps) {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // New User Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState('');

  const fetchRBACData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        fetch('/api/rbac/users', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/rbac/roles', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (!usersRes.ok || !rolesRes.ok) {
        throw new Error('Failed to retrieve RBAC accounts schema data');
      }

      const usersData = await usersRes.json();
      const rolesData = await rolesRes.json();

      setUsers(usersData);
      setRoles(rolesData);
      if (rolesData.length > 0 && !roleId) {
        setRoleId(rolesData[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sync with security access control catalog');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRBACData();
  }, [token]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !roleId) {
      setError('Please fill in all fields to register an enterprise operator');
      return;
    }

    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/rbac/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email, password, role_id: roleId })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to register new operator account');
      }

      setSuccess(`Successfully registered operator "${email}" in identity registry.`);
      setEmail('');
      setPassword('');
      fetchRBACData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteUser = async (id: string, emailStr: string) => {
    if (emailStr === currentUser?.email) {
      setError('Cannot de-register your own active session catalog user');
      return;
    }

    if (!confirm(`Revoke privileges and delete operator account "${emailStr}" permanently?`)) {
      return;
    }

    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/rbac/users/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to delete operator account');
      }

      setSuccess(`Successfully de-registered operator account "${emailStr}".`);
      fetchRBACData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const isAuthorizedToManage = currentUser?.role === 'administrator';

  return (
    <div className="space-y-6" id="users-tab-container">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-900 pb-5">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 font-mono text-xs font-bold uppercase tracking-widest">
            <Shield className="w-3.5 h-3.5" />
            <span>Identity & Access Management (IAM)</span>
          </div>
          <h2 className="text-xl font-extrabold tracking-tight text-white mt-1">Enterprise RBAC Directory</h2>
          <p className="text-xs text-slate-400 mt-1">
            Manage system operators, assign permission-scoped roles, and audit access credentials based on your PostgreSQL database configuration.
          </p>
        </div>
        <button
          onClick={fetchRBACData}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-900 text-xs font-semibold tracking-wide text-slate-300 transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Sync Directory
        </button>
      </div>

      {/* Notifications banner */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3.5 rounded-xl flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs p-3.5 rounded-xl flex items-center gap-2.5">
          <UserCheck className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Add New User */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-slate-950/40 border border-slate-900 rounded-2xl p-5 space-y-4">
            <div className="border-b border-slate-900 pb-3 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Register System Operator</h3>
            </div>

            {isAuthorizedToManage ? (
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="name@auraalert.com"
                    required
                    className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/40 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/40 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Permission Role Mapping</label>
                  <select
                    value={roleId}
                    onChange={e => setRoleId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/40 rounded-xl px-3 py-2 text-xs text-white outline-none transition-all cursor-pointer"
                  >
                    {roles.map(role => (
                      <option key={role.id} value={role.id}>
                        {role.name.toUpperCase()} — {role.description}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-[0_4px_12px_rgba(99,102,241,0.2)] flex items-center justify-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Create Operator
                </button>
              </form>
            ) : (
              <div className="bg-slate-900/30 rounded-xl p-3 border border-slate-800 text-[11px] text-slate-400 leading-relaxed flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Read-Only Mode:</strong> Your current account role (<strong>{currentUser?.role?.toUpperCase()}</strong>) does not hold the <code>MANAGE_APPLICATIONS</code> permission required to register new enterprise operators.
                </span>
              </div>
            )}
          </div>

          {/* Role Privileges Reference */}
          <div className="bg-slate-950/40 border border-slate-900 rounded-2xl p-5 space-y-4">
            <div className="border-b border-slate-900 pb-3 flex items-center gap-2">
              <Key className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Role Privilege Hierarchy</h3>
            </div>
            <div className="space-y-3.5 text-[11px]">
              <div>
                <span className="font-mono font-bold text-indigo-400 block">ADMINISTRATOR</span>
                <span className="text-slate-400 block leading-normal mt-0.5">Bypasses all privilege gates. Authorized to manage users, secrets vault, and tenant control planes.</span>
              </div>
              <div className="border-t border-slate-900 pt-3">
                <span className="font-mono font-bold text-emerald-400 block">OPERATOR</span>
                <span className="text-slate-400 block leading-normal mt-0.5">Authorized to manage providers gateways, edit message templates, trigger queue actions, and register webhook events. No access to secrets vault.</span>
              </div>
              <div className="border-t border-slate-900 pt-3">
                <span className="font-mono font-bold text-slate-400 block">VIEWER</span>
                <span className="text-slate-400 block leading-normal mt-0.5">Read-only monitoring access. Authorized to view telemetry charts, view provider states, and audit streams logger.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Users List */}
        <div className="lg:col-span-2">
          <div className="bg-slate-950/40 border border-slate-900 rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-900 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Active Credentials Catalog ({users.length})</h3>
              <span className="text-[10px] font-mono text-slate-500">DATABASE_SOURCE: PG_TRUE</span>
            </div>

            {loading && users.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
                Synchronizing security ledger...
              </div>
            ) : (
              <div className="divide-y divide-slate-900">
                {users.map(u => (
                  <div key={u.id} className="p-4 flex items-center justify-between hover:bg-slate-900/10 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-200">{u.email}</span>
                        {u.email === currentUser?.email && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded font-mono">
                            YOU
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-[10px] text-slate-500 font-mono">
                        <span>ID: {u.id}</span>
                        <span>Registered: {new Date(u.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider font-mono border ${
                        u.role_name === 'administrator' 
                          ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/25'
                          : u.role_name === 'operator'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        {u.role_name}
                      </span>

                      {isAuthorizedToManage && u.email !== currentUser?.email && (
                        <button
                          onClick={() => handleDeleteUser(u.id, u.email)}
                          className="text-slate-500 hover:text-rose-400 p-1.5 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Revoke Access"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {users.length === 0 && (
                  <div className="p-8 text-center text-xs text-slate-500">
                    No registered operator users found.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

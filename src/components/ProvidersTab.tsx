import React, { useState } from 'react';
import { Plus, Trash2, Edit2, ShieldAlert, CheckCircle, Network, RefreshCw, Key, ToggleLeft, ToggleRight, ExternalLink, Globe, Server, Settings, Cpu, Mail } from 'lucide-react';
import { Provider } from '../types';

interface ProvidersTabProps {
  providers: Provider[];
  onAddProvider: (name: string, channel: 'email' | 'sms' | 'whatsapp' | 'in_app', config: Record<string, any>, priority: number, is_active: boolean) => Promise<void>;
  onDeleteProvider: (id: string) => Promise<void>;
  onUpdateProvider: (id: string, name: string, channel: 'email' | 'sms' | 'whatsapp' | 'in_app', config: Record<string, any>, priority: number, is_active: boolean, health_status: 'healthy' | 'degraded' | 'unreachable') => Promise<void>;
  onToggleActive: (id: string, is_active: boolean, channel: string) => Promise<void>;
  token: string;
  hasPermission?: (permCode: string) => boolean;
}

export function ProvidersTab({ providers, onAddProvider, onDeleteProvider, onUpdateProvider, onToggleActive, token, hasPermission }: ProvidersTabProps) {
  const canManage = hasPermission ? hasPermission('MANAGE_PROVIDERS') : true;
  // Common state
  const [name, setName] = useState('');
  const [channel, setChannel] = useState<'email' | 'sms' | 'whatsapp' | 'in_app'>('email');
  const [providerType, setProviderType] = useState<string>('smtp');
  const [priority, setPriority] = useState(1);
  const [isActive, setIsActive] = useState(false);

  // SMTP config states
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpSender, setSmtpSender] = useState('');
  const [smtpUsername, setSmtpUsername] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');

  // Brevo config states
  const [brevoApiKey, setBrevoApiKey] = useState('');
  const [brevoSenderEmail, setBrevoSenderEmail] = useState('');
  const [brevoSenderName, setBrevoSenderName] = useState('');

  // Mailgun config states
  const [mailgunApiKey, setMailgunApiKey] = useState('');
  const [mailgunDomain, setMailgunDomain] = useState('');
  const [mailgunRegion, setMailgunRegion] = useState('US');

  // Postmark config states
  const [postmarkToken, setPostmarkToken] = useState('');
  const [postmarkSender, setPostmarkSender] = useState('');

  // Twilio SMS config states
  const [smsSid, setSmsSid] = useState('');
  const [smsToken, setSmsToken] = useState('');
  const [smsFrom, setSmsFrom] = useState('');

  // Termii config states
  const [termiiApiKey, setTermiiApiKey] = useState('');
  const [termiiSenderId, setTermiiSenderId] = useState('');
  const [termiiBaseUrl, setTermiiBaseUrl] = useState('https://api.ng.termii.com');

  // Ringo config states
  const [ringoApiKey, setRingoApiKey] = useState('');
  const [ringoSenderId, setRingoSenderId] = useState('');
  const [ringoUsername, setRingoUsername] = useState('');

  // MessageBird config states
  const [mbApiKey, setMbApiKey] = useState('');
  const [mbSenderName, setMbSenderName] = useState('');

  // Custom HTTP SMS config states
  const [httpUrl, setHttpUrl] = useState('');
  const [httpMethod, setHttpMethod] = useState('POST');
  const [httpHeaders, setHttpHeaders] = useState('{"Content-Type": "application/json"}');
  const [httpBody, setHttpBody] = useState('{"to": "{{recipient}}", "message": "{{message}}"}');

  // Twilio WhatsApp config states
  const [waSid, setWaSid] = useState('');
  const [waToken, setWaToken] = useState('');
  const [waFrom, setWaFrom] = useState('');

  // Meta WhatsApp config states
  const [metaPhoneId, setMetaPhoneId] = useState('');
  const [metaToken, setMetaToken] = useState('');
  const [metaWabaId, setMetaWabaId] = useState('');

  // Custom WhatsApp config states
  const [waUrl, setWaUrl] = useState('');
  const [waMethod, setWaMethod] = useState('POST');
  const [waAuthHeader, setWaAuthHeader] = useState('');

  // AWS SES states
  const [sesAccessKey, setSesAccessKey] = useState('');
  const [sesSecretKey, setSesSecretKey] = useState('');
  const [sesRegion, setSesRegion] = useState('us-east-1');
  const [sesSender, setSesSender] = useState('');

  // Generic provider states (covers all other 15+ providers!)
  const [genericApiKey, setGenericApiKey] = useState('');
  const [genericEndpoint, setGenericEndpoint] = useState('');
  const [genericSender, setGenericSender] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Diagnostic states
  const [testingId, setTestingId] = useState<string | null>(null);
  const [diagnosticsResult, setDiagnosticsResult] = useState<any>(null);

  const handleChannelChange = (val: 'email' | 'sms' | 'whatsapp' | 'in_app') => {
    setChannel(val);
    if (val === 'email') setProviderType('smtp');
    else if (val === 'sms') setProviderType('twilio');
    else if (val === 'whatsapp') setProviderType('twilio_wa');
    else if (val === 'in_app') setProviderType('websocket');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);

    // Resolve credentials config
    let config: Record<string, any> = { providerType };

    if (channel === 'email') {
      if (providerType === 'smtp') {
        config = { ...config, host: smtpHost, port: Number(smtpPort), sender: smtpSender, username: smtpUsername, password: smtpPassword };
      } else if (providerType === 'brevo') {
        config = { ...config, apiKey: brevoApiKey, senderEmail: brevoSenderEmail, senderName: brevoSenderName };
      } else if (providerType === 'mailgun') {
        config = { ...config, apiKey: mailgunApiKey, domain: mailgunDomain, region: mailgunRegion };
      } else if (providerType === 'postmark') {
        config = { ...config, serverToken: postmarkToken, senderEmail: postmarkSender };
      } else if (providerType === 'ses') {
        config = { ...config, accessKeyId: sesAccessKey, secretAccessKey: sesSecretKey, region: sesRegion, senderEmail: sesSender };
      } else {
        config = { ...config, apiKey: genericApiKey, endpoint: genericEndpoint, senderEmail: genericSender };
      }
    } else if (channel === 'sms') {
      if (providerType === 'twilio') {
        config = { ...config, accountSid: smsSid, token: smsToken, fromNumber: smsFrom };
      } else if (providerType === 'termii') {
        config = { ...config, apiKey: termiiApiKey, senderId: termiiSenderId, baseUrl: termiiBaseUrl };
      } else if (providerType === 'ringo') {
        config = { ...config, apiKey: ringoApiKey, senderId: ringoSenderId, username: ringoUsername };
      } else if (providerType === 'messagebird') {
        config = { ...config, apiKey: mbApiKey, senderName: mbSenderName };
      } else if (providerType === 'custom_http') {
        config = { ...config, url: httpUrl, method: httpMethod, headers: httpHeaders, bodyTemplate: httpBody };
      } else {
        config = { ...config, apiKey: genericApiKey, endpoint: genericEndpoint, senderId: genericSender };
      }
    } else if (channel === 'whatsapp') {
      if (providerType === 'twilio_wa') {
        config = { ...config, accountSid: waSid, token: waToken, fromWhatsApp: waFrom };
      } else if (providerType === 'meta_wa') {
        config = { ...config, phoneNumberId: metaPhoneId, accessToken: metaToken, wabaId: metaWabaId };
      } else if (providerType === 'custom_wa') {
        config = { ...config, url: waUrl, method: waMethod, authHeader: waAuthHeader };
      }
    } else {
      config = { providerType: 'websocket', maxHistory: 100 };
    }

    try {
      if (editingId) {
        const existing = providers.find(p => p.id === editingId);
        await onUpdateProvider(
          editingId,
          name,
          channel,
          config,
          priority,
          isActive,
          existing ? existing.health_status : 'healthy'
        );
        setEditingId(null);
      } else {
        await onAddProvider(name, channel, config, priority, isActive);
      }
      resetForm();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (p: Provider) => {
    setEditingId(p.id);
    setName(p.name);
    setChannel(p.channel);
    setPriority(p.priority);
    setIsActive(p.is_active);

    const config = p.config || {};
    const pType = config.providerType || (p.channel === 'email' ? 'smtp' : p.channel === 'sms' ? 'twilio' : p.channel === 'whatsapp' ? 'twilio_wa' : 'websocket');
    setProviderType(pType);

    if (p.channel === 'email') {
      if (pType === 'smtp') {
        setSmtpHost(config.host || '');
        setSmtpPort(config.port || 587);
        setSmtpSender(config.sender || '');
        setSmtpUsername(config.username || '');
        setSmtpPassword(config.password || '');
      } else if (pType === 'brevo') {
        setBrevoApiKey(config.apiKey || '');
        setBrevoSenderEmail(config.senderEmail || '');
        setBrevoSenderName(config.senderName || '');
      } else if (pType === 'mailgun') {
        setMailgunApiKey(config.apiKey || '');
        setMailgunDomain(config.domain || '');
        setMailgunRegion(config.region || 'US');
      } else if (pType === 'postmark') {
        setPostmarkToken(config.serverToken || '');
        setPostmarkSender(config.senderEmail || '');
      } else if (pType === 'ses') {
        setSesAccessKey(config.accessKeyId || '');
        setSesSecretKey(config.secretAccessKey || '');
        setSesRegion(config.region || 'us-east-1');
        setSesSender(config.senderEmail || '');
      } else {
        setGenericApiKey(config.apiKey || '');
        setGenericEndpoint(config.endpoint || '');
        setGenericSender(config.senderEmail || '');
      }
    } else if (p.channel === 'sms') {
      if (pType === 'twilio') {
        setSmsSid(config.accountSid || '');
        setSmsToken(config.token || '');
        setSmsFrom(config.fromNumber || '');
      } else if (pType === 'termii') {
        setTermiiApiKey(config.apiKey || '');
        setTermiiSenderId(config.senderId || '');
        setTermiiBaseUrl(config.baseUrl || 'https://api.ng.termii.com');
      } else if (pType === 'ringo') {
        setRingoApiKey(config.apiKey || '');
        setRingoSenderId(config.senderId || '');
        setRingoUsername(config.username || '');
      } else if (pType === 'messagebird') {
        setMbApiKey(config.apiKey || '');
        setMbSenderName(config.senderName || '');
      } else if (pType === 'custom_http') {
        setHttpUrl(config.url || '');
        setHttpMethod(config.method || 'POST');
        setHttpHeaders(config.headers || '{"Content-Type": "application/json"}');
        setHttpBody(config.bodyTemplate || '{"to": "{{recipient}}", "message": "{{message}}"}');
      } else {
        setGenericApiKey(config.apiKey || '');
        setGenericEndpoint(config.endpoint || '');
        setGenericSender(config.senderId || '');
      }
    } else if (p.channel === 'whatsapp') {
      if (pType === 'twilio_wa') {
        setWaSid(config.accountSid || '');
        setWaToken(config.token || '');
        setWaFrom(config.fromWhatsApp || '');
      } else if (pType === 'meta_wa') {
        setMetaPhoneId(config.phoneNumberId || '');
        setMetaToken(config.accessToken || '');
        setMetaWabaId(config.wabaId || '');
      } else if (pType === 'custom_wa') {
        setWaUrl(config.url || '');
        setWaMethod(config.method || 'POST');
        setWaAuthHeader(config.authHeader || '');
      }
    }
  };

  const resetForm = () => {
    setName('');
    setChannel('email');
    setProviderType('smtp');
    setPriority(1);
    setIsActive(false);

    setSmtpHost('');
    setSmtpPort(587);
    setSmtpSender('');
    setSmtpUsername('');
    setSmtpPassword('');

    setBrevoApiKey('');
    setBrevoSenderEmail('');
    setBrevoSenderName('');

    setMailgunApiKey('');
    setMailgunDomain('');
    setMailgunRegion('US');

    setPostmarkToken('');
    setPostmarkSender('');

    setSmsSid('');
    setSmsToken('');
    setSmsFrom('');

    setTermiiApiKey('');
    setTermiiSenderId('');
    setTermiiBaseUrl('https://api.ng.termii.com');

    setRingoApiKey('');
    setRingoSenderId('');
    setRingoUsername('');

    setMbApiKey('');
    setMbSenderName('');

    setHttpUrl('');
    setHttpMethod('POST');
    setHttpHeaders('{"Content-Type": "application/json"}');
    setHttpBody('{"to": "{{recipient}}", "message": "{{message}}"}');

    setWaSid('');
    setWaToken('');
    setWaFrom('');

    setMetaPhoneId('');
    setMetaToken('');
    setMetaWabaId('');

    setWaUrl('');
    setWaMethod('POST');
    setWaAuthHeader('');

    setSesAccessKey('');
    setSesSecretKey('');
    setSesRegion('us-east-1');
    setSesSender('');

    setGenericApiKey('');
    setGenericEndpoint('');
    setGenericSender('');

    setEditingId(null);
  };

  const handleRunDiagnostics = async (id: string) => {
    setTestingId(id);
    setDiagnosticsResult(null);

    try {
      const response = await fetch(`/api/providers/${id}/diagnostics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setDiagnosticsResult(data);
    } catch (err) {
      setDiagnosticsResult({
        success: false,
        error: 'Diagnostics handshake timed out.',
        timestamp: new Date().toISOString()
      });
    } finally {
      setTestingId(null);
    }
  };

  // Human friendly provider brand names
  const getProviderBrandName = (type: string) => {
    const brands: Record<string, string> = {
      smtp: 'Custom SMTP Server Relay',
      brevo: 'Brevo API Engine',
      mailgun: 'Mailgun Cloud API',
      postmark: 'Postmark Relay SDK',
      ses: 'Amazon SES Email Gateway',
      sendgrid: 'SendGrid Enterprise Cloud',
      resend: 'Resend Developer API',
      sparkpost: 'SparkPost Cloud Engine',
      elastic_email: 'Elastic Email Core SMTP',
      mailerlite: 'MailerLite API Relay',
      
      twilio: 'Twilio SMS Core API',
      termii: 'Termii Carrier Hub (Africa)',
      ringo: 'Ringo Global Gateway (Nigeria)',
      messagebird: 'MessageBird Carrier (Global)',
      africastalking: 'Africa\'s Talking API (Africa)',
      infobip: 'Infobip Carrier Gateway (Global)',
      plivo: 'Plivo Bulk SMS Gateway',
      vonage: 'Vonage / Nexmo SMS API',
      sendchamp: 'Sendchamp API Engine (Africa)',
      hubtel: 'Hubtel SMS Relay (Ghana/Africa)',
      mtn: 'MTN Bulk SMS Gateway (Nigeria)',
      airtel: 'Airtel Carrier Bulk SMS',
      sinch: 'Sinch Messaging API',
      clickatell: 'Clickatell Global SMS Platform',
      custom_http: 'Custom Webhook HTTP Relay',

      twilio_wa: 'Twilio WhatsApp Sandbox',
      meta_wa: 'Meta Business Cloud API',
      custom_wa: 'Custom WhatsApp API Hook',
      websocket: 'AuraAlert Live WebSocket'
    };
    return brands[type] || type.toUpperCase();
  };

  return (
    <div className="space-y-4 font-sans text-slate-200">
      <div className="border-b border-slate-900 pb-4">
        <h2 className="text-base font-bold text-white uppercase tracking-tight flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          Universal Gateway Orchestration
        </h2>
        <p className="text-slate-400 text-xs mt-0.5">
          Decoupled message routing plane. Register any carrier provider (Twilio, Termii, Ringo, SMTP, Custom APIs) universally.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Configuration Form */}
        <div className="bg-slate-950/40 border border-slate-900 rounded-lg p-3.5 h-fit shadow-sm">
          <h3 className="text-xs font-bold text-slate-300 mb-3 flex items-center gap-2 uppercase tracking-wide border-b border-slate-900 pb-2">
            <Plus className="w-3.5 h-3.5 text-indigo-400" />
            {editingId ? 'Modify Provider Relay' : 'Register Carrier Engine'}
          </h3>

          {canManage ? (
            <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Gateway Hub Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Termii West Africa Route"
                className="w-full bg-slate-950 border border-slate-900 rounded-md px-3 py-1.5 text-xs text-white placeholder-slate-700 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Channel</label>
                <select
                  value={channel}
                  onChange={(e) => handleChannelChange(e.target.value as any)}
                  disabled={!!editingId}
                  className="w-full bg-slate-950 border border-slate-900 rounded-md px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                >
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="in_app">In-App</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Routing Engine</label>
                <select
                  value={providerType}
                  onChange={(e) => setProviderType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-900 rounded-md px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {channel === 'email' && (
                    <>
                      <option value="smtp">Custom SMTP Server</option>
                      <option value="brevo">Brevo API Gateway</option>
                      <option value="mailgun">Mailgun Cloud API</option>
                      <option value="postmark">Postmark Transactional</option>
                      <option value="ses">Amazon SES Gateway</option>
                      <option value="sendgrid">SendGrid SMTP / API</option>
                      <option value="resend">Resend Developer API</option>
                      <option value="sparkpost">SparkPost Enterprise</option>
                      <option value="elastic_email">Elastic Email SMTP</option>
                      <option value="mailerlite">MailerLite Bulk API</option>
                    </>
                  )}
                  {channel === 'sms' && (
                    <>
                      <option value="twilio">Twilio SMS Trunk</option>
                      <option value="termii">Termii SMS (Africa)</option>
                      <option value="ringo">Ringo Carrier (Nigeria)</option>
                      <option value="messagebird">MessageBird Carrier</option>
                      <option value="africastalking">Africa's Talking (Africa)</option>
                      <option value="infobip">Infobip Global API</option>
                      <option value="plivo">Plivo Bulk SMS</option>
                      <option value="vonage">Vonage / Nexmo API</option>
                      <option value="sendchamp">Sendchamp Hub (Africa)</option>
                      <option value="hubtel">Hubtel SMS (Ghana)</option>
                      <option value="mtn">MTN Business Gateway (Nigeria)</option>
                      <option value="airtel">Airtel Bulk SMS (Nigeria)</option>
                      <option value="sinch">Sinch Messaging API</option>
                      <option value="clickatell">Clickatell Platform</option>
                      <option value="custom_http">Universal HTTP Endpoint</option>
                    </>
                  )}
                  {channel === 'whatsapp' && (
                    <>
                      <option value="twilio_wa">Twilio Business WA</option>
                      <option value="meta_wa">Meta Cloud WA API</option>
                      <option value="custom_wa">Custom API Hook</option>
                    </>
                  )}
                  {channel === 'in_app' && (
                    <>
                      <option value="websocket">Live WebSocket Hub</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Priority Order</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={10}
                  value={priority}
                  onChange={(e) => setPriority(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-900 rounded-md px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-5">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-slate-800 text-indigo-500 focus:ring-0 focus:ring-offset-0 bg-slate-950"
                />
                <label htmlFor="is_active" className="text-slate-300 text-xs select-none">Set active Route</label>
              </div>
            </div>

            {/* Dynamic Adapter Fields */}
            <div className="space-y-3 pt-2.5 border-t border-slate-900/60">
              <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-400 block">
                {getProviderBrandName(providerType)} Parameters
              </span>

              {/* SMTP */}
              {providerType === 'smtp' && (
                <>
                  <div>
                    <label className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-1">SMTP Host</label>
                    <input
                      type="text"
                      required
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                      placeholder="smtp.mailgun.org"
                      className="w-full bg-slate-950 border border-slate-900 rounded-md px-3 py-1.5 text-xs text-white placeholder-slate-800 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-1">Port</label>
                      <input
                        type="number"
                        required
                        value={smtpPort}
                        onChange={(e) => setSmtpPort(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-900 rounded-md px-3 py-1.5 text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-1">Sender Address</label>
                      <input
                        type="text"
                        required
                        value={smtpSender}
                        onChange={(e) => setSmtpSender(e.target.value)}
                        placeholder="noreply@domain.com"
                        className="w-full bg-slate-950 border border-slate-900 rounded-md px-3 py-1.5 text-xs text-white placeholder-slate-800 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-1">SMTP Username</label>
                      <input
                        type="text"
                        value={smtpUsername}
                        onChange={(e) => setSmtpUsername(e.target.value)}
                        placeholder="smtp-user"
                        className="w-full bg-slate-950 border border-slate-900 rounded-md px-3 py-1.5 text-xs text-white placeholder-slate-800 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-1">SMTP Password</label>
                      <input
                        type="password"
                        value={smtpPassword}
                        onChange={(e) => setSmtpPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full bg-slate-950 border border-slate-900 rounded-md px-3 py-1.5 text-xs text-white placeholder-slate-800 focus:outline-none"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Amazon SES */}
              {providerType === 'ses' && (
                <>
                  <div>
                    <label className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-1">AWS Access Key ID</label>
                    <input
                      type="text"
                      required
                      value={sesAccessKey}
                      onChange={(e) => setSesAccessKey(e.target.value)}
                      placeholder="AKIA..."
                      className="w-full bg-slate-950 border border-slate-900 rounded-md px-3 py-1.5 text-xs text-white placeholder-slate-800 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-1">AWS Secret Access Key</label>
                    <input
                      type="password"
                      required
                      value={sesSecretKey}
                      onChange={(e) => setSesSecretKey(e.target.value)}
                      placeholder="AWS Secret Key"
                      className="w-full bg-slate-950 border border-slate-900 rounded-md px-3 py-1.5 text-xs text-white placeholder-slate-800 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-1">AWS Region</label>
                      <input
                        type="text"
                        required
                        value={sesRegion}
                        onChange={(e) => setSesRegion(e.target.value)}
                        placeholder="us-east-1"
                        className="w-full bg-slate-950 border border-slate-900 rounded-md px-3 py-1.5 text-xs text-white placeholder-slate-800 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-1">Verified Sender Address</label>
                      <input
                        type="email"
                        required
                        value={sesSender}
                        onChange={(e) => setSesSender(e.target.value)}
                        placeholder="verified@company.com"
                        className="w-full bg-slate-950 border border-slate-900 rounded-md px-3 py-1.5 text-xs text-white placeholder-slate-800 focus:outline-none"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Generic API Email Providers */}
              {['sendgrid', 'resend', 'sparkpost', 'elastic_email', 'mailerlite'].includes(providerType) && (
                <>
                  <div>
                    <label className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-1">Private API Key / Secret Token</label>
                    <input
                      type="password"
                      required
                      value={genericApiKey}
                      onChange={(e) => setGenericApiKey(e.target.value)}
                      placeholder="API Token value"
                      className="w-full bg-slate-950 border border-slate-900 rounded-md px-3 py-1.5 text-xs text-white placeholder-slate-800 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-1">Base Endpoint (Optional)</label>
                      <input
                        type="text"
                        value={genericEndpoint}
                        onChange={(e) => setGenericEndpoint(e.target.value)}
                        placeholder="https://api.provider.com/v1"
                        className="w-full bg-slate-950 border border-slate-900 rounded-md px-3 py-1.5 text-xs text-white placeholder-slate-800 focus:outline-none text-[10px]"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-1">Sender Email</label>
                      <input
                        type="email"
                        required
                        value={genericSender}
                        onChange={(e) => setGenericSender(e.target.value)}
                        placeholder="alerts@domain.com"
                        className="w-full bg-slate-950 border border-slate-900 rounded-md px-3 py-1.5 text-xs text-white placeholder-slate-800 focus:outline-none"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Brevo */}
              {providerType === 'brevo' && (
                <>
                  <div>
                    <label className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-1">API Key</label>
                    <input
                      type="password"
                      required
                      value={brevoApiKey}
                      onChange={(e) => setBrevoApiKey(e.target.value)}
                      placeholder="xkeysib-..."
                      className="w-full bg-slate-950 border border-slate-900 rounded-md px-3 py-1.5 text-xs text-white placeholder-slate-800 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-1">Sender Email</label>
                      <input
                        type="email"
                        required
                        value={brevoSenderEmail}
                        onChange={(e) => setBrevoSenderEmail(e.target.value)}
                        placeholder="alerts@company.com"
                        className="w-full bg-slate-950 border border-slate-900 rounded-md px-3 py-1.5 text-xs text-white placeholder-slate-800 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-1">Sender Name</label>
                      <input
                        type="text"
                        required
                        value={brevoSenderName}
                        onChange={(e) => setBrevoSenderName(e.target.value)}
                        placeholder="AuraAlert Notify"
                        className="w-full bg-slate-950 border border-slate-900 rounded-md px-3 py-1.5 text-xs text-white placeholder-slate-800 focus:outline-none"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Mailgun */}
              {providerType === 'mailgun' && (
                <>
                  <div>
                    <label className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-1">Private API Key</label>
                    <input
                      type="password"
                      required
                      value={mailgunApiKey}
                      onChange={(e) => setMailgunApiKey(e.target.value)}
                      placeholder="key-..."
                      className="w-full bg-slate-950 border border-slate-900 rounded-md px-3 py-1.5 text-xs text-white placeholder-slate-800 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-1">Domain Name</label>
                      <input
                        type="text"
                        required
                        value={mailgunDomain}
                        onChange={(e) => setMailgunDomain(e.target.value)}
                        placeholder="mg.company.com"
                        className="w-full bg-slate-950 border border-slate-900 rounded-md px-3 py-1.5 text-xs text-white placeholder-slate-800 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-1">Server Region</label>
                      <select
                        value={mailgunRegion}
                        onChange={(e) => setMailgunRegion(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-900 rounded-md px-2 py-1.5 text-xs text-white focus:outline-none"
                      >
                        <option value="US">United States (US)</option>
                        <option value="EU">Europe Union (EU)</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* Postmark */}
              {providerType === 'postmark' && (
                <>
                  <div>
                    <label className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-1">Server API Token</label>
                    <input
                      type="password"
                      required
                      value={postmarkToken}
                      onChange={(e) => setPostmarkToken(e.target.value)}
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                      className="w-full bg-slate-950 border border-slate-900 rounded-md px-3 py-1.5 text-xs text-white placeholder-slate-800 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-1">Verified Sender Signature</label>
                    <input
                      type="email"
                      required
                      value={postmarkSender}
                      onChange={(e) => setPostmarkSender(e.target.value)}
                      placeholder="transactions@company.com"
                      className="w-full bg-slate-950 border border-slate-900 rounded-md px-3 py-1.5 text-xs text-white placeholder-slate-800 focus:outline-none"
                    />
                  </div>
                </>
              )}

              {/* Twilio SMS */}
              {providerType === 'twilio' && (
                <>
                  <div>
                    <label className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-1">Account SID</label>
                    <input
                      type="text"
                      required
                      value={smsSid}
                      onChange={(e) => setSmsSid(e.target.value)}
                      placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full bg-slate-950 border border-slate-900 rounded-md px-3 py-1.5 text-xs text-white placeholder-slate-800 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-1">Auth Token</label>
                    <input
                      type="password"
                      required
                      value={smsToken}
                      onChange={(e) => setSmsToken(e.target.value)}
                      placeholder="Auth Token Value"
                      className="w-full bg-slate-950 border border-slate-900 rounded-md px-3 py-1.5 text-xs text-white placeholder-slate-800 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-1">From Trunk Phone Number</label>
                    <input
                      type="text"
                      required
                      value={smsFrom}
                      onChange={(e) => setSmsFrom(e.target.value)}
                      placeholder="+15550199"
                      className="w-full bg-slate-950 border border-slate-900 rounded-md px-3 py-1.5 text-xs text-white placeholder-slate-800 focus:outline-none"
                    />
                  </div>
                </>
              )}

              {/* Generic SMS Providers */}
              {['africastalking', 'infobip', 'plivo', 'vonage', 'sendchamp', 'hubtel', 'mtn', 'airtel', 'sinch', 'clickatell'].includes(providerType) && (
                <>
                  <div>
                    <label className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-1">Carrier API Secret Key</label>
                    <input
                      type="password"
                      required
                      value={genericApiKey}
                      onChange={(e) => setGenericApiKey(e.target.value)}
                      placeholder="API secret key value"
                      className="w-full bg-slate-950 border border-slate-900 rounded-md px-3 py-1.5 text-xs text-white placeholder-slate-800 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-1">Routing Base URL</label>
                      <input
                        type="text"
                        value={genericEndpoint}
                        onChange={(e) => setGenericEndpoint(e.target.value)}
                        placeholder="https://api.carrier.com"
                        className="w-full bg-slate-950 border border-slate-900 rounded-md px-3 py-1.5 text-xs text-white placeholder-slate-800 focus:outline-none text-[10px]"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-1">Sender ID / From Number</label>
                      <input
                        type="text"
                        required
                        value={genericSender}
                        onChange={(e) => setGenericSender(e.target.value)}
                        placeholder="e.g. S-ALERT or +234..."
                        className="w-full bg-slate-950 border border-slate-900 rounded-md px-3 py-1.5 text-xs text-white placeholder-slate-800 focus:outline-none"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Termii SMS */}
              {providerType === 'termii' && (
                <>
                  <div>
                    <label className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-1">Termii Secret API Key</label>
                    <input
                      type="password"
                      required
                      value={termiiApiKey}
                      onChange={(e) => setTermiiApiKey(e.target.value)}
                      placeholder="tl_xxxxxxxxxxxxxxxxxxx..."
                      className="w-full bg-slate-950 border border-slate-900 rounded-md px-3 py-1.5 text-xs text-white placeholder-slate-800 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-1">Sender Sender ID</label>
                      <input
                        type="text"
                        required
                        value={termiiSenderId}
                        onChange={(e) => setTermiiSenderId(e.target.value)}
                        placeholder="N-ALERT"
                        className="w-full bg-slate-950 border border-slate-900 rounded-md px-3 py-1.5 text-xs text-white placeholder-slate-800 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-1">Gateway Endpoint</label>
                      <input
                        type="text"
                        required
                        value={termiiBaseUrl}
                        onChange={(e) => setTermiiBaseUrl(e.target.value)}
                        placeholder="https://api.ng.termii.com"
                        className="w-full bg-slate-950 border border-slate-900 rounded-md px-3 py-1.5 text-xs text-white placeholder-slate-800 focus:outline-none text-[10px]"
                      />
                    </div>
                  </div>
                  <p className="text-[9px] text-slate-500 leading-tight">Default is standard Nigerian & international Termii endpoint. Highly recommended for bulk SMS across Africa.</p>
                </>
              )}

              {/* Ringo SMS */}
              {providerType === 'ringo' && (
                <>
                  <div>
                    <label className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-1">Ringo Account API Key</label>
                    <input
                      type="password"
                      required
                      value={ringoApiKey}
                      onChange={(e) => setRingoApiKey(e.target.value)}
                      placeholder="rg_key_xxxxxxxxxxxxx..."
                      className="w-full bg-slate-950 border border-slate-900 rounded-md px-3 py-1.5 text-xs text-white placeholder-slate-800 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-1">Sender Alphanumeric ID</label>
                      <input
                        type="text"
                        required
                        value={ringoSenderId}
                        onChange={(e) => setRingoSenderId(e.target.value)}
                        placeholder="RINGO_SMS"
                        className="w-full bg-slate-950 border border-slate-900 rounded-md px-3 py-1.5 text-xs text-white placeholder-slate-800 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-1">Username / Account ID</label>
                      <input
                        type="text"
                        required
                        value={ringoUsername}
                        onChange={(e) => setRingoUsername(e.target.value)}
                        placeholder="ringo_user_99"
                        className="w-full bg-slate-950 border border-slate-900 rounded-md px-3 py-1.5 text-xs text-white placeholder-slate-800 focus:outline-none"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* MessageBird */}
              {providerType === 'messagebird' && (
                <>
                  <div>
                    <label className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-1">Access Key</label>
                    <input
                      type="password"
                      required
                      value={mbApiKey}
                      onChange={(e) => setMbApiKey(e.target.value)}
                      placeholder="Access Token Value"
                      className="w-full bg-slate-950 border border-slate-900 rounded-md px-3 py-1.5 text-xs text-white placeholder-slate-800 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-1">Sender Display Name</label>
                    <input
                      type="text"
                      required
                      value={mbSenderName}
                      onChange={(e) => setMbSenderName(e.target.value)}
                      placeholder="MessageBird"
                      className="w-full bg-slate-950 border border-slate-900 rounded-md px-3 py-1.5 text-xs text-white placeholder-slate-800 focus:outline-none"
                    />
                  </div>
                </>
              )}

              {/* Custom HTTP Gateways */}
              {providerType === 'custom_http' && (
                <>
                  <div>
                    <label className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-1">HTTP Router URL Endpoint</label>
                    <input
                      type="text"
                      required
                      value={httpUrl}
                      onChange={(e) => setHttpUrl(e.target.value)}
                      placeholder="https://api.mycarrier.com/v1/sms/send"
                      className="w-full bg-slate-950 border border-slate-900 rounded-md px-3 py-1.5 text-xs text-white placeholder-slate-800 focus:outline-none text-[10px]"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-1">
                      <label className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-1">Method</label>
                      <select
                        value={httpMethod}
                        onChange={(e) => setHttpMethod(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-900 rounded-md px-2 py-1.5 text-xs text-white focus:outline-none"
                      >
                        <option value="POST">POST</option>
                        <option value="GET">GET</option>
                        <option value="PUT">PUT</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-1">Headers (JSON)</label>
                      <input
                        type="text"
                        value={httpHeaders}
                        onChange={(e) => setHttpHeaders(e.target.value)}
                        placeholder='{"Authorization": "Bearer key"}'
                        className="w-full bg-slate-950 border border-slate-900 rounded-md px-3 py-1.5 text-xs text-white placeholder-slate-800 focus:outline-none text-[10px]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-1">Body Template / Query Params</label>
                    <textarea
                      rows={2}
                      value={httpBody}
                      onChange={(e) => setHttpBody(e.target.value)}
                      placeholder='{"recipient": "{{recipient}}", "message": "{{message}}"}'
                      className="w-full bg-slate-950 border border-slate-900 rounded-md px-3 py-1 text-xs text-white placeholder-slate-800 focus:outline-none font-mono text-[10px] leading-snug"
                    />
                    <p className="text-[8px] text-slate-500 mt-0.5 leading-snug">
                      Supports mustache placeholders like <span className="text-indigo-400 font-mono">{"{{recipient}}"}</span> and <span className="text-indigo-400 font-mono">{"{{message}}"}</span>.
                    </p>
                  </div>
                </>
              )}

              {/* Twilio WhatsApp */}
              {providerType === 'twilio_wa' && (
                <>
                  <div>
                    <label className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-1">Twilio Account SID</label>
                    <input
                      type="text"
                      required
                      value={waSid}
                      onChange={(e) => setWaSid(e.target.value)}
                      placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full bg-slate-950 border border-slate-900 rounded-md px-3 py-1.5 text-xs text-white placeholder-slate-800 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-1">Twilio Auth Token</label>
                    <input
                      type="password"
                      required
                      value={waToken}
                      onChange={(e) => setWaToken(e.target.value)}
                      placeholder="••••••••••••••"
                      className="w-full bg-slate-950 border border-slate-900 rounded-md px-3 py-1.5 text-xs text-white placeholder-slate-800 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-1">Sandbox Sender Number</label>
                    <input
                      type="text"
                      required
                      value={waFrom}
                      onChange={(e) => setWaFrom(e.target.value)}
                      placeholder="whatsapp:+14155238886"
                      className="w-full bg-slate-950 border border-slate-900 rounded-md px-3 py-1.5 text-xs text-white placeholder-slate-800 focus:outline-none"
                    />
                  </div>
                </>
              )}

              {/* Meta WA */}
              {providerType === 'meta_wa' && (
                <>
                  <div>
                    <label className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-1">Phone Number ID</label>
                    <input
                      type="text"
                      required
                      value={metaPhoneId}
                      onChange={(e) => setMetaPhoneId(e.target.value)}
                      placeholder="e.g. 1048291092810"
                      className="w-full bg-slate-950 border border-slate-900 rounded-md px-3 py-1.5 text-xs text-white placeholder-slate-800 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-1">System Access Token</label>
                    <input
                      type="password"
                      required
                      value={metaToken}
                      onChange={(e) => setMetaToken(e.target.value)}
                      placeholder="EAACw..."
                      className="w-full bg-slate-950 border border-slate-900 rounded-md px-3 py-1.5 text-xs text-white placeholder-slate-800 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-1">WA Business Account ID</label>
                    <input
                      type="text"
                      required
                      value={metaWabaId}
                      onChange={(e) => setMetaWabaId(e.target.value)}
                      placeholder="e.g. 1092819028911"
                      className="w-full bg-slate-950 border border-slate-900 rounded-md px-3 py-1.5 text-xs text-white placeholder-slate-800 focus:outline-none"
                    />
                  </div>
                </>
              )}

              {/* Custom WhatsApp */}
              {providerType === 'custom_wa' && (
                <>
                  <div>
                    <label className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-1">Custom WA Webhook URL</label>
                    <input
                      type="text"
                      required
                      value={waUrl}
                      onChange={(e) => setWaUrl(e.target.value)}
                      placeholder="https://wa.gateway.company.com/api/send"
                      className="w-full bg-slate-950 border border-slate-900 rounded-md px-3 py-1.5 text-xs text-white placeholder-slate-800 focus:outline-none text-[10px]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-1">HTTP Method</label>
                      <select
                        value={waMethod}
                        onChange={(e) => setWaMethod(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-900 rounded-md px-2 py-1.5 text-xs text-white focus:outline-none"
                      >
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-1">Auth Header Value</label>
                      <input
                        type="text"
                        value={waAuthHeader}
                        onChange={(e) => setWaAuthHeader(e.target.value)}
                        placeholder="Bearer token..."
                        className="w-full bg-slate-950 border border-slate-900 rounded-md px-3 py-1.5 text-xs text-white placeholder-slate-800 focus:outline-none text-[10px]"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* In App WebSocket */}
              {providerType === 'websocket' && (
                <div className="p-2 bg-indigo-950/20 border border-indigo-900/30 rounded text-[10px] text-indigo-300 leading-relaxed">
                  The In-App WebSocket Hub is a server-authoritative broadcast stream. No external credentials are required; subscribers authenticate with their application JWT.
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-3">
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="w-1/3 bg-slate-900 hover:bg-slate-800 text-slate-400 py-1.5 rounded-md text-xs cursor-pointer border border-slate-850 font-bold"
                >
                  CANCEL
                </button>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1.5 rounded-md text-xs cursor-pointer disabled:opacity-50 transition-colors uppercase tracking-wide"
              >
                {editingId ? 'Apply Handshake' : 'Commit Carrier'}
              </button>
            </div>
          </form>
          ) : (
            <div className="bg-slate-900/30 rounded-lg p-3 border border-slate-900/50 text-[11px] text-slate-400 leading-relaxed flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <span>
                <strong>Privilege Gate:</strong> Your role lacks <code>MANAGE_PROVIDERS</code>. You have read-only access to carrier routes and telemetry.
              </span>
            </div>
          )}

          {/* Diagnostic Display Area */}
          {diagnosticsResult && (
            <div className="mt-4 p-3 bg-slate-950 border border-slate-900 rounded-md">
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                <Network className="w-3.5 h-3.5 text-indigo-400" />
                Live Handshake Report
              </span>
              <div className="text-[10px] font-mono space-y-1 text-slate-400">
                <div className="flex justify-between">
                  <span>OUTCOME:</span>
                  <span className={diagnosticsResult.success ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {diagnosticsResult.success ? 'SUCCESS (HEALTHY)' : 'FAILED (DEGRADED)'}
                  </span>
                </div>
                {diagnosticsResult.latencyMs && (
                  <div className="flex justify-between">
                    <span>SLA LATENCY:</span>
                    <span className="text-indigo-400">{diagnosticsResult.latencyMs} ms</span>
                  </div>
                )}
                {diagnosticsResult.diagnostics && (
                  <div className="pt-1">
                    <span className="text-slate-500 text-[9px]">SLA handshake trace:</span>
                    <p className="text-[9px] text-slate-300 break-words mt-0.5 leading-tight">{diagnosticsResult.diagnostics}</p>
                  </div>
                )}
                <div className="text-right text-[8px] text-slate-600 pt-1">
                  Trace timestamp: {new Date(diagnosticsResult.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Existing Providers */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-950/40 border border-slate-900 rounded-lg overflow-hidden">
            <div className="p-3.5 border-b border-slate-900 flex justify-between items-center bg-slate-950/20">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wide">Registered Carrier Trunks ({providers.length})</h3>
              <span className="text-[10px] text-indigo-400 font-mono">Dynamic SLA failover active</span>
            </div>

            {providers.length === 0 ? (
              <div className="p-10 text-center text-slate-500 font-mono text-xs">
                No outbound providers configured. Please set up a carrier.
              </div>
            ) : (
              <div className="divide-y divide-slate-900/60">
                {providers.map((p) => {
                  const pConfig = p.config || {};
                  const pType = pConfig.providerType || (p.channel === 'email' ? 'smtp' : p.channel === 'sms' ? 'twilio' : p.channel === 'whatsapp' ? 'twilio_wa' : 'websocket');
                  
                  return (
                    <div key={p.id} className="p-3.5 hover:bg-slate-900/10 transition-colors">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-white font-sans">{p.name}</span>
                            <span className="px-1.5 py-0.5 bg-slate-900 border border-slate-850 rounded text-[8px] font-mono font-bold uppercase text-slate-400">
                              {p.channel}
                            </span>
                            <span className="px-1.5 py-0.5 bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 rounded text-[8px] font-mono font-bold uppercase">
                              {getProviderBrandName(pType)}
                            </span>
                            <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[8px] font-mono font-bold uppercase">
                              SLA Priority {p.priority}
                            </span>
                          </div>
                          
                          {/* Config Detail Masked Overview */}
                          <div className="mt-1.5 flex items-center gap-4 text-[9px] text-slate-500 font-mono">
                            {pType === 'smtp' && (
                              <span>Host: <strong className="text-slate-400">{pConfig.host || 'smtp.server'}</strong> | Sender: <strong className="text-slate-400">{pConfig.sender}</strong></span>
                            )}
                            {pType === 'brevo' && (
                              <span>Brevo Sender: <strong className="text-slate-400">{pConfig.senderEmail}</strong></span>
                            )}
                            {pType === 'mailgun' && (
                              <span>Domain: <strong className="text-slate-400">{pConfig.domain}</strong> | Region: <strong className="text-slate-400">{pConfig.region}</strong></span>
                            )}
                            {pType === 'postmark' && (
                              <span>Sender: <strong className="text-slate-400">{pConfig.senderEmail}</strong></span>
                            )}
                            {pType === 'ses' && (
                              <span>SES Sender: <strong className="text-slate-400">{pConfig.senderEmail}</strong> | Region: <strong className="text-slate-400">{pConfig.region}</strong></span>
                            )}
                            {['sendgrid', 'resend', 'sparkpost', 'elastic_email', 'mailerlite'].includes(pType) && (
                              <span>Sender: <strong className="text-slate-400">{pConfig.senderEmail}</strong> | Key: <strong className="text-slate-400">••••••••</strong></span>
                            )}
                            {pType === 'twilio' && (
                              <span>Twilio Account: <strong className="text-slate-400">{pConfig.accountSid?.substring(0,6)}...</strong> | From: <strong className="text-slate-400">{pConfig.fromNumber}</strong></span>
                            )}
                            {pType === 'termii' && (
                              <span>Termii Sender ID: <strong className="text-slate-400">{pConfig.senderId}</strong> | Base: <strong className="text-slate-400">{pConfig.baseUrl}</strong></span>
                            )}
                            {pType === 'ringo' && (
                              <span>Ringo Sender ID: <strong className="text-slate-400">{pConfig.senderId}</strong> | Account: <strong className="text-slate-400">{pConfig.username}</strong></span>
                            )}
                            {pType === 'messagebird' && (
                              <span>Sender: <strong className="text-slate-400">{pConfig.senderName}</strong></span>
                            )}
                            {['africastalking', 'infobip', 'plivo', 'vonage', 'sendchamp', 'hubtel', 'mtn', 'airtel', 'sinch', 'clickatell'].includes(pType) && (
                              <span>Sender ID: <strong className="text-slate-400">{pConfig.senderId}</strong> | Key: <strong className="text-slate-400">••••••••</strong></span>
                            )}
                            {pType === 'custom_http' && (
                              <span className="truncate max-w-sm">Universal Route: <strong className="text-slate-400">{pConfig.url}</strong> [{pConfig.method}]</span>
                            )}
                            {pType === 'twilio_wa' && (
                              <span>From WhatsApp: <strong className="text-slate-400">{pConfig.fromWhatsApp}</strong></span>
                            )}
                            {pType === 'meta_wa' && (
                              <span>Meta Phone ID: <strong className="text-slate-400">{pConfig.phoneNumberId}</strong></span>
                            )}
                            {pType === 'custom_wa' && (
                              <span>Custom WA Endpoint: <strong className="text-slate-400">{pConfig.url}</strong></span>
                            )}
                            {pType === 'websocket' && (
                              <span>In-App stream protocol active</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          {canManage && (
                            <>
                              <button
                                onClick={() => handleEdit(p)}
                                className="text-slate-400 hover:text-white p-1 hover:bg-slate-900 rounded transition-colors cursor-pointer"
                                title="Edit Gateway"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onDeleteProvider(p.id)}
                                className="text-slate-400 hover:text-rose-400 p-1 hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
                                title="De-register Gateway"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Active Toggle & Handshake Controls */}
                      <div className="mt-2.5 flex items-center justify-between p-2 bg-slate-950 border border-slate-900 rounded-md text-xs font-mono">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => canManage && onToggleActive(p.id, !p.is_active, p.channel)}
                            disabled={!canManage}
                            className={`flex items-center gap-1.5 text-slate-400 hover:text-white transition-all ${canManage ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
                            title={canManage ? "Toggle Outbound Routing Engine Status" : "Permission Required"}
                          >
                            {p.is_active ? (
                              <>
                                <ToggleRight className="w-5 h-5 text-indigo-400" />
                                <span className="text-indigo-400 text-[9px] font-bold">ACTIVE ROUTE</span>
                              </>
                            ) : (
                              <>
                                <ToggleLeft className="w-5 h-5 text-slate-600" />
                                <span className="text-slate-500 text-[9px] font-bold">STANDBY</span>
                              </>
                            )}
                          </button>

                          <span className="text-slate-900">|</span>

                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              p.health_status === 'healthy' 
                                ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' 
                                : p.health_status === 'degraded'
                                ? 'bg-amber-500'
                                : 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'
                            }`} />
                            <span className="text-[9px] text-slate-400 uppercase tracking-tight">{p.health_status}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleRunDiagnostics(p.id)}
                          disabled={testingId === p.id}
                          className="flex items-center gap-1 bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white px-2 py-0.5 rounded text-[8px] font-bold border border-slate-850 cursor-pointer disabled:opacity-50"
                        >
                          {testingId === p.id ? (
                            <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                          ) : (
                            'SLA HANDSHAKE'
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { Code, BookOpen, Key, Copy, Check } from 'lucide-react';

export function ApiDocsTab() {
  const [copiedSection, setCopiedSection] = React.useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const curlCode = `curl -X POST "${window.location.origin}/api/notifications/send" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: YOUR_APP_API_KEY" \\
  -d '{
    "template": "order.shipped",
    "recipient": "customer@gmail.com",
    "variables": {
      "firstName": "John",
      "orderNumber": "AA-9410",
      "deliveryDate": "July 20th"
    }
  }'`;

  const nodeCode = `const fetch = require('node-fetch');

async function triggerAlert() {
  const response = await fetch('${window.location.origin}/api/notifications/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': 'YOUR_APP_API_KEY'
    },
    body: JSON.stringify({
      template: 'otp.requested',
      recipient: '+15550199',
      variables: {
        firstName: 'Alice',
        otpCode: '482910'
      }
    })
  });

  const data = await response.json();
  console.log('Orchestrated Notification:', data);
}

triggerAlert();`;

  const pythonCode = `import requests

url = "${window.location.origin}/api/notifications/send"
headers = {
    "X-API-Key": "YOUR_APP_API_KEY",
    "Content-Type": "application/json"
}
payload = {
    "template": "task.assigned",
    "recipient": "whatsapp:+15550222",
    "variables": {
        "firstName": "Diana",
        "taskTitle": "Configure webhook endpoints",
        "projectName": "AuraAlert"
    }
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`;

  return (
    <div className="space-y-4 font-sans">
      <div className="border-b border-slate-900 pb-4">
        <h2 className="text-base font-bold text-white uppercase tracking-tight flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-500" />
          Developer Integration Reference
        </h2>
        <p className="text-slate-400 text-xs mt-0.5">Integrate AuraAlert into any client application via HTTPS POST</p>
      </div>

      {/* Live Swagger link */}
      <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live Swagger OpenAPI Console
          </h3>
          <p className="text-slate-300 text-xs leading-relaxed">
            We have published a live interactive Swagger console. Explore, test, and trace all backend notification gateways, RBAC endpoints, and database metrics dynamically.
          </p>
        </div>
        <a
          href="/api-docs"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-[11px] tracking-wider uppercase transition-all flex items-center gap-1.5 shrink-0 self-stretch sm:self-auto justify-center cursor-pointer hover:scale-102"
        >
          Explore Swagger UI ↗
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Spec guidelines */}
        <div className="space-y-4">
          <div className="bg-slate-950/40 border border-slate-900 rounded-lg p-3.5 shadow-sm">
            <h3 className="text-xs font-bold text-slate-300 mb-2.5 flex items-center gap-2 uppercase tracking-wide border-b border-slate-900 pb-2">
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              API Specification
            </h3>
            <p className="text-[11px] text-slate-500 leading-normal mb-3.5">
              AuraAlert provides a single HTTPS endpoint for dispatching all notification channels. All variables and routing logic are handled dynamically by the platform template configuration.
            </p>

            <div className="space-y-3 font-mono text-[10px] border-t border-slate-900/80 pt-3 text-slate-400">
              <div>
                <span className="text-[9px] text-slate-500 font-bold block mb-1">ENDPOINT</span>
                <span className="bg-slate-950 px-2 py-0.5 rounded text-rose-400 border border-slate-900 block w-fit">POST /api/notifications/send</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 font-bold block mb-1">AUTHENTICATION HEADER</span>
                <span className="bg-slate-950 px-2 py-0.5 rounded text-emerald-400 border border-slate-900 block w-fit">X-API-Key: &lt;YOUR_API_KEY&gt;</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-950/40 border border-slate-900 rounded-lg p-3.5">
            <h3 className="text-xs font-bold text-slate-300 mb-2.5 flex items-center gap-2 uppercase tracking-wide border-b border-slate-900 pb-2">
              <Key className="w-3.5 h-3.5 text-indigo-400" />
              Parameters Table
            </h3>
            <div className="space-y-3.5 text-[11px] leading-normal">
              <div className="border-b border-slate-900 pb-2">
                <span className="font-semibold text-white block">template</span>
                <span className="text-slate-500 text-[9px] block font-mono">string • Required</span>
                <p className="text-slate-400 mt-1">Matches the exact template event label inside the template builder (e.g. `order.shipped`).</p>
              </div>
              <div className="border-b border-slate-900 pb-2">
                <span className="font-semibold text-white block">recipient</span>
                <span className="text-slate-500 text-[9px] block font-mono">string • Required</span>
                <p className="text-slate-400 mt-1">The destination target: Email Address, Phone number (SMS/WhatsApp), or custom User ID (In-App).</p>
              </div>
              <div>
                <span className="font-semibold text-white block">variables</span>
                <span className="text-slate-500 text-[9px] block font-mono">object • Optional</span>
                <p className="text-slate-400 mt-1">Key-value pair dictionary containing mapping variables configured for the template.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Code examples */}
        <div className="lg:col-span-2 space-y-4">
          {/* Curl */}
          <div className="bg-slate-950/40 border border-slate-900 rounded-lg overflow-hidden shadow-sm">
            <div className="bg-slate-950/80 p-3 border-b border-slate-900 flex items-center justify-between">
              <span className="text-[10px] font-bold font-mono text-indigo-400 uppercase tracking-wide">cURL Bash Shell</span>
              <button
                onClick={() => handleCopy(curlCode, 'curl')}
                className="text-slate-400 hover:text-white flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
              >
                {copiedSection === 'curl' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                <span className="text-[10px] font-mono">COPY</span>
              </button>
            </div>
            <pre className="p-3.5 font-mono text-[10px] text-slate-300 overflow-x-auto leading-relaxed bg-slate-950/20">
              {curlCode}
            </pre>
          </div>

          {/* Node Fetch */}
          <div className="bg-slate-950/40 border border-slate-900 rounded-lg overflow-hidden shadow-sm">
            <div className="bg-slate-950/80 p-3 border-b border-slate-900 flex items-center justify-between">
              <span className="text-[10px] font-bold font-mono text-indigo-400 uppercase tracking-wide">NodeJS (Fetch Client)</span>
              <button
                onClick={() => handleCopy(nodeCode, 'node')}
                className="text-slate-400 hover:text-white flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
              >
                {copiedSection === 'node' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                <span className="text-[10px] font-mono">COPY</span>
              </button>
            </div>
            <pre className="p-3.5 font-mono text-[10px] text-slate-300 overflow-x-auto leading-relaxed bg-slate-950/20">
              {nodeCode}
            </pre>
          </div>

          {/* Python */}
          <div className="bg-slate-950/40 border border-slate-900 rounded-lg overflow-hidden shadow-sm">
            <div className="bg-slate-950/80 p-3 border-b border-slate-900 flex items-center justify-between">
              <span className="text-[10px] font-bold font-mono text-indigo-400 uppercase tracking-wide">Python requests</span>
              <button
                onClick={() => handleCopy(pythonCode, 'python')}
                className="text-slate-400 hover:text-white flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
              >
                {copiedSection === 'python' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                <span className="text-[10px] font-mono">COPY</span>
              </button>
            </div>
            <pre className="p-3.5 font-mono text-[10px] text-slate-300 overflow-x-auto leading-relaxed bg-slate-950/20">
              {pythonCode}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

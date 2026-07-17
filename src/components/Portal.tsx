import React from 'react';

const Portal = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <header className="mb-12">
        <h1 className="text-4xl font-bold text-gray-900">AuraAlert Developer Portal</h1>
        <p className="text-xl text-gray-600">Integrate, manage, and scale your notification infrastructure.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { title: 'API Explorer', desc: 'Interact with our REST API endpoints.' },
          { title: 'SDK Documentation', desc: 'Integration guides for all supported languages.' },
          { title: 'CLI Reference', desc: 'Operational commands and automation.' },
          { title: 'Plugin Framework', desc: 'Extend functionality with custom providers.' },
          { title: 'Tutorials', desc: 'Step-by-step guides for common use cases.' },
          { title: 'Troubleshooting', desc: 'Diagnose common issues and errors.' },
        ].map((item, i) => (
          <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition">
            <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
            <p className="text-gray-600">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Portal;

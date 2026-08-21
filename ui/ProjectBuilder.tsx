import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { FolderPlus, FolderOpen } from 'lucide-react';

export interface TemplateParam {
  name: string;
  label?: string;
  required?: boolean;
  locked?: boolean;
  default?: string;
}

export default function ProjectBuilder() {
  const [templates, setTemplates] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templateParams, setTemplateParams] = useState<TemplateParam[]>([]);
  const [targetDir, setTargetDir] = useState('');
  const [params, setParams] = useState<Record<string, string>>({});
  const [status, setStatus] = useState('');

  useEffect(() => {
    invoke<string[]>('list_templates').then(t => {
      setTemplates(t);
      if (t.length > 0) {
        setSelectedTemplate(t[0]);
      }
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedTemplate) {
      setTemplateParams([]);
      setParams({});
      return;
    }
    invoke<any>('load_template', { name: selectedTemplate })
      .then(data => {
        const rawParams = data.parameters || [
          { name: 'id', label: 'Project ID', required: true },
          { name: 'title', label: 'Title', required: true },
          { name: 'date', label: 'Date' },
          { name: 'editor', label: 'Editor' },
        ];
        const p: TemplateParam[] = rawParams.map((item: any) => {
          if (typeof item === 'string') {
            return { name: item, label: item.toUpperCase() };
          }
          return item;
        });
        setTemplateParams(p);

        // Initialize state with default values where applicable
        const newParams: Record<string, string> = {};
        p.forEach(param => {
          let def = param.default || '';
          if (param.name === 'date' && !def) def = new Date().toISOString().split('T')[0];
          if (param.name === 'id' && !def) def = '0001';
          if (param.name === 'title' && !def) def = 'New Project';
          if (param.name === 'editor' && !def) def = 'Jules';
          newParams[param.name] = def;
        });
        setParams(newParams);
      })
      .catch(console.error);
  }, [selectedTemplate]);

  const handleBuild = async () => {
    try {
      if (!targetDir) {
        setStatus('Please enter a target directory.');
        return;
      }

      // Check required params
      for (const param of templateParams) {
        if (param.required && !params[param.name]) {
          setStatus(`Error: ${param.label || param.name} is required.`);
          return;
        }
      }

      setStatus('Building...');
      const res = await invoke('build_project', {
        targetDir,
        templateName: selectedTemplate,
        params,
      });
      setStatus(`Success! Project created at ${res}`);
    } catch (e: any) {
      setStatus(`Error: ${e}`);
    }
  };

  const handleBrowseDirectory = async () => {
    try {
      const selected = await invoke<string | null>('pick_directory');
      if (selected) {
        setTargetDir(selected);
      }
    } catch (err) {
      console.error('Failed to pick directory:', err);
    }
  };

  return (
    <div className="p-6 bg-gray-900 text-white rounded-lg shadow-md max-w-2xl mx-auto mt-8">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <FolderPlus className="text-blue-400" /> New Project
      </h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Target Directory</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={targetDir}
              onChange={e => setTargetDir(e.target.value)}
              placeholder="e.g. C:\Users\hippo\Videos\00_PROJECTS"
              className="flex-grow bg-gray-800 border border-gray-700 rounded p-2 focus:outline-none focus:border-blue-500 font-mono text-sm text-white"
            />
            <button
              type="button"
              onClick={handleBrowseDirectory}
              className="px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white border border-gray-700 rounded text-sm font-medium transition-colors flex items-center gap-1.5 shrink-0"
            >
              <FolderOpen size={16} className="text-amber-400" />
              <span>Browse...</span>
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Template</label>
          <select
            value={selectedTemplate}
            onChange={e => setSelectedTemplate(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded p-2 focus:outline-none focus:border-blue-500"
          >
            {templates.length === 0 ? (
              <option value="">(No templates available)</option>
            ) : (
              templates.map(t => <option key={t} value={t}>{t}</option>)
            )}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {templateParams.map(param => (
            <div key={param.name}>
              <label className="block text-sm font-medium mb-1">
                {param.label || param.name} {param.required && <span className="text-red-400">*</span>}
              </label>
              <input
                type="text"
                value={params[param.name] || ''}
                readOnly={param.locked}
                onChange={e => setParams({ ...params, [param.name]: e.target.value })}
                className={`w-full bg-gray-800 border border-gray-700 rounded p-2 focus:outline-none focus:border-blue-500 ${param.locked ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
            </div>
          ))}
        </div>

        <button
          onClick={handleBuild}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
        >
          Build Project
        </button>

        {status && (
          <div className={`p-3 rounded ${status.startsWith('Error') ? 'bg-red-900/50 text-red-200' : 'bg-green-900/50 text-green-200'}`}>
            {status}
          </div>
        )}
      </div>
    </div>
  );
}
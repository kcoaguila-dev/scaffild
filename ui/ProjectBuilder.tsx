import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { FolderPlus } from 'lucide-react';

export default function ProjectBuilder() {
  const [templates, setTemplates] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('default');
  const [targetDir, setTargetDir] = useState('');
  const [params, setParams] = useState({
    id: '0001',
    title: 'New Project',
    date: new Date().toISOString().split('T')[0],
    editor: 'Jules',
  });
  const [status, setStatus] = useState('');

  useEffect(() => {
    invoke<string[]>('list_templates').then(setTemplates).catch(console.error);
  }, []);

  const handleBuild = async () => {
    try {
      if (!targetDir) {
        setStatus('Please enter a target directory.');
        return;
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

  return (
    <div className="p-6 bg-gray-900 text-white rounded-lg shadow-md max-w-2xl mx-auto mt-8">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <FolderPlus /> Project Builder
      </h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Target Directory</label>
          <input
            type="text"
            value={targetDir}
            onChange={e => setTargetDir(e.target.value)}
            placeholder="/path/to/projects/folder"
            className="w-full bg-gray-800 border border-gray-700 rounded p-2 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Template</label>
          <select
            value={selectedTemplate}
            onChange={e => setSelectedTemplate(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded p-2 focus:outline-none focus:border-blue-500"
          >
            <option value="default">default</option>
            {templates.map(t => t !== 'default' && <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Project ID</label>
            <input
              type="text"
              value={params.id}
              onChange={e => setParams({...params, id: e.target.value})}
              className="w-full bg-gray-800 border border-gray-700 rounded p-2 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              type="text"
              value={params.title}
              onChange={e => setParams({...params, title: e.target.value})}
              className="w-full bg-gray-800 border border-gray-700 rounded p-2 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <input
              type="text"
              value={params.date}
              onChange={e => setParams({...params, date: e.target.value})}
              className="w-full bg-gray-800 border border-gray-700 rounded p-2 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Editor</label>
            <input
              type="text"
              value={params.editor}
              onChange={e => setParams({...params, editor: e.target.value})}
              className="w-full bg-gray-800 border border-gray-700 rounded p-2 focus:outline-none focus:border-blue-500"
            />
          </div>
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
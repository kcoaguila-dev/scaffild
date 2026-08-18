import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Settings, Save } from 'lucide-react';
import { stringify } from 'yaml';

interface Template {
  name: string;
  description?: string;
  structure: any[];
}

export default function TemplateManager() {
  const [templates, setTemplates] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('default');
  const [, setTemplateData] = useState<Template | null>(null);
  const [yamlText, setYamlText] = useState('');
  const [status, setStatus] = useState('');
  const [newTemplateName, setNewTemplateName] = useState('');

  const loadTemplates = async () => {
    try {
      const t = await invoke<string[]>('list_templates');
      setTemplates(t);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    if (selectedTemplate) {
      invoke<Template>('load_template', { name: selectedTemplate })
        .then(data => {
          setTemplateData(data);
          setYamlText(stringify(data));
        })
        .catch(e => {
          console.error(e);
          setYamlText('Error loading template.');
        });
    }
  }, [selectedTemplate]);

  const handleSave = async () => {
    try {
      // In a real app, you'd parse the yamlText back to JSON to save it
      // For simplicity, we just save the string (would need backend update or frontend parse)
      // We'll use a yaml parser library if needed, but for now we'll just parse JSON if it was a tree editor
      // Let's assume we parse it:
      const yaml = await import('yaml');
      const parsed = yaml.parse(yamlText);
      await invoke('save_template', { name: selectedTemplate, template: parsed });
      setStatus('Saved successfully!');
      if (!templates.includes(selectedTemplate)) {
          loadTemplates();
      }
      setTimeout(() => setStatus(''), 3000);
    } catch (e: any) {
      setStatus(`Error saving: ${e}`);
    }
  };

  const handleCreateNew = async () => {
    if (!newTemplateName.trim()) {
      setStatus('Please enter a name for the new template.');
      return;
    }
    const safeName = newTemplateName.trim().replace(/[^a-zA-Z0-9_-]/g, '_');

    const newTemplate = {
      name: safeName,
      description: "New custom template",
      structure: [
        "01_SEQUENCES",
        {
          "02_FOOTAGE": ["A_ROLL"]
        }
      ]
    };

    try {
      await invoke('save_template', { name: safeName, template: newTemplate });
      await loadTemplates();
      setSelectedTemplate(safeName);
      setNewTemplateName('');
      setStatus(`Created template ${safeName}`);
      setTimeout(() => setStatus(''), 3000);
    } catch (e: any) {
      setStatus(`Error creating: ${e.message || e}`);
    }
  };

  return (
    <div className="p-6 bg-gray-900 text-white rounded-lg shadow-md max-w-4xl mx-auto mt-8">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <Settings /> Template Manager
      </h2>

      <div className="flex gap-4">
        <div className="w-1/3">
          <label className="block text-sm font-medium mb-1">Select Template</label>
          <select
            value={selectedTemplate}
            onChange={e => setSelectedTemplate(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded p-2 focus:outline-none focus:border-blue-500 mb-4"
          >
            <option value="default">default</option>
            {templates.map(t => t !== 'default' && <option key={t} value={t}>{t}</option>)}
          </select>

          <button
            onClick={handleSave}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors flex items-center justify-center gap-2 mb-6"
          >
            <Save size={18} /> Save Template
          </button>

          <div className="border-t border-gray-700 pt-4">
            <label className="block text-sm font-medium mb-1">Create New Template</label>
            <input
              type="text"
              value={newTemplateName}
              onChange={e => setNewTemplateName(e.target.value)}
              placeholder="my_custom_template"
              className="w-full bg-gray-800 border border-gray-700 rounded p-2 focus:outline-none focus:border-blue-500 mb-2"
            />
            <button
              onClick={handleCreateNew}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors text-sm"
            >
              Create New
            </button>
          </div>

          {status && <div className="mt-4 text-sm text-center font-medium text-green-400">{status}</div>}
        </div>

        <div className="w-2/3">
          <label className="block text-sm font-medium mb-1">YAML Editor</label>
          <textarea
            value={yamlText}
            onChange={e => setYamlText(e.target.value)}
            className="w-full h-[400px] bg-gray-800 border border-gray-700 rounded p-4 font-mono text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>
    </div>
  );
}
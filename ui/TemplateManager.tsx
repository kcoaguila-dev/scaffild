import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Settings, Save, FileCode2 } from 'lucide-react';
import { stringify } from 'yaml';
import TemplateTree from './TemplateTree';

import { TemplateParam } from './ProjectBuilder';

interface Template {
  name: string;
  description?: string;
  parameters?: TemplateParam[];
  structure: any[];
}

export default function TemplateManager() {
  const [templates, setTemplates] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('default');
  const [templateData, setTemplateData] = useState<Template | null>(null);
  const [yamlText, setYamlText] = useState('');
  const [status, setStatus] = useState('');
  const [newTemplateName, setNewTemplateName] = useState('');
  const [showYamlEditor, setShowYamlEditor] = useState(false);

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
      const yaml = await import('yaml');
      // If we are in yaml mode, we try to parse it. Otherwise, we trust templateData
      let dataToSave;
      if (showYamlEditor) {
        dataToSave = yaml.parse(yamlText);
      } else {
        dataToSave = templateData;
      }

      await invoke('save_template', { name: selectedTemplate, template: dataToSave });
      setStatus('Saved successfully!');
      if (!templates.includes(selectedTemplate)) {
          loadTemplates();
      }
      setTimeout(() => setStatus(''), 3000);
    } catch (e: any) {
      setStatus(`Error saving: ${e}`);
    }
  };

  const handleTreeChange = (newStructure: any[]) => {
    if (templateData) {
      const newTemplateData = { ...templateData, structure: newStructure };
      setTemplateData(newTemplateData);
      setYamlText(stringify(newTemplateData));
    }
  };

  const handleYamlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setYamlText(newText);
    try {
      import('yaml').then(yaml => {
        const parsed = yaml.parse(newText);
        setTemplateData(parsed);
      });
    } catch (err) {
      // Ignore parse errors while typing
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

        <div className="w-2/3 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium">Structure</label>
            <button
              onClick={() => setShowYamlEditor(!showYamlEditor)}
              className="text-xs flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
            >
              <FileCode2 size={14} />
              {showYamlEditor ? "Show Visual Editor" : "Advanced: Edit as YAML"}
            </button>
          </div>

          <div className="flex-grow bg-gray-800 border border-gray-700 rounded overflow-hidden">
            {!showYamlEditor ? (
              <div className="p-4 h-[400px] overflow-y-auto">
                <TemplateTree
                  structure={templateData?.structure || []}
                  parameters={templateData?.parameters}
                  onChange={handleTreeChange}
                />
              </div>
            ) : (
              <textarea
                value={yamlText}
                onChange={handleYamlChange}
                className="w-full h-[400px] bg-gray-800 p-4 font-mono text-sm focus:outline-none focus:border-blue-500 text-gray-200"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
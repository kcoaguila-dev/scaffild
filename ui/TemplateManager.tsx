import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Settings, Save, Trash2, FileCode2, Upload, X, FolderSearch } from 'lucide-react';
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
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importPath, setImportPath] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      description: "Custom project template",
      parameters: ["id", "title", "date", "editor"],
      structure: []
    };

    try {
      await invoke('save_template', { name: safeName, template: newTemplate });
      await loadTemplates();
      setSelectedTemplate(safeName);
      setNewTemplateName('');
      setStatus(`Created blank template "${safeName}"`);
      setTimeout(() => setStatus(''), 3000);
    } catch (e: any) {
      setStatus(`Error creating: ${e.message || e}`);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!selectedTemplate) return;
    if (selectedTemplate === 'default') {
      if (!window.confirm('Are you sure you want to delete the default template?')) {
        return;
      }
    } else {
      if (!window.confirm(`Are you sure you want to delete template "${selectedTemplate}"?`)) {
        return;
      }
    }

    try {
      await invoke('delete_template', { name: selectedTemplate });
      const remaining = templates.filter(t => t !== selectedTemplate);
      setTemplates(remaining);
      const nextSelected = remaining[0] || 'default';
      setSelectedTemplate(nextSelected);
      setStatus(`Deleted template "${selectedTemplate}"`);
      setTimeout(() => setStatus(''), 3000);
    } catch (e: any) {
      setStatus(`Error deleting: ${e.message || e}`);
    }
  };

  const handleScanPath = async (pathToScan: string) => {
    if (!pathToScan.trim()) {
      setStatus('Please provide a valid folder path.');
      return;
    }
    setIsScanning(true);
    setStatus('Scanning directory structure...');

    try {
      const scannedStructure = await invoke<any[]>('scan_directory_structure', { path: pathToScan.trim() });
      const baseTemplate = templateData || {
        name: selectedTemplate || 'imported_template',
        description: 'Imported from folder',
        structure: [],
      };
      const updated = { ...baseTemplate, structure: scannedStructure };
      setTemplateData(updated);
      setYamlText(stringify(updated));
      setStatus(`Imported folder structure from ${pathToScan}`);
      setIsImportModalOpen(false);
      setImportPath('');
      setTimeout(() => setStatus(''), 4000);
    } catch (err: any) {
      setStatus(`Failed to scan folder: ${err}`);
    } finally {
      setIsScanning(false);
    }
  };

  const handleNativeFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    let detectedRootName = '';
    if (files[0]) {
      const rel = files[0].webkitRelativePath || files[0].name;
      const p = rel.split('/');
      if (p.length > 1) {
        detectedRootName = p[0];
      }
    }

    // Convert webkitRelativePath into tree structure for browser fallback
    const rootMap: { [key: string]: any } = {};

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const relPath = file.webkitRelativePath || file.name;
      const parts = relPath.split('/');

      // Remove root folder wrapper so we get children
      if (parts.length > 1) {
        parts.shift();
      }

      let current = rootMap;
      for (let j = 0; j < parts.length; j++) {
        const part = parts[j];
        if (j === parts.length - 1) {
          current[part] = true; // file marker
        } else {
          if (!current[part] || typeof current[part] !== 'object') {
            current[part] = {};
          }
          current = current[part];
        }
      }
    }

    function mapToYamlStructure(map: { [key: string]: any }): any[] {
      const result: any[] = [];
      for (const key of Object.keys(map)) {
        if (map[key] === true) {
          result.push(key);
        } else if (typeof map[key] === 'object') {
          const children = mapToYamlStructure(map[key]);
          if (children.length === 0) {
            result.push(key);
          } else {
            result.push({ [key]: children });
          }
        }
      }
      return result;
    }

    const converted = mapToYamlStructure(rootMap);
    const baseTemplate = templateData || {
      name: selectedTemplate || (detectedRootName ? detectedRootName.replace(/[^a-zA-Z0-9_-]/g, '_') : 'imported_template'),
      description: `Imported from ${detectedRootName || 'folder'}`,
      structure: [],
    };
    const updated = { ...baseTemplate, structure: converted };
    setTemplateData(updated);
    setYamlText(stringify(updated));
    setStatus(`Imported folder structure (${files.length} items from ${detectedRootName || 'selected folder'})`);
    setIsImportModalOpen(false);
    setTimeout(() => setStatus(''), 4000);
  };

  return (
    <div className="p-6 bg-gray-900 text-white rounded-lg shadow-md max-w-5xl mx-auto mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Settings /> Template Manager
        </h2>

        <button
          onClick={() => setIsImportModalOpen(true)}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors shadow-sm"
        >
          <Upload size={16} /> Import Folder Structure...
        </button>
      </div>

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

          <div className="flex gap-2 mb-6">
            <button
              onClick={handleSave}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-3 rounded transition-colors flex items-center justify-center gap-1.5 text-sm shadow-sm"
              title="Save Template"
            >
              <Save size={16} /> Save
            </button>
            <button
              onClick={handleDeleteTemplate}
              className="bg-red-600/80 hover:bg-red-600 text-white py-2 px-3 rounded transition-colors flex items-center justify-center gap-1.5 text-sm shadow-sm"
              title="Delete Current Template"
            >
              <Trash2 size={16} /> Delete
            </button>
          </div>

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
              <div className="p-4 h-[440px] overflow-y-auto">
                <TemplateTree
                  structure={templateData?.structure || []}
                  parameters={templateData?.parameters}
                  onChange={handleTreeChange}
                  onImportFolder={() => setIsImportModalOpen(true)}
                />
              </div>
            ) : (
              <textarea
                value={yamlText}
                onChange={handleYamlChange}
                className="w-full h-[440px] bg-gray-800 p-4 font-mono text-sm focus:outline-none focus:border-blue-500 text-gray-200"
              />
            )}
          </div>
        </div>
      </div>

      {/* Import Folder Structure Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-lg w-full shadow-2xl relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                <FolderSearch className="text-purple-400" size={20} />
                Import Folder Structure
              </h3>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-xs text-gray-300 mb-4">
              Point to any existing project directory on your computer (like Post Haste), and Slate will recursively scan and generate the template tree with all folders and template files.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Folder Path on Disk
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={importPath}
                    onChange={(e) => setImportPath(e.target.value)}
                    placeholder="C:\Projects\TemplateFolder or /Volumes/Work/Template"
                    className="flex-grow bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 font-mono"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-xs text-gray-300 hover:text-white transition-colors"
                  >
                    Browse...
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    // @ts-expect-error webkitdirectory is standard for folder pickers
                    webkitdirectory=""
                    directory=""
                    multiple
                    className="hidden"
                    onChange={handleNativeFolderSelect}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleScanPath(importPath)}
                  disabled={isScanning || !importPath.trim()}
                  className={`px-4 py-2 rounded text-sm font-semibold transition-colors flex items-center gap-2 ${
                    isScanning || !importPath.trim()
                      ? 'bg-purple-900/50 text-gray-400 cursor-not-allowed'
                      : 'bg-purple-600 hover:bg-purple-700 text-white'
                  }`}
                >
                  {isScanning ? 'Scanning...' : 'Scan & Import Structure'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
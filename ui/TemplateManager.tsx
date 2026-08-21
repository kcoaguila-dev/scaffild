import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Settings, Save, FileCode2, Upload, X, FolderSearch } from 'lucide-react';
import { stringify } from 'yaml';
import TemplateTree from './TemplateTree';

import { TemplateParam } from './ProjectBuilder';

interface Template {
  name: string;
  description?: string;
  parameters?: (TemplateParam | string)[];
  structure: any[];
}

export default function TemplateManager() {
  const [templates, setTemplates] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templateData, setTemplateData] = useState<Template | null>(null);
  const [yamlText, setYamlText] = useState('');
  const [status, setStatus] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [showYamlEditor, setShowYamlEditor] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importPath, setImportPath] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const newNameInputRef = useRef<HTMLInputElement>(null);

  const loadTemplates = async () => {
    try {
      const t = await invoke<string[]>('list_templates');
      setTemplates(t);
      if (t.length > 0) {
        if (!selectedTemplate || !t.includes(selectedTemplate)) {
          setSelectedTemplate(t[0]);
        }
      } else {
        setSelectedTemplate('');
        setTemplateData(null);
        setYamlText('');
      }
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
          setTemplateData(null);
          setYamlText('');
        });
    } else {
      setTemplateData(null);
      setYamlText('');
    }
  }, [selectedTemplate]);

  useEffect(() => {
    if (isCreatingNew && newNameInputRef.current) {
      newNameInputRef.current.focus();
    }
  }, [isCreatingNew]);

  const handleSave = async () => {
    if (!selectedTemplate) return;
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
      setIsCreatingNew(false);
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
      const updatedList = [...templates.filter(t => t !== safeName), safeName];
      setTemplates(updatedList);
      setSelectedTemplate(safeName);
      setNewTemplateName('');
      setIsCreatingNew(false);
      setStatus(`Created blank template "${safeName}"`);
      setTimeout(() => setStatus(''), 3000);
    } catch (e: any) {
      setStatus(`Error creating: ${e.message || e}`);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!selectedTemplate) return;
    if (!window.confirm(`Are you sure you want to delete template "${selectedTemplate}"?`)) {
      return;
    }

    try {
      await invoke('delete_template', { name: selectedTemplate });
      const remaining = templates.filter(t => t !== selectedTemplate);
      setTemplates(remaining);
      const nextSelected = remaining.length > 0 ? remaining[0] : '';
      setSelectedTemplate(nextSelected);
      if (!nextSelected) {
        setTemplateData(null);
        setYamlText('');
      }
      setStatus(`Deleted template "${selectedTemplate}"`);
      setTimeout(() => setStatus(''), 3000);
    } catch (e: any) {
      setStatus(`Error deleting: ${e.message || e}`);
    }
  };

  const handleImportFolderStructure = async () => {
    try {
      const res = await invoke<{ name: string; path: string; structure: any[] } | null>('pick_folder_and_scan');
      if (!res) return;

      const targetName = selectedTemplate || res.name.replace(/[^a-zA-Z0-9_-]/g, '_');
      const baseTemplate = templateData || {
        name: targetName,
        description: `Imported from ${res.path}`,
        parameters: ['id', 'title', 'date', 'editor'],
        structure: [],
      };
      const updated = { ...baseTemplate, structure: res.structure };
      setTemplateData(updated);
      setYamlText(stringify(updated));
      if (!selectedTemplate) {
        setSelectedTemplate(targetName);
        if (!templates.includes(targetName)) {
          setTemplates([...templates, targetName]);
        }
      }
      setIsImportModalOpen(false);
      setStatus(`Imported all folders and files from ${res.name}`);
      setTimeout(() => setStatus(''), 4000);
    } catch (err) {
      console.warn('Native folder picker fallback to modal:', err);
      setIsImportModalOpen(true);
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
        parameters: ['id', 'title', 'date', 'editor'],
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

    const rootMap: { [key: string]: any } = {};

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const relPath = file.webkitRelativePath || file.name;
      const parts = relPath.split('/');

      if (parts.length > 1) {
        parts.shift();
      }

      let current = rootMap;
      for (let j = 0; j < parts.length; j++) {
        const part = parts[j];
        if (j === parts.length - 1) {
          current[part] = true;
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
    const targetName = selectedTemplate || (detectedRootName ? detectedRootName.replace(/[^a-zA-Z0-9_-]/g, '_') : 'imported_template');
    const baseTemplate = templateData || {
      name: targetName,
      description: `Imported from ${detectedRootName || 'folder'}`,
      parameters: ['id', 'title', 'date', 'editor'],
      structure: [],
    };
    const updated = { ...baseTemplate, structure: converted };
    setTemplateData(updated);
    setYamlText(stringify(updated));
    if (!selectedTemplate) {
      setSelectedTemplate(targetName);
      if (!templates.includes(targetName)) {
        setTemplates([...templates, targetName]);
      }
    }
    setStatus(`Imported folder structure (${files.length} items from ${detectedRootName || 'selected folder'})`);
    setIsImportModalOpen(false);
    setTimeout(() => setStatus(''), 4000);
  };

  return (
    <div className="p-6 bg-gray-900 text-white rounded-lg shadow-md max-w-5xl mx-auto mt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 border-b border-gray-800 pb-3">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Settings size={22} className="text-blue-400" /> Template Manager
        </h2>

        <div className="flex items-center gap-2">
          <button
            onClick={handleImportFolderStructure}
            className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors shadow-sm"
          >
            <Upload size={14} /> Import Folder Structure...
          </button>
          {selectedTemplate && (
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white font-bold px-3 py-1.5 rounded text-xs transition-colors shadow-sm"
            >
              <Save size={14} /> Save Template
            </button>
          )}
        </div>
      </div>

      {/* 2-Pane Post Haste Style Workspace */}
      <div className="grid grid-cols-12 gap-4 h-[500px]">
        {/* Left Pane: Templates List (Post Haste Style) */}
        <div className="col-span-4 flex flex-col bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          <div className="bg-gray-850 px-3 py-2 border-b border-gray-700 text-xs font-bold uppercase tracking-wider text-gray-300">
            Templates
          </div>

          <div className="flex-grow overflow-y-auto p-1 space-y-0.5">
            {templates.length === 0 && !isCreatingNew ? (
              <div className="text-gray-500 text-xs p-4 text-center italic">
                No templates yet. Click "Add" below to create one.
              </div>
            ) : (
              templates.map(name => (
                <button
                  key={name}
                  onClick={() => setSelectedTemplate(name)}
                  className={`w-full text-left px-3 py-2 rounded text-sm font-medium flex items-center gap-2 transition-colors ${
                    selectedTemplate === name
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <FileCode2 size={16} className={selectedTemplate === name ? 'text-white' : 'text-blue-400'} />
                  <span className="truncate">{name}</span>
                </button>
              ))
            )}

            {isCreatingNew && (
              <div className="p-1">
                <input
                  ref={newNameInputRef}
                  type="text"
                  value={newTemplateName}
                  onChange={e => setNewTemplateName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleCreateNew();
                    if (e.key === 'Escape') setIsCreatingNew(false);
                  }}
                  onBlur={() => {
                    if (newTemplateName.trim()) handleCreateNew();
                    else setIsCreatingNew(false);
                  }}
                  placeholder="Template Name (Enter)"
                  className="w-full bg-gray-900 border border-blue-500 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Left Action Buttons: Post Haste Style Add / Remove */}
          <div className="bg-gray-850 p-2 border-t border-gray-700 flex gap-2">
            <button
              onClick={() => {
                setIsCreatingNew(true);
                setNewTemplateName('');
              }}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-xs font-semibold py-1.5 px-3 rounded transition-colors border border-gray-600 flex items-center justify-center gap-1"
            >
              Add
            </button>
            <button
              onClick={handleDeleteTemplate}
              disabled={!selectedTemplate}
              className={`flex-1 text-xs font-semibold py-1.5 px-3 rounded transition-colors border flex items-center justify-center gap-1 ${
                selectedTemplate
                  ? 'bg-gray-700 hover:bg-red-700 text-gray-200 hover:text-white border-gray-600 hover:border-red-600'
                  : 'bg-gray-800 text-gray-500 border-gray-700 cursor-not-allowed'
              }`}
            >
              Remove
            </button>
          </div>
        </div>

        {/* Right Pane: Tree & Structure Editor */}
        <div className="col-span-8 flex flex-col bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          <div className="bg-gray-850 px-3 py-2 border-b border-gray-700 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-300">
              {selectedTemplate ? `Structure — ${selectedTemplate}` : 'Structure'}
            </span>
            {selectedTemplate && (
              <button
                onClick={() => setShowYamlEditor(!showYamlEditor)}
                className="text-xs flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
              >
                <FileCode2 size={13} />
                {showYamlEditor ? "Visual Editor" : "YAML"}
              </button>
            )}
          </div>

          <div className="flex-grow overflow-hidden flex flex-col">
            {!selectedTemplate ? (
              <div className="flex-grow flex items-center justify-center text-gray-500 text-sm italic">
                Select a template from the left list or click "Add" to create one.
              </div>
            ) : !showYamlEditor ? (
              <TemplateTree
                key={selectedTemplate}
                structure={templateData?.structure || []}
                parameters={templateData?.parameters}
                onChange={handleTreeChange}
                onImportFolder={() => setIsImportModalOpen(true)}
              />
            ) : (
              <textarea
                value={yamlText}
                onChange={handleYamlChange}
                className="w-full h-full bg-gray-900 p-4 font-mono text-xs focus:outline-none text-gray-200 resize-none"
              />
            )}
          </div>
        </div>
      </div>

      {status && (
        <div className="mt-3 text-xs text-center font-medium text-green-400 bg-green-950/40 border border-green-800/50 py-1.5 rounded">
          {status}
        </div>
      )}

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
              Point to any existing project directory on your computer (like Post Haste), and Scaffild will recursively scan and generate the template tree with all folders and template files.
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
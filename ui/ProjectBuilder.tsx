import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { FolderPlus, FolderOpen, Film, ExternalLink, HardDriveDownload, Sparkles, Clock } from 'lucide-react';

export interface TemplateParam {
  name: string;
  label?: string;
  required?: boolean;
  locked?: boolean;
  default?: string;
}

interface RecentProject {
  name: string;
  path: string;
  template: string;
  createdAt: string;
}

interface ProjectBuilderProps {
  onNavigateToIngest?: (dir: string) => void;
}

function sanitizeName(name: string): string {
  return name.trim().replace(/[ /\\:*?"<>|.]+/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
}

export default function ProjectBuilder({ onNavigateToIngest }: ProjectBuilderProps) {
  const [templates, setTemplates] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templateParams, setTemplateParams] = useState<TemplateParam[]>([]);
  const [targetDir, setTargetDir] = useState(() => {
    return localStorage.getItem('scaffild_target_dir') || localStorage.getItem('slate_target_dir') || 'C:\\Users\\hippo\\Videos\\00_PROJECTS';
  });
  const [params, setParams] = useState<Record<string, string>>({});
  const [openProjectAfterCreate, setOpenProjectAfterCreate] = useState(true);
  const [revealInExplorer, setRevealInExplorer] = useState(false);
  const [includeSyncBins, setIncludeSyncBins] = useState(true);
  const [status, setStatus] = useState('');
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>(() => {
    try {
      const saved = localStorage.getItem('scaffild_recent_projects');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const updateNextId = async (dir: string) => {
    if (!dir) return;
    try {
      const nextId = await invoke<string>('get_next_project_id', { targetDir: dir });
      if (nextId) {
        setParams(prev => ({ ...prev, id: nextId }));
      }
    } catch (e) {
      console.warn('Failed to fetch next project id:', e);
    }
  };

  useEffect(() => {
    invoke<string[]>('list_templates').then(t => {
      setTemplates(t);
      if (t.length > 0) {
        setSelectedTemplate(t[0]);
      }
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (targetDir) {
      localStorage.setItem('scaffild_target_dir', targetDir);
      updateNextId(targetDir);
    }
  }, [targetDir]);

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
          if (param.name === 'title' && !def) def = '';
          if (param.name === 'editor' && !def) def = 'hippo';
          newParams[param.name] = def;
        });
        setParams(newParams);

        if (targetDir) {
          updateNextId(targetDir);
        }
      })
      .catch(console.error);
  }, [selectedTemplate]);

  // Compute live project composite name
  const computeLiveProjectName = (): string => {
    const parts: string[] = [];
    templateParams.forEach(p => {
      const val = params[p.name];
      if (val) {
        const clean = sanitizeName(val);
        if (clean) parts.push(clean);
      }
    });
    if (parts.length === 0) {
      ['id', 'title', 'date', 'editor'].forEach(key => {
        const val = params[key];
        if (val) {
          const clean = sanitizeName(val);
          if (clean) parts.push(clean);
        }
      });
    }
    return parts.length > 0 ? parts.join('_') : 'Project';
  };

  const liveProjectName = computeLiveProjectName();

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
      const res = await invoke<string>('build_project', {
        targetDir,
        templateName: selectedTemplate,
        params,
        openProject: openProjectAfterCreate,
        revealInExplorer,
        includeSyncBins,
      });

      setStatus(`Success! Project created at ${res}`);

      // Save to recent projects
      const newEntry: RecentProject = {
        name: liveProjectName,
        path: res,
        template: selectedTemplate,
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setRecentProjects(prev => {
        const nextList = [newEntry, ...prev.filter(p => p.path !== res)].slice(0, 5);
        localStorage.setItem('scaffild_recent_projects', JSON.stringify(nextList));
        return nextList;
      });

      // Auto-increment ID and clear title for the next project
      if (targetDir) {
        setTimeout(() => {
          updateNextId(targetDir);
          setParams(prev => ({ ...prev, title: '' }));
        }, 500);
      }
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

  // Keyboard Shortcuts (Ctrl + Enter to Build, Ctrl + O to Browse)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleBuild();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        handleBrowseDirectory();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [targetDir, selectedTemplate, params, templateParams, openProjectAfterCreate, revealInExplorer, includeSyncBins, liveProjectName]);

  const handleOpenPremiere = async (path: string) => {
    try {
      await invoke('open_project_in_premiere', { projectPath: path });
    } catch (e) {
      console.error('Failed to open project:', e);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto mt-6">
      <div className="p-6 bg-gray-900 text-white rounded-lg shadow-md border border-gray-800">
        <h2 className="text-2xl font-bold mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderPlus className="text-blue-400" /> New Project
          </div>
          <span className="text-xs text-gray-500 font-mono font-normal flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 border border-gray-700">Ctrl + Enter</kbd> to build
          </span>
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 flex justify-between items-center">
              <span>Target Directory</span>
              <span className="text-[11px] text-gray-400 font-mono">Ctrl + O</span>
            </label>
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
                  placeholder={param.name === 'title' ? 'e.g. Nike Commercial' : ''}
                  className={`w-full bg-gray-800 border border-gray-700 rounded p-2 focus:outline-none focus:border-blue-500 ${param.locked ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
              </div>
            ))}
          </div>

          {/* Live Naming Preview */}
          <div className="p-3 bg-gray-950/70 border border-gray-800 rounded-md space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-400">
              <Sparkles size={13} />
              <span>Live Output Preview</span>
            </div>
            <div className="font-mono text-xs text-gray-200 truncate flex items-center gap-1.5">
              <span className="text-gray-500 select-none">📁 Folder:</span>
              <span className="text-emerald-300 font-semibold">{liveProjectName}</span>
            </div>
            <div className="font-mono text-[11px] text-gray-400 truncate flex items-center gap-1.5">
              <span className="text-gray-500 select-none">🎬 Premiere:</span>
              <span className="text-purple-300">{liveProjectName}.prproj</span>
            </div>
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 pb-1 text-xs text-gray-300 border-t border-gray-800/80">
            <label className="flex items-center gap-2 cursor-pointer select-none hover:text-white transition-colors">
              <input
                type="checkbox"
                checked={openProjectAfterCreate}
                onChange={e => setOpenProjectAfterCreate(e.target.checked)}
                className="rounded bg-gray-800 border-gray-700 text-blue-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <span>Open project after creation</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none hover:text-white transition-colors">
              <input
                type="checkbox"
                checked={revealInExplorer}
                onChange={e => setRevealInExplorer(e.target.checked)}
                className="rounded bg-gray-800 border-gray-700 text-blue-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <span>Reveal folder in File Explorer</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none hover:text-white transition-colors col-span-1 sm:col-span-2">
              <input
                type="checkbox"
                checked={includeSyncBins}
                onChange={e => setIncludeSyncBins(e.target.checked)}
                className="rounded bg-gray-800 border-gray-700 text-blue-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <span>Include SyncBins.jsx companion in project files</span>
            </label>
          </div>

          <button
            onClick={handleBuild}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            <span>Build Project</span>
            <kbd className="text-[11px] px-1.5 py-0.5 rounded bg-blue-700/80 text-blue-200 font-mono">Ctrl + Enter</kbd>
          </button>

          {status && (
            <div className={`p-3 rounded text-sm ${status.startsWith('Error') ? 'bg-red-900/50 text-red-200 border border-red-800' : 'bg-green-900/50 text-green-200 border border-green-800'}`}>
              {status}
            </div>
          )}
        </div>
      </div>

      {/* Recent Projects History Panel */}
      {recentProjects.length > 0 && (
        <div className="p-5 bg-gray-900/80 text-white rounded-lg shadow-md border border-gray-800/90 space-y-3">
          <div className="flex items-center justify-between text-sm font-semibold text-gray-300">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-blue-400" />
              <span>Recent Projects</span>
            </div>
            <button
              onClick={() => {
                setRecentProjects([]);
                localStorage.removeItem('scaffild_recent_projects');
              }}
              className="text-xs text-gray-500 hover:text-gray-400 transition-colors"
            >
              Clear History
            </button>
          </div>

          <div className="space-y-2">
            {recentProjects.map((p, idx) => (
              <div
                key={idx}
                className="p-3 bg-gray-800/60 hover:bg-gray-800 rounded-md border border-gray-700/60 flex items-center justify-between transition-colors"
              >
                <div className="min-w-0 pr-3">
                  <div className="font-semibold text-sm text-gray-100 truncate">{p.name}</div>
                  <div className="text-[11px] text-gray-400 font-mono truncate">{p.path}</div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleOpenPremiere(p.path)}
                    title="Open in Premiere Pro"
                    className="p-1.5 bg-gray-700 hover:bg-purple-600 text-gray-200 hover:text-white rounded transition-colors"
                  >
                    <Film size={14} />
                  </button>
                  <button
                    onClick={() => invoke('open_project_in_premiere', { projectPath: p.path })}
                    title="Reveal in File Explorer"
                    className="p-1.5 bg-gray-700 hover:bg-blue-600 text-gray-200 hover:text-white rounded transition-colors"
                  >
                    <ExternalLink size={14} />
                  </button>
                  {onNavigateToIngest && (
                    <button
                      onClick={() => onNavigateToIngest(p.path)}
                      title="Offload Media into this Project"
                      className="px-2 py-1.5 bg-gray-700 hover:bg-emerald-600 text-gray-200 hover:text-white rounded text-xs flex items-center gap-1 transition-colors font-medium"
                    >
                      <HardDriveDownload size={13} />
                      <span>Ingest</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
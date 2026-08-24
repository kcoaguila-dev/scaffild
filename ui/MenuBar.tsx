import { useState, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ChevronRight, ExternalLink, Trash2 } from 'lucide-react';

export interface RecentProjectItem {
  name: string;
  path: string;
  template: string;
  createdAt: string;
}

interface MenuBarProps {
  onSelectTab: (tab: 'build' | 'templates' | 'ingest') => void;
  onOpenShortcuts: () => void;
  onOpenAbout: () => void;
  onOpenMcpSetup?: () => void;
  onBrowseTargetDir?: () => void;
  recentProjects: RecentProjectItem[];
  onClearRecentProjects: () => void;
  onNavigateToIngest?: (dir: string) => void;
  onOpenExtensionModal?: () => void;
}

export default function MenuBar({
  onSelectTab,
  onOpenShortcuts,
  onOpenAbout,
  onOpenMcpSetup,
  onBrowseTargetDir,
  recentProjects,
  onClearRecentProjects,
  onNavigateToIngest,
  onOpenExtensionModal,
}: MenuBarProps) {
  const [openMenu, setOpenMenu] = useState<'file' | 'view' | 'tools' | 'help' | null>(null);
  const [isRecentSubmenuOpen, setIsRecentSubmenuOpen] = useState(false);
  const menuBarRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
        setIsRecentSubmenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpenProject = async (path: string) => {
    setOpenMenu(null);
    setIsRecentSubmenuOpen(false);
    try {
      await invoke('open_project_in_premiere', { projectPath: path });
    } catch (e) {
      console.error('Failed to open project:', e);
    }
  };

  const handleOpenTemplatesDir = async () => {
    setOpenMenu(null);
    try {
      await invoke('open_templates_dir');
    } catch (e) {
      console.error('Failed to open templates dir:', e);
    }
  };

  const handleOpenProjectsDir = async () => {
    setOpenMenu(null);
    const targetDir = localStorage.getItem('scaffild_target_dir');
    if (targetDir) {
      try {
        await invoke('open_project_in_premiere', { projectPath: targetDir });
      } catch (e) {
        console.error('Failed to open projects dir:', e);
      }
    } else if (onBrowseTargetDir) {
      onBrowseTargetDir();
    }
  };

  return (
    <div
      ref={menuBarRef}
      className="bg-gray-950/90 border-b border-gray-800/80 px-2 py-0.5 flex items-center text-xs text-gray-300 select-none relative z-40"
    >
      {/* File Menu */}
      <div className="relative">
        <button
          onClick={() => {
            setOpenMenu(openMenu === 'file' ? null : 'file');
            setIsRecentSubmenuOpen(false);
          }}
          className={`px-2.5 py-1 rounded hover:bg-gray-800 transition-colors ${
            openMenu === 'file' ? 'bg-gray-800 text-white' : ''
          }`}
        >
          File
        </button>

        {openMenu === 'file' && (
          <div className="absolute left-0 top-full mt-0.5 w-52 bg-gray-900 border border-gray-700/80 rounded shadow-xl py-1 z-50 text-gray-200">
            {/* Recent Projects Submenu Trigger */}
            <div
              className="relative"
              onMouseEnter={() => setIsRecentSubmenuOpen(true)}
            >
              <div className="px-3 py-1.5 hover:bg-blue-600 hover:text-white flex items-center justify-between cursor-pointer">
                <span>Recent Projects</span>
                <ChevronRight size={14} className="text-gray-400" />
              </div>

              {/* Submenu flyout */}
              {isRecentSubmenuOpen && (
                <div
                  className="absolute left-full top-0 ml-0.5 w-72 bg-gray-900 border border-gray-700/80 rounded shadow-2xl py-1 z-50 text-gray-200"
                  onMouseLeave={() => setIsRecentSubmenuOpen(false)}
                >
                  {recentProjects.length === 0 ? (
                    <div className="px-3 py-1.5 text-gray-500 italic text-[11px]">
                      (No recent projects)
                    </div>
                  ) : (
                    <>
                      {recentProjects.map((p, idx) => (
                        <div
                          key={idx}
                          className="px-3 py-1.5 hover:bg-gray-800 flex items-center justify-between group font-mono text-[11px]"
                          title={p.path}
                        >
                          <span
                            onClick={() => handleOpenProject(p.path)}
                            className="cursor-pointer truncate hover:text-blue-400 flex-grow pr-2"
                          >
                            {p.name}
                          </span>
                          {onNavigateToIngest && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenu(null);
                                setIsRecentSubmenuOpen(false);
                                onNavigateToIngest(p.path);
                              }}
                              className="text-gray-500 hover:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] uppercase font-sans font-semibold px-1"
                              title="Ingest Media into this project"
                            >
                              Ingest
                            </button>
                          )}
                        </div>
                      ))}
                      <div className="border-t border-gray-800 my-1"></div>
                      <div
                        onClick={() => {
                          onClearRecentProjects();
                          setIsRecentSubmenuOpen(false);
                        }}
                        className="px-3 py-1.5 hover:bg-red-600/80 hover:text-white cursor-pointer text-gray-400 flex items-center gap-1.5 text-[11px]"
                      >
                        <Trash2 size={12} />
                        <span>Clear Recent Projects</span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {onBrowseTargetDir && (
              <div
                onClick={() => {
                  setOpenMenu(null);
                  onBrowseTargetDir();
                }}
                className="px-3 py-1.5 hover:bg-blue-600 hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span>Browse Target Directory...</span>
                <span className="text-[10px] text-gray-500 font-mono">Ctrl+O</span>
              </div>
            )}

            <div className="border-t border-gray-800 my-1"></div>

            <div
              onClick={() => {
                setOpenMenu(null);
                window.close();
              }}
              className="px-3 py-1.5 hover:bg-red-600/80 hover:text-white flex items-center justify-between cursor-pointer"
            >
              <span>Exit</span>
            </div>
          </div>
        )}
      </div>

      {/* View Menu */}
      <div className="relative">
        <button
          onClick={() => setOpenMenu(openMenu === 'view' ? null : 'view')}
          className={`px-2.5 py-1 rounded hover:bg-gray-800 transition-colors ${
            openMenu === 'view' ? 'bg-gray-800 text-white' : ''
          }`}
        >
          View
        </button>

        {openMenu === 'view' && (
          <div className="absolute left-0 top-full mt-0.5 w-44 bg-gray-900 border border-gray-700/80 rounded shadow-xl py-1 z-50 text-gray-200">
            <div
              onClick={() => {
                onSelectTab('build');
                setOpenMenu(null);
              }}
              className="px-3 py-1.5 hover:bg-blue-600 hover:text-white flex items-center justify-between cursor-pointer"
            >
              <span>New Project</span>
              <span className="text-[10px] text-gray-500 font-mono">Ctrl+1</span>
            </div>
            <div
              onClick={() => {
                onSelectTab('templates');
                setOpenMenu(null);
              }}
              className="px-3 py-1.5 hover:bg-blue-600 hover:text-white flex items-center justify-between cursor-pointer"
            >
              <span>Templates</span>
              <span className="text-[10px] text-gray-500 font-mono">Ctrl+2</span>
            </div>
            <div
              onClick={() => {
                onSelectTab('ingest');
                setOpenMenu(null);
              }}
              className="px-3 py-1.5 hover:bg-blue-600 hover:text-white flex items-center justify-between cursor-pointer"
            >
              <span>Media Ingest</span>
              <span className="text-[10px] text-gray-500 font-mono">Ctrl+3</span>
            </div>
          </div>
        )}
      </div>

      {/* Tools Menu */}
      <div className="relative">
        <button
          onClick={() => setOpenMenu(openMenu === 'tools' ? null : 'tools')}
          className={`px-2.5 py-1 rounded hover:bg-gray-800 transition-colors ${
            openMenu === 'tools' ? 'bg-gray-800 text-white' : ''
          }`}
        >
          Tools
        </button>

        {openMenu === 'tools' && (
          <div className="absolute left-0 top-full mt-0.5 w-56 bg-gray-900 border border-gray-700/80 rounded shadow-xl py-1 z-50 text-gray-200">
            <div
              onClick={handleOpenTemplatesDir}
              className="px-3 py-1.5 hover:bg-blue-600 hover:text-white flex items-center justify-between cursor-pointer"
            >
              <span>Open Templates Folder</span>
              <ExternalLink size={12} className="text-gray-400" />
            </div>
            <div
              onClick={handleOpenProjectsDir}
              className="px-3 py-1.5 hover:bg-blue-600 hover:text-white flex items-center justify-between cursor-pointer"
            >
              <span>Open Projects Folder</span>
              <ExternalLink size={12} className="text-gray-400" />
            </div>
            <div className="border-t border-gray-800 my-1"></div>
            <div
              onClick={() => {
                setOpenMenu(null);
                if (onOpenExtensionModal) onOpenExtensionModal();
              }}
              className="px-3 py-1.5 hover:bg-blue-600 hover:text-white flex items-center justify-between cursor-pointer text-blue-300 font-medium"
            >
              <span>Install Adobe Plugin (Premiere & AE)...</span>
              <span className="text-[10px] bg-blue-900/60 text-blue-200 px-1 rounded">CEP</span>
            </div>
            {onOpenMcpSetup && (
              <>
                <div className="border-t border-gray-800 my-1"></div>
                <div
                  onClick={() => {
                    setOpenMenu(null);
                    onOpenMcpSetup();
                  }}
                  className="px-3 py-1.5 hover:bg-purple-600 hover:text-white flex items-center justify-between cursor-pointer text-purple-300 font-medium"
                >
                  <span>AI Agent (MCP) Setup...</span>
                  <span className="text-[10px] bg-purple-900/60 text-purple-200 px-1 rounded">MCP</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Help Menu */}
      <div className="relative">
        <button
          onClick={() => setOpenMenu(openMenu === 'help' ? null : 'help')}
          className={`px-2.5 py-1 rounded hover:bg-gray-800 transition-colors ${
            openMenu === 'help' ? 'bg-gray-800 text-white' : ''
          }`}
        >
          Help
        </button>

        {openMenu === 'help' && (
          <div className="absolute left-0 top-full mt-0.5 w-48 bg-gray-900 border border-gray-700/80 rounded shadow-xl py-1 z-50 text-gray-200">
            <div
              onClick={() => {
                setOpenMenu(null);
                onOpenShortcuts();
              }}
              className="px-3 py-1.5 hover:bg-blue-600 hover:text-white flex items-center justify-between cursor-pointer"
            >
              <span>Keyboard Shortcuts</span>
              <span className="text-[10px] text-gray-500 font-mono">F1</span>
            </div>
            <div className="border-t border-gray-800 my-1"></div>
            <div
              onClick={() => {
                setOpenMenu(null);
                onOpenAbout();
              }}
              className="px-3 py-1.5 hover:bg-blue-600 hover:text-white cursor-pointer"
            >
              <span>About Scaffild...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

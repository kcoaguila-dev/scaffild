import { useState, useEffect } from 'react';
import ProjectBuilder from './ProjectBuilder';
import TemplateManager from './TemplateManager';
import MediaIngest from './MediaIngest';
import MenuBar, { RecentProjectItem } from './MenuBar';
import ShortcutsModal from './ShortcutsModal';
import AboutModal from './AboutModal';
import McpSetupModal from './McpSetupModal';
import ScaffildLogo from './ScaffildLogo';
import { invoke } from '@tauri-apps/api/core';

function App() {
  const [activeTab, setActiveTab] = useState<'build' | 'templates' | 'ingest'>('build');
  const [preselectedIngestDir, setPreselectedIngestDir] = useState<string>('');
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isMcpSetupOpen, setIsMcpSetupOpen] = useState(false);
  const [recentProjects, setRecentProjects] = useState<RecentProjectItem[]>(() => {
    try {
      const saved = localStorage.getItem('scaffild_recent_projects');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handleClearRecentProjects = () => {
    setRecentProjects([]);
    localStorage.removeItem('scaffild_recent_projects');
  };

  const handleAddRecentProject = (item: RecentProjectItem) => {
    setRecentProjects(prev => {
      const updated = [item, ...prev.filter(p => p.path !== item.path)].slice(0, 8);
      localStorage.setItem('scaffild_recent_projects', JSON.stringify(updated));
      return updated;
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        setIsShortcutsOpen(true);
      } else if (e.key === 'Escape') {
        setIsShortcutsOpen(false);
        setIsAboutOpen(false);
      } else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
        if (e.key === '1') {
          e.preventDefault();
          setActiveTab('build');
        } else if (e.key === '2') {
          e.preventDefault();
          setActiveTab('templates');
        } else if (e.key === '3') {
          e.preventDefault();
          setActiveTab('ingest');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNavigateToIngest = (targetDir: string) => {
    setPreselectedIngestDir(targetDir);
    setActiveTab('ingest');
  };

  const handleBrowseTargetDir = async () => {
    try {
      const selected = await invoke<string | null>('pick_directory');
      if (selected) {
        localStorage.setItem('scaffild_target_dir', selected);
        window.dispatchEvent(new CustomEvent('target-dir-changed', { detail: selected }));
      }
    } catch (e) {
      console.error('Failed to pick directory:', e);
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] text-gray-200 flex flex-col overflow-x-hidden select-none">
      {/* Top Menu Bar (Post Haste Style) */}
      <MenuBar
        onSelectTab={setActiveTab}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onOpenAbout={() => setIsAboutOpen(true)}
        onOpenMcpSetup={() => setIsMcpSetupOpen(true)}
        onBrowseTargetDir={handleBrowseTargetDir}
        recentProjects={recentProjects}
        onClearRecentProjects={handleClearRecentProjects}
        onNavigateToIngest={handleNavigateToIngest}
      />

      {/* Main App Header with Tabs */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5 text-base font-bold text-white tracking-wide select-none">
            <ScaffildLogo size={20} />
            <span className="bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">Scaffild</span>
          </div>
          <nav className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('build')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                activeTab === 'build' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              New Project
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                activeTab === 'templates' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              Templates
            </button>
            <button
              onClick={() => setActiveTab('ingest')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                activeTab === 'ingest' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
              }`}
            >
              Media Ingest
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto p-4 flex-grow w-full">
        {activeTab === 'build' && (
          <ProjectBuilder
            onProjectCreated={handleAddRecentProject}
          />
        )}
        {activeTab === 'templates' && <TemplateManager />}
        {activeTab === 'ingest' && <MediaIngest initialTargetDir={preselectedIngestDir} />}
      </main>

      {/* Modals */}
      <ShortcutsModal isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
      <McpSetupModal isOpen={isMcpSetupOpen} onClose={() => setIsMcpSetupOpen(false)} />
    </div>
  );
}

export default App;

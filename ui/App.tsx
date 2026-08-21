import { useState, useEffect } from 'react';
import ProjectBuilder from './ProjectBuilder';
import TemplateManager from './TemplateManager';
import MediaIngest from './MediaIngest';
import { Film } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState<'build' | 'templates' | 'ingest'>('build');
  const [preselectedIngestDir, setPreselectedIngestDir] = useState<string>('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
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

  return (
    <div className="min-h-screen bg-[#121212] text-gray-200">
      <header className="bg-gray-900 border-b border-gray-800 p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-xl font-bold text-white tracking-wide">
            <Film className="text-blue-500" />
            Scaffild
          </div>
          <nav className="flex gap-2">
            <button
              onClick={() => setActiveTab('build')}
              title="Ctrl + 1"
              className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'build' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-300 hover:bg-gray-850 hover:text-white'
              }`}
            >
              <span>New Project</span>
              <kbd className="text-[10px] px-1 py-0.5 rounded bg-gray-800/80 text-gray-400 font-mono">^1</kbd>
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              title="Ctrl + 2"
              className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'templates' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-300 hover:bg-gray-850 hover:text-white'
              }`}
            >
              <span>Templates</span>
              <kbd className="text-[10px] px-1 py-0.5 rounded bg-gray-800/80 text-gray-400 font-mono">^2</kbd>
            </button>
            <button
              onClick={() => setActiveTab('ingest')}
              title="Ctrl + 3"
              className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'ingest' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-400 hover:bg-gray-850 hover:text-gray-200'
              }`}
            >
              <span>Media Ingest</span>
              <kbd className="text-[10px] px-1 py-0.5 rounded bg-gray-800/80 text-gray-400 font-mono">^3</kbd>
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4">
        {activeTab === 'build' && <ProjectBuilder onNavigateToIngest={handleNavigateToIngest} />}
        {activeTab === 'templates' && <TemplateManager />}
        {activeTab === 'ingest' && <MediaIngest initialTargetDir={preselectedIngestDir} />}
      </main>
    </div>
  );
}

export default App;

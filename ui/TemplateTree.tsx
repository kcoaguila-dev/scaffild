import React, { useState, useEffect, useRef } from 'react';
import {
  Folder,
  FolderOpen,
  Plus,
  Trash2,
  GripVertical,
  FileText,
  FileCode,
  File,
  ChevronDown,
  Upload
} from 'lucide-react';

export interface TreeNodeData {
  id: string;
  name: string;
  children: TreeNodeData[];
}

export function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

export function fromRawStructure(raw: any[]): TreeNodeData[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(item => {
    if (typeof item === 'string') {
      return { id: generateId(), name: item, children: [] };
    } else if (typeof item === 'object' && item !== null) {
      const keys = Object.keys(item);
      if (keys.length > 0) {
        const name = keys[0];
        const childrenRaw = item[name];
        return {
          id: generateId(),
          name,
          children: Array.isArray(childrenRaw) ? fromRawStructure(childrenRaw) : []
        };
      }
    }
    return { id: generateId(), name: 'New Folder', children: [] };
  });
}

export function toRawStructure(nodes: TreeNodeData[]): any[] {
  return nodes.map(node => {
    if (node.children && node.children.length > 0) {
      return { [node.name]: toRawStructure(node.children) };
    } else {
      return node.name;
    }
  });
}

export function isFileItem(name: string): boolean {
  const parts = name.split('.');
  if (parts.length > 1) {
    const ext = parts[parts.length - 1].toLowerCase();
    return ['prproj', 'aep', 'psd', 'ai', 'c4d', 'txt', 'md', 'rtf', 'doc', 'docx', 'json', 'xml', 'csv', 'pdf', 'mp4', 'mov', 'wav', 'mp3'].includes(ext);
  }
  return false;
}

export function ItemIcon({ name, isFolder, expanded }: { name: string; isFolder: boolean; expanded?: boolean }) {
  if (isFolder) {
    return expanded ? (
      <FolderOpen size={18} className="text-amber-400 shrink-0" />
    ) : (
      <Folder size={18} className="text-amber-400 shrink-0" />
    );
  }

  const ext = name.split('.').pop()?.toLowerCase() || '';

  switch (ext) {
    case 'prproj':
      return (
        <span className="w-4 h-4 rounded bg-[#330033] text-[#EA77FF] border border-[#EA77FF]/50 text-[9px] font-black flex items-center justify-center shrink-0" title="Premiere Pro Project">
          Pr
        </span>
      );
    case 'psd':
      return (
        <span className="w-4 h-4 rounded bg-[#001E36] text-[#31A8FF] border border-[#31A8FF]/50 text-[9px] font-black flex items-center justify-center shrink-0" title="Photoshop File">
          Ps
        </span>
      );
    case 'aep':
      return (
        <span className="w-4 h-4 rounded bg-[#00005B] text-[#9999FF] border border-[#9999FF]/50 text-[9px] font-black flex items-center justify-center shrink-0" title="After Effects Project">
          Ae
        </span>
      );
    case 'ai':
      return (
        <span className="w-4 h-4 rounded bg-[#330000] text-[#FF9A00] border border-[#FF9A00]/50 text-[9px] font-black flex items-center justify-center shrink-0" title="Illustrator File">
          Ai
        </span>
      );
    case 'txt':
    case 'rtf':
      return <FileText size={16} className="text-gray-300 shrink-0" />;
    case 'md':
      return <FileCode size={16} className="text-blue-300 shrink-0" />;
    default:
      return <File size={16} className="text-gray-400 shrink-0" />;
  }
}

import { TemplateParam } from './ProjectBuilder';

interface TemplateTreeProps {
  structure: any[];
  parameters?: TemplateParam[];
  onChange: (newStructure: any[]) => void;
  onImportFolder?: () => void;
}

const PRESET_ITEMS = [
  { label: 'New Folder', name: 'New Folder', isFolder: true },
  { label: 'Adobe Premiere Pro Project ([project].prproj)', name: '[project].prproj', isFolder: false },
  { label: 'Adobe Photoshop File ([project]_Thumbnail.psd)', name: '[project]_Thumbnail.psd', isFolder: false },
  { label: 'Adobe After Effects Project ([project].aep)', name: '[project].aep', isFolder: false },
  { label: 'Adobe Illustrator File ([project].ai)', name: '[project].ai', isFolder: false },
  { label: 'Text Document (Notes.txt)', name: 'Notes.txt', isFolder: false },
  { label: 'Markdown Document (README.md)', name: 'README.md', isFolder: false },
];

export default function TemplateTree({ structure, parameters, onChange, onImportFolder }: TemplateTreeProps) {
  const [nodes, setNodes] = useState<TreeNodeData[]>([]);
  const [isInternalUpdate, setIsInternalUpdate] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isInternalUpdate) {
      setIsInternalUpdate(false);
      return;
    }
    const currentRaw = toRawStructure(nodes);
    if (JSON.stringify(currentRaw) !== JSON.stringify(structure)) {
      setNodes(fromRawStructure(structure || []));
    }
  }, [structure]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setShowAddMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const triggerChange = (newNodes: TreeNodeData[]) => {
    setNodes(newNodes);
    setIsInternalUpdate(true);
    onChange(toRawStructure(newNodes));
  };

  const handleAddPreset = (name: string) => {
    triggerChange([...nodes, { id: generateId(), name, children: [] }]);
    setShowAddMenu(false);
  };

  return (
    <div className="bg-gray-800 rounded p-4 border border-gray-700 flex flex-col h-full">
      <div className="flex-grow overflow-y-auto min-h-[300px] max-h-[500px]">
        {nodes.length === 0 ? (
          <div className="text-gray-400 my-8 text-center text-sm">
            No folders or files in this template. Click "Add" below to start.
          </div>
        ) : (
          <SortableTree
            nodes={nodes}
            parentId="root"
            parameters={parameters}
            onChange={triggerChange}
            onImportFolder={onImportFolder}
          />
        )}
      </div>

      <div className="flex items-center gap-3 pt-3 border-t border-gray-700 mt-2 relative">
        <div className="relative" ref={addMenuRef}>
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded text-sm text-white font-medium transition-colors shadow-sm"
          >
            <Plus size={16} /> Add <ChevronDown size={14} />
          </button>

          {showAddMenu && (
            <div className="absolute bottom-full left-0 mb-1 w-72 bg-gray-900 border border-gray-700 rounded-md shadow-2xl py-1 z-50 text-xs">
              <div className="px-3 py-1 text-gray-400 font-semibold uppercase tracking-wider text-[10px]">
                Insert Template Item
              </div>
              {PRESET_ITEMS.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAddPreset(item.name)}
                  className="w-full text-left px-3 py-1.5 hover:bg-blue-600 hover:text-white flex items-center gap-2 text-gray-200 transition-colors"
                >
                  <ItemIcon name={item.name} isFolder={item.isFolder} />
                  <span>{item.label}</span>
                </button>
              ))}
              {onImportFolder && (
                <>
                  <div className="border-t border-gray-700 my-1"></div>
                  <button
                    onClick={() => {
                      setShowAddMenu(false);
                      onImportFolder();
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-purple-600 hover:text-white flex items-center gap-2 text-purple-300 font-medium transition-colors"
                  >
                    <Upload size={14} />
                    <span>Import Folder Structure...</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {onImportFolder && (
          <button
            onClick={onImportFolder}
            className="flex items-center gap-1.5 bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded text-sm text-gray-200 font-medium transition-colors border border-gray-600"
          >
            <Upload size={14} /> Import Folder Structure
          </button>
        )}
      </div>
    </div>
  );
}

function SortableTree({
  nodes,
  parentId,
  parameters,
  onChange,
  onImportFolder
}: {
  nodes: TreeNodeData[];
  parentId: string;
  parameters?: TemplateParam[];
  onChange: (nodes: TreeNodeData[]) => void;
  onImportFolder?: () => void;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      {nodes.map((node, index) => (
        <NodeItem
          key={node.id}
          node={node}
          index={index}
          parentId={parentId}
          parameters={parameters}
          onUpdate={(updatedNode) => {
            const newNodes = [...nodes];
            newNodes[index] = updatedNode;
            onChange(newNodes);
          }}
          onDelete={() => {
            const newNodes = nodes.filter((_, i) => i !== index);
            onChange(newNodes);
          }}
          onReorder={(dragIndex, dropIndex) => {
            const newNodes = [...nodes];
            const [removed] = newNodes.splice(dragIndex, 1);
            newNodes.splice(dropIndex, 0, removed);
            onChange(newNodes);
          }}
          onImportFolder={onImportFolder}
        />
      ))}
    </div>
  );
}

function NodeItem({
  node,
  index,
  parentId,
  parameters,
  onUpdate,
  onDelete,
  onReorder,
  onImportFolder
}: {
  node: TreeNodeData;
  index: number;
  parentId: string;
  parameters?: TemplateParam[];
  onUpdate: (node: TreeNodeData) => void;
  onDelete: () => void;
  onReorder: (dragIndex: number, dropIndex: number) => void;
  onImportFolder?: () => void;
}) {
  const isFolder = !isFileItem(node.name) || node.children.length > 0;
  const [expanded, setExpanded] = useState(true);
  const [showNodeMenu, setShowNodeMenu] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const nodeMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (nodeMenuRef.current && !nodeMenuRef.current.contains(e.target as Node)) {
        setShowNodeMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ ...node, name: e.target.value });
  };

  const insertVariable = (variable: string) => {
    const varText = variable === 'project' ? '[project]' : `{{${variable}}}`;
    if (inputRef.current) {
      const start = inputRef.current.selectionStart || 0;
      const end = inputRef.current.selectionEnd || 0;
      const newName = node.name.substring(0, start) + varText + node.name.substring(end);
      onUpdate({ ...node, name: newName });

      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          const newPos = start + varText.length;
          inputRef.current.setSelectionRange(newPos, newPos);
        }
      }, 0);
    } else {
      onUpdate({ ...node, name: node.name + varText });
    }
  };

  const handleAddChild = (childName = 'New Folder') => {
    onUpdate({
      ...node,
      children: [...node.children, { id: generateId(), name: childName, children: [] }]
    });
    setExpanded(true);
    setShowNodeMenu(false);
  };

  const handleDelete = () => {
    if (node.children.length > 0) {
      if (!window.confirm(`Are you sure you want to delete "${node.name}" and all its contents?`)) {
        return;
      }
    }
    onDelete();
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ parentId, index }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (!dataStr) return;
      const data = JSON.parse(dataStr);
      if (data.parentId === parentId && data.index !== index) {
        onReorder(data.index, index);
      }
    } catch (err) {
      // ignore
    }
  };

  return (
    <div className="flex flex-col ml-4">
      <div
        className="flex items-center gap-2 group py-1 hover:bg-gray-700/50 rounded pr-2 border border-transparent hover:border-gray-600 transition-colors relative"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div
          draggable
          onDragStart={handleDragStart}
          className="cursor-grab text-gray-500 hover:text-gray-300 active:cursor-grabbing p-0.5"
        >
          <GripVertical size={14} />
        </div>

        {isFolder ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-gray-400 hover:text-white p-0.5"
          >
            <ItemIcon name={node.name} isFolder={true} expanded={expanded} />
          </button>
        ) : (
          <div className="p-0.5">
            <ItemIcon name={node.name} isFolder={false} />
          </div>
        )}

        <input
          ref={inputRef}
          value={node.name}
          onChange={handleNameChange}
          placeholder="Folder or File Name"
          className={`bg-transparent border-b border-transparent hover:border-gray-600 focus:border-blue-500 focus:outline-none px-1 text-sm flex-grow min-w-[150px] font-medium ${
            !isFolder ? 'text-blue-100 font-mono text-xs' : 'text-gray-100'
          }`}
        />

        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity relative">
          <select
            onChange={(e) => {
              if (e.target.value) {
                insertVariable(e.target.value);
                e.target.value = '';
              }
            }}
            className="bg-gray-800 text-xs text-gray-300 border border-gray-600 rounded px-1 py-0.5 focus:outline-none focus:border-blue-500 mr-1"
            title="Insert Variable"
          >
            <option value="">{`{ }`}</option>
            <option value="project">[project]</option>
            {(parameters || [
              { name: 'id', label: 'Project ID' },
              { name: 'title', label: 'Title' },
              { name: 'date', label: 'Date' },
              { name: 'editor', label: 'Editor' }
            ]).map(p => (
              <option key={p.name} value={p.name}>{p.name}</option>
            ))}
          </select>

          {isFolder && (
            <div className="relative" ref={nodeMenuRef}>
              <button
                onClick={() => setShowNodeMenu(!showNodeMenu)}
                className="p-1 text-gray-400 hover:text-green-400 hover:bg-gray-600 rounded transition-colors flex items-center"
                title="Add inside folder"
              >
                <Plus size={14} />
              </button>

              {showNodeMenu && (
                <div className="absolute right-0 top-full mt-1 w-64 bg-gray-900 border border-gray-700 rounded-md shadow-2xl py-1 z-50 text-xs">
                  <div className="px-3 py-1 text-gray-400 font-semibold uppercase tracking-wider text-[10px]">
                    Add into "{node.name}"
                  </div>
                  {PRESET_ITEMS.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAddChild(item.name)}
                      className="w-full text-left px-3 py-1.5 hover:bg-blue-600 hover:text-white flex items-center gap-2 text-gray-200 transition-colors"
                    >
                      <ItemIcon name={item.name} isFolder={item.isFolder} />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleDelete}
            className="p-1 text-gray-400 hover:text-red-400 hover:bg-gray-600 rounded transition-colors"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {expanded && node.children.length > 0 && (
        <div className="border-l border-gray-700 ml-2.5 pl-1.5 mt-0.5">
          <SortableTree
            nodes={node.children}
            parentId={node.id}
            parameters={parameters}
            onChange={(newChildren) => onUpdate({ ...node, children: newChildren })}
            onImportFolder={onImportFolder}
          />
        </div>
      )}
    </div>
  );
}

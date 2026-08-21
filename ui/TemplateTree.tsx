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
      <FolderOpen size={16} className="text-amber-400 shrink-0" />
    ) : (
      <Folder size={16} className="text-amber-400 shrink-0" />
    );
  }

  const ext = name.split('.').pop()?.toLowerCase() || '';

  switch (ext) {
    case 'prproj':
      return (
        <span className="w-5 h-5 rounded bg-[#2a002e] text-[#ea77ff] border border-[#ea77ff]/60 text-[10px] font-bold flex items-center justify-center shrink-0 tracking-tighter" title="Premiere Pro Project">
          Pr
        </span>
      );
    case 'psd':
      return (
        <span className="w-5 h-5 rounded bg-[#001d36] text-[#31a8ff] border border-[#31a8ff]/60 text-[10px] font-bold flex items-center justify-center shrink-0 tracking-tighter" title="Photoshop File">
          Ps
        </span>
      );
    case 'aep':
      return (
        <span className="w-5 h-5 rounded bg-[#00004d] text-[#9999ff] border border-[#9999ff]/60 text-[10px] font-bold flex items-center justify-center shrink-0 tracking-tighter" title="After Effects Project">
          Ae
        </span>
      );
    case 'ai':
      return (
        <span className="w-5 h-5 rounded bg-[#2b1600] text-[#ff9a00] border border-[#ff9a00]/60 text-[10px] font-bold flex items-center justify-center shrink-0 tracking-tighter" title="Illustrator File">
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
  parameters?: (TemplateParam | string)[];
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
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
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

  const deleteNodeById = (nodeList: TreeNodeData[], targetId: string): TreeNodeData[] => {
    return nodeList
      .filter(n => n.id !== targetId)
      .map(n => ({
        ...n,
        children: deleteNodeById(n.children, targetId)
      }));
  };

  const handleRemoveSelected = () => {
    if (!selectedNodeId) return;
    const updated = deleteNodeById(nodes, selectedNodeId);
    setSelectedNodeId(null);
    triggerChange(updated);
  };

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex-grow overflow-y-auto p-3">
        {nodes.length === 0 ? (
          <div className="text-gray-400 my-16 text-center text-xs italic">
            No folders or files in this template. Click "Add" below to start.
          </div>
        ) : (
          <SortableTree
            nodes={nodes}
            parentId="root"
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
            parameters={parameters}
            onChange={triggerChange}
            onImportFolder={onImportFolder}
          />
        )}
      </div>

      {/* Post Haste Style Bottom Bar: Add & Remove */}
      <div className="bg-gray-850 px-3 py-2 border-t border-gray-700 flex items-center gap-2 mt-auto relative">
        <div className="relative" ref={addMenuRef}>
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="bg-gray-700 hover:bg-gray-600 text-white text-xs font-semibold py-1.5 px-3 rounded transition-colors border border-gray-600 flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Plus size={13} /> Add <ChevronDown size={11} />
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
                    <Upload size={13} />
                    <span>Import Folder Structure...</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <button
          onClick={handleRemoveSelected}
          disabled={!selectedNodeId}
          className={`text-xs font-semibold py-1.5 px-3 rounded transition-colors border flex items-center justify-center gap-1 ${
            selectedNodeId
              ? 'bg-gray-700 hover:bg-red-700 text-gray-200 hover:text-white border-gray-600 hover:border-red-600'
              : 'bg-gray-800 text-gray-500 border-gray-700 cursor-not-allowed'
          }`}
        >
          <Trash2 size={13} /> Remove
        </button>
      </div>
    </div>
  );
}

function SortableTree({
  nodes,
  parentId,
  selectedNodeId,
  onSelectNode,
  parameters,
  onChange,
  onImportFolder
}: {
  nodes: TreeNodeData[];
  parentId: string;
  selectedNodeId: string | null;
  onSelectNode: (id: string) => void;
  parameters?: (TemplateParam | string)[];
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
          selectedNodeId={selectedNodeId}
          onSelectNode={onSelectNode}
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
  selectedNodeId,
  onSelectNode,
  parameters,
  onUpdate,
  onDelete,
  onReorder,
  onImportFolder,
}: {
  node: TreeNodeData;
  index: number;
  parentId: string;
  selectedNodeId: string | null;
  onSelectNode: (id: string) => void;
  parameters?: (TemplateParam | string)[];
  onUpdate: (node: TreeNodeData) => void;
  onDelete: () => void;
  onReorder: (dragIndex: number, dropIndex: number) => void;
  onImportFolder?: () => void;
}) {
  const isFolder = !isFileItem(node.name) || node.children.length > 0;
  const isSelected = selectedNodeId === node.id;
  const [expanded, setExpanded] = useState(true);
  const [showNodeMenu, setShowNodeMenu] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const nodeMenuRef = useRef<HTMLDivElement>(null);

  const availableParams = (parameters || ['id', 'title', 'date', 'editor']).map(p =>
    typeof p === 'string' ? { name: p, label: p } : p
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (nodeMenuRef.current && !nodeMenuRef.current.contains(e.target as Node)) {
        setShowNodeMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [selectionRange, setSelectionRange] = useState<[number, number] | null>(null);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ ...node, name: e.target.value });
  };

  const insertVariable = (variable: string) => {
    const varText = variable === 'project' ? '[project]' : `{{${variable}}}`;
    const dotIndex = node.name.lastIndexOf('.');

    if (selectionRange && selectionRange[0] !== selectionRange[1]) {
      // If user highlighted a portion of text, replace the selection
      const [start, end] = selectionRange;
      const newName = node.name.substring(0, start) + varText + node.name.substring(end);
      onUpdate({ ...node, name: newName });
    } else if (dotIndex > 0 && isFileItem(node.name)) {
      // It's a file with an extension (e.g. _PROJECT_TEMPLATE.prproj)
      const ext = node.name.substring(dotIndex);
      const stem = node.name.substring(0, dotIndex);

      if (stem.includes('_PROJECT_TEMPLATE') || stem.includes('PROJECT_TEMPLATE') || stem === 'template' || stem === 'New File') {
        const remainingSuffix = stem.replace(/_?PROJECT_TEMPLATE/i, '');
        onUpdate({ ...node, name: `${varText}${remainingSuffix}${ext}` });
      } else {
        onUpdate({ ...node, name: `${varText}${ext}` });
      }
    } else {
      // It's a folder or plain name
      if (node.name === 'New Folder' || node.name.includes('PROJECT_TEMPLATE')) {
        onUpdate({ ...node, name: varText });
      } else {
        onUpdate({ ...node, name: `${node.name}_${varText}` });
      }
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
    <div className={`flex flex-col ${parentId !== 'root' ? 'ml-3.5 pl-2.5 border-l border-gray-700/70' : ''}`}>
      <div
        onClick={() => onSelectNode(node.id)}
        className={`flex items-center gap-1.5 group py-1 px-1.5 rounded border transition-colors relative cursor-pointer ${
          isSelected
            ? 'bg-blue-600/25 border-blue-500/70 text-white'
            : 'border-transparent hover:bg-gray-700/40 hover:border-gray-700'
        }`}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div
          draggable
          onDragStart={handleDragStart}
          className="cursor-grab text-gray-500 hover:text-gray-300 active:cursor-grabbing p-0.5 shrink-0"
        >
          <GripVertical size={13} />
        </div>

        {isFolder ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="text-gray-400 hover:text-white p-0.5 shrink-0"
          >
            <ItemIcon name={node.name} isFolder={true} expanded={expanded} />
          </button>
        ) : (
          <div className="p-0.5 shrink-0">
            <ItemIcon name={node.name} isFolder={false} />
          </div>
        )}

        <input
          ref={inputRef}
          value={node.name}
          onChange={handleNameChange}
          onSelect={(e) => {
            const target = e.target as HTMLInputElement;
            setSelectionRange([target.selectionStart || 0, target.selectionEnd || 0]);
          }}
          onClick={(e) => e.stopPropagation()}
          placeholder="Folder or File Name"
          className={`bg-transparent border border-transparent hover:border-gray-600 focus:border-blue-500 focus:bg-gray-900/60 rounded px-1.5 py-0.5 text-xs flex-grow min-w-[140px] font-medium outline-none transition-colors ${
            !isFolder ? 'text-cyan-200 font-mono' : 'text-gray-100'
          }`}
        />

        <div
          className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity relative shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <select
            onChange={(e) => {
              if (e.target.value) {
                insertVariable(e.target.value);
                e.target.value = '';
              }
            }}
            className="bg-gray-900 text-[11px] text-gray-300 border border-gray-600 rounded px-1.5 py-0.5 focus:outline-none focus:border-blue-500"
            title="Insert Variable Token"
          >
            <option value="">{`{ }`}</option>
            <option value="project">[project]</option>
            {availableParams.map(p => (
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
                <Plus size={13} />
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
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {expanded && node.children.length > 0 && (
        <div className="mt-0.5">
          <SortableTree
            nodes={node.children}
            parentId={node.id}
            selectedNodeId={selectedNodeId}
            onSelectNode={onSelectNode}
            parameters={parameters}
            onChange={(newChildren) => onUpdate({ ...node, children: newChildren })}
            onImportFolder={onImportFolder}
          />
        </div>
      )}
    </div>
  );
}

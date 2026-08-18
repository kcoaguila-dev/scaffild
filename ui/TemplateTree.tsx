import React, { useState, useEffect, useRef } from 'react';
import { Folder, FolderOpen, Plus, FolderPlus, Trash2, GripVertical } from 'lucide-react';

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

import { TemplateParam } from './ProjectBuilder';

interface TemplateTreeProps {
  structure: any[];
  parameters?: TemplateParam[];
  onChange: (newStructure: any[]) => void;
}

export default function TemplateTree({ structure, parameters, onChange }: TemplateTreeProps) {
  const [nodes, setNodes] = useState<TreeNodeData[]>([]);
  const [isInternalUpdate, setIsInternalUpdate] = useState(false);

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

  const triggerChange = (newNodes: TreeNodeData[]) => {
    setNodes(newNodes);
    setIsInternalUpdate(true);
    onChange(toRawStructure(newNodes));
  };

  const handleAddRootFolder = () => {
    triggerChange([...nodes, { id: generateId(), name: 'New Folder', children: [] }]);
  };

  return (
    <div className="bg-gray-800 rounded p-4 border border-gray-700">
      {nodes.length === 0 ? (
        <div className="text-gray-400 mb-4 text-sm">No folders in this template.</div>
      ) : (
        <SortableTree
          nodes={nodes}
          parentId="root"
          parameters={parameters}
          onChange={triggerChange}
        />
      )}
      <button
        onClick={handleAddRootFolder}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded text-sm mt-4 text-white font-medium transition-colors"
      >
        <FolderPlus size={16} /> Add Root Folder
      </button>
    </div>
  );
}

function SortableTree({ nodes, parentId, parameters, onChange }: { nodes: TreeNodeData[], parentId: string, parameters?: TemplateParam[], onChange: (nodes: TreeNodeData[]) => void }) {
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
          onAddSibling={() => {
            const newNodes = [...nodes];
            newNodes.splice(index + 1, 0, { id: generateId(), name: 'New Folder', children: [] });
            onChange(newNodes);
          }}
          onReorder={(dragIndex, dropIndex) => {
             const newNodes = [...nodes];
             const [removed] = newNodes.splice(dragIndex, 1);
             newNodes.splice(dropIndex, 0, removed);
             onChange(newNodes);
          }}
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
  onAddSibling,
  onReorder
}: {
  node: TreeNodeData;
  index: number;
  parentId: string;
  parameters?: TemplateParam[];
  onUpdate: (node: TreeNodeData) => void;
  onDelete: () => void;
  onAddSibling: () => void;
  onReorder: (dragIndex: number, dropIndex: number) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ ...node, name: e.target.value });
  };

  const insertVariable = (variable: string) => {
    if (inputRef.current) {
      const start = inputRef.current.selectionStart || 0;
      const end = inputRef.current.selectionEnd || 0;
      const newName = node.name.substring(0, start) + `{{${variable}}}` + node.name.substring(end);
      onUpdate({ ...node, name: newName });

      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          const newPos = start + `{{${variable}}}`.length;
          inputRef.current.setSelectionRange(newPos, newPos);
        }
      }, 0);
    } else {
      onUpdate({ ...node, name: node.name + `{{${variable}}}` });
    }
  };

  const handleAddChild = () => {
    onUpdate({
      ...node,
      children: [...node.children, { id: generateId(), name: 'New Folder', children: [] }]
    });
    setExpanded(true);
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
        className="flex items-center gap-2 group py-1.5 hover:bg-gray-700/50 rounded pr-2 border border-transparent hover:border-gray-600 transition-colors"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div
          draggable
          onDragStart={handleDragStart}
          className="cursor-grab text-gray-500 hover:text-gray-300 active:cursor-grabbing p-1"
        >
          <GripVertical size={16} />
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="text-gray-400 hover:text-white"
        >
          {expanded ? <FolderOpen size={18} /> : <Folder size={18} />}
        </button>

        <input
          ref={inputRef}
          value={node.name}
          onChange={handleNameChange}
          placeholder="Folder Name"
          className="bg-transparent border-b border-transparent hover:border-gray-600 focus:border-blue-500 focus:outline-none px-1 text-sm flex-grow min-w-[150px] font-medium"
        />

        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
          <select
            onChange={(e) => {
              if (e.target.value) {
                insertVariable(e.target.value);
                e.target.value = "";
              }
            }}
            className="bg-gray-800 text-xs text-gray-300 border border-gray-600 rounded px-1 py-1 focus:outline-none focus:border-blue-500 mr-1"
            title="Insert Variable"
          >
            <option value="">{`{ }`}</option>
            {(parameters || [
              { name: 'id', label: 'Project ID' },
              { name: 'title', label: 'Title' },
              { name: 'date', label: 'Date' },
              { name: 'editor', label: 'Editor' }
            ]).map(p => (
              <option key={p.name} value={p.name}>{p.name}</option>
            ))}
          </select>

          <button onClick={onAddSibling} className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-gray-600 rounded transition-colors" title="Add Sibling">
            <Plus size={16} />
          </button>

          <button onClick={handleAddChild} className="p-1.5 text-gray-400 hover:text-green-400 hover:bg-gray-600 rounded transition-colors" title="Add Child">
            <FolderPlus size={16} />
          </button>

          <button onClick={handleDelete} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-600 rounded transition-colors" title="Delete">
            <Trash2 size={16} />
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
          />
        </div>
      )}
    </div>
  );
}

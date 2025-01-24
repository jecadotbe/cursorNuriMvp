
import { BookMarked, Edit2, Trash2 } from "lucide-react";
import { useEffect, useState } from 'react';

interface MemberActionMenuProps {
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
  onMemory: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function MemberActionMenu({ isOpen, onClose, position, onMemory, onEdit, onDelete }: MemberActionMenuProps) {
  const [menuPosition, setMenuPosition] = useState(position);

  useEffect(() => {
    if (isOpen) {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const menuWidth = 150;
      const menuHeight = 160;

      let x = Math.max(8, Math.min(position.x, viewportWidth - menuWidth - 8));
      let y = Math.max(8, Math.min(position.y, viewportHeight - menuHeight - 8));

      setMenuPosition({ x, y });

      const handleClickOutside = (e: MouseEvent | TouchEvent) => {
        if (!(e.target as Element).closest('.member-menu')) {
          onClose();
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
      };
    }
  }, [isOpen, onClose, position]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed z-[1000] animate-in fade-in slide-in-from-top-1 duration-200 member-menu"
      style={{
        left: menuPosition.x,
        top: menuPosition.y,
        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-white rounded-lg shadow-lg p-2 min-w-[150px]">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMemory();
            onClose();
          }}
          className="flex items-center space-x-2 w-full p-2 hover:bg-gray-100 rounded"
        >
          <BookMarked className="w-4 h-4 text-purple-500" />
          <span>Add Memory</span>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
            onClose();
          }}
          className="flex items-center space-x-2 w-full p-2 hover:bg-gray-100 rounded"
        >
          <Edit2 className="w-4 h-4 text-gray-500" />
          <span>Edit</span>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
            onClose();
          }}
          className="flex items-center space-x-2 w-full p-2 hover:bg-gray-100 rounded text-red-500"
        >
          <Trash2 className="w-4 h-4" />
          <span>Delete</span>
        </button>
      </div>
    </div>
  );
}

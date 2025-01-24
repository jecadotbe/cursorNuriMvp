
import { BookMarked, Edit2, Trash2 } from "lucide-react";

interface MemberActionMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onMemory: () => void;
  onEdit: () => void;
  onDelete: () => void;
  position: { x: number; y: number };
}

export function MemberActionMenu({ 
  isOpen, 
  onClose, 
  onMemory, 
  onEdit, 
  onDelete,
  position 
}: MemberActionMenuProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed z-50 animate-in fade-in slide-in-from-top-1 duration-200"
      style={{
        left: position.x,
        top: position.y,
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

import { useState, useRef } from "react";
import { useVillage } from "@/hooks/use-village";
import { ChevronLeft, Plus, ZoomIn, ZoomOut, RotateCcw, Edit2, Trash2, User, ArrowUpCircle, ArrowDownCircle, ArrowLeftCircle, ArrowRightCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import Draggable from "react-draggable";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { motion, AnimatePresence } from "framer-motion";
import MinimapView from "@/components/MinimapView";

const CATEGORY_COLORS = {
  informeel: "#22c55e", // Green
  formeel: "#3b82f6",   // Blue
  inspiratie: "#f59e0b", // Orange
} as const;

// Match interface with schema.ts VillageMember type
interface NewVillageMember {
  name: string;
  type: string;
  circle: number;
  category: "informeel" | "formeel" | "inspiratie" | null;
  contactFrequency: "S" | "M" | "L" | "XL" | null;
}

export default function VillageView() {
  const { members, addMember, updateMember, deleteMember } = useVillage();
  const { toast } = useToast();
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [newMember, setNewMember] = useState<NewVillageMember>({
    name: "",
    type: "individual",
    circle: 1,
    category: "informeel",
    contactFrequency: "M"
  });
  const [memberToEdit, setMemberToEdit] = useState<typeof members[0] | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<typeof members[0] | null>(null);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.1, 3));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.1, 0.3));
  };

  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const getCircleRadius = (index: number) => {
    const baseRadius = 80;
    return baseRadius * (index + 1);
  };

  const snapToCircle = (x: number, y: number, circle: number) => {
    const radius = getCircleRadius(circle - 1);
    const angle = Math.atan2(y, x);
    const normalizedAngle = (angle + 2 * Math.PI) % (2 * Math.PI); // Ensure positive angle
    return {
      x: Math.cos(normalizedAngle) * radius,
      y: Math.sin(normalizedAngle) * radius,
      angle: normalizedAngle
    };
  };

  const getMemberPosition = (member: typeof members[0]) => {
    const radius = getCircleRadius(member.circle - 1);
    // Convert stored angle to radians (or use default spacing if no angle stored)
    let angle: number;
    if (typeof member.positionAngle === 'string') {
      angle = parseFloat(member.positionAngle);
    } else if (typeof member.positionAngle === 'number') {
      angle = member.positionAngle;
    } else {
      angle = 2 * Math.PI * Math.random(); // Fallback for members without stored position
    }

    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    };
  };

  const calculateAngleFromPosition = (x: number, y: number) => {
    return Math.atan2(y, x);
  };

  // Touch event handlers
  const lastTouchDistance = useRef<number>(0);
  const lastTouchPos = useRef<{ x: number; y: number } | null>(null);

  const handleTouch = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Handle pinch zoom
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(
        touch1.clientX - touch2.clientX,
        touch1.clientY - touch2.clientY
      );

      if (!lastTouchDistance.current) {
        lastTouchDistance.current = dist;
        return;
      }

      const delta = dist - lastTouchDistance.current;
      lastTouchDistance.current = dist;

      setScale(prevScale => Math.min(Math.max(prevScale + delta * 0.01, 0.3), 3));
    } else if (e.touches.length === 1) {
      // Handle pan
      const touch = e.touches[0];
      if (!lastTouchPos.current) {
        lastTouchPos.current = { x: touch.clientX, y: touch.clientY };
        return;
      }

      const deltaX = touch.clientX - lastTouchPos.current.x;
      const deltaY = touch.clientY - lastTouchPos.current.y;

      lastTouchPos.current = { x: touch.clientX, y: touch.clientY };

      setPosition(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.target instanceof Element && e.target.closest('.member-pill')) {
      return;
    }
    setIsDragging(true);
    lastTouchDistance.current = 0;
    lastTouchPos.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    handleTouch(e);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    lastTouchDistance.current = 0;
    lastTouchPos.current = null;
  };

  const handlePanStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (e.target instanceof Element && e.target.closest('.member-pill')) {
      return;
    }
    setIsDragging(true);
  };

  const handlePanMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;

    if ('touches' in e) {
      const touch = e.touches[0];
      const prevTouch = e.touches[1] || e.touches[0];
      setPosition(prev => ({
        x: prev.x + (touch.clientX - prevTouch.clientX),
        y: prev.y + (touch.clientY - prevTouch.clientY)
      }));
    } else {
      setPosition(prev => ({
        x: prev.x + (e as React.MouseEvent).movementX,
        y: prev.y + (e as React.MouseEvent).movementY
      }));
    }
  };

  const handlePanEnd = () => {
    setIsDragging(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMember.name.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Name is required"
      });
      return;
    }

    try {
      if (memberToEdit) {
        await updateMember({
          id: memberToEdit.id,
          name: newMember.name,
          type: newMember.type,
          circle: newMember.circle,
          category: newMember.category,
          contactFrequency: newMember.contactFrequency,
          positionAngle: memberToEdit.positionAngle
        });
        setMemberToEdit(null);
      } else {
        await addMember(newMember);
      }
      setIsOpen(false);
      setNewMember({
        name: "",
        type: "individual",
        circle: 1,
        category: "informeel",
        contactFrequency: "M"
      });
      toast({
        title: "Success",
        description: memberToEdit ? "Member updated successfully" : "Member added successfully"
      });
    } catch (error) {
      console.error('Submit error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save member. Please try again."
      });
    }
  };

  const handleEdit = (member: typeof members[0]) => {
    setMemberToEdit(member);
    setNewMember({
      name: member.name,
      type: member.type,
      circle: member.circle,
      category: member.category || "informeel",
      contactFrequency: member.contactFrequency || "M"
    });
    setIsOpen(true);
  };

  const handleDelete = async () => {
    if (!memberToDelete) return;

    try {
      await deleteMember(memberToDelete.id);
      setMemberToDelete(null);
      toast({
        title: "Success",
        description: "Member removed successfully"
      });
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete member. Please try again."
      });
    }
  };

  // Add new function to check if a point is within viewport
  const isInViewport = (x: number, y: number, scale: number, position: { x: number, y: number }) => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Transform point coordinates based on scale and position
    const transformedX = (x * scale) + position.x;
    const transformedY = (y * scale) + position.y;

    // Add padding to viewport bounds
    const padding = 50;

    return (
      transformedX >= -padding &&
      transformedX <= viewportWidth + padding &&
      transformedY >= -padding &&
      transformedY <= viewportHeight + padding
    );
  };

  // Add function to get indicator position and direction
  const getIndicatorInfo = (memberX: number, memberY: number, scale: number, position: { x: number, y: number }) => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const padding = 40;

    // Transform coordinates
    const transformedX = (memberX * scale) + position.x;
    const transformedY = (memberY * scale) + position.y;

    // Calculate angle from viewport center to member
    const centerX = viewportWidth / 2;
    const centerY = viewportHeight / 2;
    const angle = Math.atan2(transformedY - centerY, transformedX - centerX);

    // Determine position along viewport edge
    let indicatorX = centerX;
    let indicatorY = centerY;
    const border = 60;

    if (Math.abs(Math.cos(angle)) > Math.abs(Math.sin(angle))) {
      // Place on left or right edge
      indicatorX = transformedX < centerX ? border : viewportWidth - border;
      indicatorY = centerY + Math.tan(angle) * (indicatorX - centerX);

      // Clamp Y position
      indicatorY = Math.max(border, Math.min(viewportHeight - border, indicatorY));
    } else {
      // Place on top or bottom edge
      indicatorY = transformedY < centerY ? border : viewportHeight - border;
      indicatorX = centerX + (indicatorY - centerY) / Math.tan(angle);

      // Clamp X position
      indicatorX = Math.max(border, Math.min(viewportWidth - border, indicatorX));
    }

    // Determine which arrow to show
    let Arrow;
    if (transformedY < centerY && Math.abs(Math.sin(angle)) > Math.abs(Math.cos(angle))) {
      Arrow = ArrowUpCircle;
    } else if (transformedY > centerY && Math.abs(Math.sin(angle)) > Math.abs(Math.cos(angle))) {
      Arrow = ArrowDownCircle;
    } else if (transformedX < centerX) {
      Arrow = ArrowLeftCircle;
    } else {
      Arrow = ArrowRightCircle;
    }

    return { x: indicatorX, y: indicatorY, Arrow };
  };

  const handleMinimapNavigate = (x: number, y: number) => {
    setPosition({ x, y });
  };

  return (
    <div className="flex flex-col h-screen bg-[#F2F0E5]">
      {/* Header */}
      <div
        className="fixed top-0 left-0 right-0 z-50 p-4">
        <Link href="/">
          <div className="flex items-center space-x-4 cursor-pointer mb-8">
            <ChevronLeft className="w-6 h-6 text-gray-800" />
        
          </div>
        </Link>
      
      </div>

      {/* Zoom controls */}
      <div className="fixed top-24 right-4 flex flex-col space-y-2 z-10">
        <button
          onClick={handleZoomIn}
          className="w-10 h-10 flex items-center justify-center bg-white rounded-lg shadow hover:bg-gray-50"
        >
          <ZoomIn className="w-5 h-5 text-gray-700" />
        </button>
        <button
          onClick={handleZoomOut}
          className="w-10 h-10 flex items-center justify-center bg-white rounded-lg shadow hover:bg-gray-50"
        >
          <ZoomOut className="w-5 h-5 text-gray-700" />
        </button>
        <button
          onClick={handleReset}
          className="w-10 h-10 flex items-center justify-center bg-white rounded-lg shadow hover:bg-gray-50"
        >
          <RotateCcw className="w-5 h-5 text-gray-700" />
        </button>
      </div>

      {/* Village visualization */}
      <div
        className="flex-1 relative overflow-hidden"
        onMouseDown={handlePanStart}
        onMouseMove={handlePanMove}
        onMouseUp={handlePanEnd}
        onMouseLeave={handlePanEnd}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        {/* Off-screen member indicators */}
        <AnimatePresence>
          {members.map((member) => {
            const pos = getMemberPosition(member);

            // Only show indicator if member is outside viewport
            if (!isInViewport(pos.x, pos.y, scale, position)) {
              const { x, y, Arrow } = getIndicatorInfo(pos.x, pos.y, scale, position);
              const categoryColor = member.category ? CATEGORY_COLORS[member.category] : "#6b7280";

              return (
                <motion.div
                  key={`indicator-${member.id}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                  className="absolute z-20 transform -translate-x-1/2 -translate-y-1/2"
                  style={{ left: x, top: y }}
                >
                  <div className="relative group">
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      className="animate-pulse"
                    >
                      <Arrow className="w-6 h-6" style={{ color: categoryColor }} />
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      whileHover={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-md px-2 py-1 text-sm shadow-md whitespace-nowrap"
                    >
                      {member.name}
                    </motion.div>
                  </div>
                </motion.div>
              );
            }
            return null;
          })}
        </AnimatePresence>

        <div
          className="absolute inset-0"
          style={{
            transform: `scale(${scale}) translate(${position.x}px, ${position.y}px)`,
            transformOrigin: "center center",
            transition: isDragging ? 'none' : 'transform 0.1s ease-out'
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Circle lines */}
            {[1, 2, 3, 4, 5].map((circle) => (
              <div
                key={circle}
                className="absolute border border-[#629785] rounded-full"
                style={{
                  width: getCircleRadius(circle - 1) * 2,
                  height: getCircleRadius(circle - 1) * 2,
                  left: "50%",
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                }}
              />
            ))}

            {/* Center family icon */}
            <div className="absolute w-24 h-24 bg-[#F4F1E4] rounded-full flex items-center justify-center text-black text-sm border-2 border-[#629785]">
              Kerngezin
            </div>

            {/* Village members */}
            {members.map((member) => {
              const pos = getMemberPosition(member);
              const categoryColor = member.category ? CATEGORY_COLORS[member.category] : "#6b7280";

              return (
                <Draggable
                  key={member.id}
                  defaultPosition={pos}
                  onStop={(e, data) => {
                    // Calculate which circle the member was dropped on
                    const distance = Math.sqrt(data.x * data.x + data.y * data.y);
                    let newCircle = Math.round(distance / 80);
                    newCircle = Math.max(1, Math.min(5, newCircle));

                    // Snap to the circle and get the exact angle
                    const snapped = snapToCircle(data.x, data.y, newCircle);

                    // Only update if there's a change
                    const currentAngle = parseFloat(member.positionAngle?.toString() || "0");
                    if (newCircle !== member.circle || Math.abs(snapped.angle - currentAngle) > 0.01) {
                      updateMember({
                        ...member,
                        circle: newCircle,
                        positionAngle: snapped.angle.toString()
                      });
                    }
                  }}
                  bounds="parent"
                >
                  <div
                    className="absolute cursor-move member-pill group flex items-center"
                    style={{ transform: "translate(-50%, -50%)" }}
                  >
                    <div
                      className={`mr-2 rounded-full`}
                      style={{
                        backgroundColor: categoryColor,
                        width: member.contactFrequency === 'S' ? '0.5rem' :
                              member.contactFrequency === 'M' ? '0.875rem' :
                              member.contactFrequency === 'L' ? '1.25rem' :
                              member.contactFrequency === 'XL' ? '1.75rem' : '0.5rem',
                        height: member.contactFrequency === 'S' ? '0.5rem' :
                               member.contactFrequency === 'M' ? '0.875rem' :
                               member.contactFrequency === 'L' ? '1.25rem' :
                               member.contactFrequency === 'XL' ? '1.75rem' : '0.5rem'
                      }}
                    />
                    <div className="flex items-center space-x-2 bg-white rounded-full px-3 py-1.5 shadow-sm border border-[#E5E7EB]">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-800">{member.name}</span>
                      <div className="hidden group-hover:flex items-center space-x-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(member);
                          }}
                          className="p-1 hover:bg-gray-100 rounded-full"
                        >
                          <Edit2 className="w-3 h-3 text-gray-500" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMemberToDelete(member);
                          }}
                          className="p-1 hover:bg-gray-100 rounded-full"
                        >
                          <Trash2 className="w-3 h-3 text-red-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                </Draggable>
              );
            })}
          </div>
        </div>
      </div>

      {/* Village suggestions */}
      <div className="fixed bottom-20 left-4 z-50">
        <div 
          className="bg-white rounded-2xl shadow-md w-auto max-w-xs overflow-hidden transition-all duration-300"
          style={{ maxHeight: '300px' }}
        >
          <div 
            onClick={() => setIsSuggestionsOpen(!isSuggestionsOpen)}
            className="flex items-center justify-between px-6 py-3 cursor-pointer hover:bg-gray-50"
          >
            <span>
              Er zijn <strong className="text-orange-500">3</strong> village
              suggesties
            </span>
            <ChevronLeft className={`w-5 h-5 transform transition-transform duration-300 ml-2 ${isSuggestionsOpen ? 'rotate-270' : 'rotate-90'}`} />
          </div>
          {isSuggestionsOpen && (
            <div className="px-4 pb-4">
              {[
                { title: 'Add Andy', description: 'Start with adding your first village member' },
                { title: 'Build your village', description: 'Learn how to grow your support network' },
                { title: 'Watch the Village video', description: 'See how the Village feature works' }
              ].map((suggestion, index) => (
                <div
                  key={index}
                  className="mt-2 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => {
                    // Handle suggestion click
                    console.log(`Clicked: ${suggestion.title}`);
                  }}
                >
                  <h4 className="font-medium text-sm text-gray-800">{suggestion.title}</h4>
                  <p className="text-xs text-gray-500 mt-1">{suggestion.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit member dialog */}
      <Dialog open={isOpen} onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          setMemberToEdit(null);
          setNewMember({
            name: "",
            type: "individual",
            circle: 1,
            category: "informeel",
            contactFrequency: "M"
          });
        }
      }}>
        <DialogTrigger asChild>
          <button className="fixed bottom-20 right-4 w-12 h-12 bg-[#2F4644] rounded-full flex items-center justify-center shadow-lg hover:bg-[#3a5452]">
            <Plus className="w-6 h-6 text-white" />
          </button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{memberToEdit ? 'Edit Village Member' : 'Add Village Member'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={newMember.name}
                onChange={(e) =>
                  setNewMember({ ...newMember, name: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={newMember.type}
                onValueChange={(value: "individual" | "group") =>
                  setNewMember({ ...newMember, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="group">Group</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={newMember.category || "informeel"}
                onValueChange={(value: "informeel" | "formeel" | "inspiratie") =>
                  setNewMember({ ...newMember, category: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="informeel">Informeel</SelectItem>
                  <SelectItem value="formeel">Formeel</SelectItem>
                  <SelectItem value="inspiratie">Inspiratie</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactFrequency">Contact Frequency</Label>
              <Select
                value={newMember.contactFrequency || "M"}
                onValueChange={(value: "S" | "M" | "L" | "XL") =>
                  setNewMember({ ...newMember, contactFrequency: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="S">Small</SelectItem>
                  <SelectItem value="M">Medium</SelectItem>
                  <SelectItem value="L">Large</SelectItem>
                  <SelectItem value="XL">Extra Large</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="circle">Circle</Label>
              <Select
                value={String(newMember.circle)}
                onValueChange={(value) =>
                  setNewMember({ ...newMember, circle: Number(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      Circle {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full">
              {memberToEdit ? 'Update Member' : 'Add Member'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!memberToDelete} onOpenChange={(open) => !open && setMemberToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {memberToDelete?.name} from your village. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <MinimapView
        members={members}
        scale={scale}
        position={position}
        onNavigate={handleMinimapNavigate}
      />
    </div>
  );
}
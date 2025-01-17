import { useState } from "react";
import { useVillage } from "@/hooks/use-village";
import { ChevronLeft, Plus, ZoomIn, ZoomOut, RotateCcw, Edit2, Trash2, Music } from "lucide-react";
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

interface VillageMember {
  id: string;
  name: string;
  type: "individual" | "group";
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
  const [newMember, setNewMember] = useState<VillageMember>({
    name: "",
    type: "individual",
    circle: 1,
    category: "informeel",
    contactFrequency: "M"
  });
  const [memberToEdit, setMemberToEdit] = useState<VillageMember | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<VillageMember | null>(null);

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

  const getMemberPosition = (circle: number) => {
    const angle = Math.random() * 2 * Math.PI;
    const radius = getCircleRadius(circle - 1);
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    };
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
        x: prev.x + e.movementX,
        y: prev.y + e.movementY
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
          contactFrequency: newMember.contactFrequency
        });
        setMemberToEdit(null);
      } else {
        await addMember({
          name: newMember.name,
          type: newMember.type,
          circle: newMember.circle,
          category: newMember.category,
          contactFrequency: newMember.contactFrequency
        });
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

  const handleEdit = (member: VillageMember) => {
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
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete member. Please try again."
      });
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#F2F0E5]">
      <div
        className="p-4"
        style={{
          background: `url('/images/village_circles_page.png'), linear-gradient(45deg, #C2ECD1 0%, #F8DE9F 35%)`,
          backgroundPosition: "left",
          backgroundRepeat: "no-repeat",
          backgroundSize: "contain",
        }}
      >
        <Link href="/">
          <div className="flex items-center space-x-4 cursor-pointer mb-8">
            <ChevronLeft className="w-6 h-6 text-gray-800" />
            <span className="text-xl text-gray-800">Mijn Village</span>
          </div>
        </Link>
        <h1 className="text-xl font-medium pl-14 text-[#2F4644] max-w-[380px] leading-tight">
          Een bloeiende Village als middel tegen 'Village Armoede'
        </h1>
      </div>

      <div className="fixed top-32 right-4 flex flex-col space-y-2 z-10">
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

      <div
        className="flex-1 relative min-h-[500px] overflow-hidden"
        onMouseDown={handlePanStart}
        onMouseMove={handlePanMove}
        onMouseUp={handlePanEnd}
        onMouseLeave={handlePanEnd}
        onTouchStart={handlePanStart}
        onTouchMove={handlePanMove}
        onTouchEnd={handlePanEnd}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <div
          className="absolute inset-0"
          style={{
            transform: `scale(${scale}) translate(${position.x}px, ${position.y}px)`,
            transformOrigin: "center center",
            transition: isDragging ? 'none' : 'transform 0.1s ease-out'
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
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

            <div className="absolute w-24 h-24 bg-[#F4F1E4] rounded-full flex items-center justify-center text-black text-sm border-2 border-[#629785]">
              Kerngezin
            </div>

            {members.map((member) => {
              const pos = getMemberPosition(member.circle);
              return (
                <Draggable
                  key={member.id}
                  defaultPosition={pos}
                  bounds="parent"
                >
                  <div className="absolute cursor-move member-pill group" style={{ transform: "translate(-50%, -50%)" }}>
                    <div className="relative">
                      <div className={`absolute -left-1.5 top-1/2 -translate-y-1/2 rounded-full bg-violet-600 ${
                        member.contactFrequency === 'S' ? 'w-2 h-2' :
                        member.contactFrequency === 'M' ? 'w-2.5 h-2.5' :
                        member.contactFrequency === 'L' ? 'w-3 h-3' :
                        member.contactFrequency === 'XL' ? 'w-3.5 h-3.5' : 'w-2 h-2'
                      }`} />
                      <div className="flex items-center space-x-2 bg-white rounded-full px-3 py-1.5 shadow-sm border border-[#E5E7EB]">
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

      <div className="p-4">
        <div className="flex items-center justify-between bg-white rounded-full px-6 py-3 shadow-md w-auto max-w-xs">
          <span>
            Er zijn <strong className="text-orange-500">3</strong> village
            suggesties
          </span>
          <ChevronLeft className="w-5 h-5 transform rotate-90 ml-2" />
        </div>
      </div>

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
                onValueChange={(value) =>
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
                value={newMember.category}
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
                value={newMember.contactFrequency}
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
    </div>
  );
}
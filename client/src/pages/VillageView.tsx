import { useState, useRef, createRef } from "react";
import { useVillage } from "@/hooks/use-village";
import { useUser } from "@/hooks/use-user";
import { useVillageSuggestions } from "@/hooks/use-village-suggestions";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ChevronLeft, Plus, ZoomIn, ZoomOut, RotateCcw, Edit2, Trash2, User, Users, ArrowUpCircle, ArrowDownCircle, ArrowLeftCircle, ArrowRightCircle, Lightbulb } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Draggable from "react-draggable";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VillageMemberMemories } from "@/components/VillageMemberMemories";

// Component interface definition
interface MemberContentProps {
  member: any;
  position: { x: number; y: number };
  isRearrangeMode: boolean;
  onEdit: (member: any) => void;
  onSetMemory: (member: any) => void;
  onDelete: (member: any) => void;
}

// MemberContent component implementation
const MemberContent: React.FC<MemberContentProps> = ({
  member,
  position,
  isRearrangeMode,
  onEdit,
  onSetMemory,
  onDelete
}) => (
  <div className="member-pill group flex items-center">
    <div className="flex items-center space-x-2 bg-white rounded-full px-3 py-1.5 shadow-sm border border-[#E5E7EB]">
      <User className="w-4 h-4 text-gray-500" />
      <span className="text-sm font-medium text-gray-800">{member.name}</span>
      <div className="hidden group-hover:flex items-center space-x-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSetMemory(member);
          }}
          className="p-1 hover:bg-gray-100 rounded-full"
        >
          <Edit2 className="w-3 h-3 text-purple-500" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(member);
          }}
          className="p-1 hover:bg-gray-100 rounded-full"
        >
          <Edit2 className="w-3 h-3 text-gray-500" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(member);
          }}
          className="p-1 hover:bg-gray-100 rounded-full"
        >
          <Trash2 className="w-3 h-3 text-red-500" />
        </button>
      </div>
    </div>
  </div>
);

export default function VillageView() {
  const [isOpen, setIsOpen] = useState(false);
  const [isRearrangeMode, setIsRearrangeMode] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [memberToEdit, setMemberToEdit] = useState<any>(null);
  const [memberToDelete, setMemberToDelete] = useState<any>(null);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [isMemoryDialogOpen, setIsMemoryDialogOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [newMemory, setNewMemory] = useState({
    title: "",
    content: "",
    date: new Date().toISOString().split("T")[0],
    emotionalImpact: 3,
    tags: []
  });
  const [newMember, setNewMember] = useState({
    name: "",
    type: "individual",
    circle: 1,
    category: "informeel",
    contactFrequency: "M"
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const memberRefs = useRef<{ [key: string]: React.RefObject<HTMLDivElement> }>({});

  const { members, addMember, updateMember, deleteMember } = useVillage();
  const { user } = useUser();

  // Update suggestions hook with correct filter types and debug logging
  const {
    suggestions,
    isLoading: isSuggestionsLoading,
    refetch: refetchSuggestions,
    markAsUsed
  } = useVillageSuggestions({
    autoRefresh: false,
    maxSuggestions: 5,
    filterByType: ['dorpsuggestions']
  });

  console.log('Village suggestions:', suggestions);

  const handleMemorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember?.id) return;

    console.log('Adding new memory for:', selectedMember?.name, newMemory);

    setNewMemory({
      title: "",
      content: "",
      date: new Date().toISOString().split("T")[0],
      emotionalImpact: 3,
      tags: []
    });
    setIsMemoryDialogOpen(false);
  };

  const getMemberRef = (id: string) => {
    if (!memberRefs.current[id]) {
      memberRefs.current[id] = createRef<HTMLDivElement>();
    }
    return memberRefs.current[id];
  };

  const getCircleRadius = (circle: number) => {
    return 50 + circle * 70;
  }

  const getMemberPosition = (member: any) => {
    const angle = (2 * Math.PI / members.filter(m => m.circle === member.circle).length) * 
                 members.filter(m => m.circle === member.circle).findIndex(m => m.id === member.id);
    const radius = getCircleRadius(member.circle);
    return {
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle),
    };
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.1, 3));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.1, 0.3));
  };

  const handleResetPosition = () => {
    setPosition({ x: 0, y: 0 });
    setScale(1);
  }

  const handleEdit = (member: any) => {
    setMemberToEdit(member);
    setNewMember(member);
    setIsOpen(true);
  };

  const handleDelete = async () => {
    if (memberToDelete) {
      await deleteMember(memberToDelete.id);
      setMemberToDelete(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (memberToEdit) {
      await updateMember(memberToEdit.id, newMember);
    } else {
      await addMember(newMember);
    }

    setIsOpen(false);
    setMemberToEdit(null);
    setNewMember({
      name: "",
      type: "individual",
      circle: 1,
      category: "informeel",
      contactFrequency: "M"
    });
  };

  return (
    <div className="flex flex-col h-screen relative">
      <div className="flex justify-between items-center p-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-xl font-bold">My Village</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handleResetPosition}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setIsRearrangeMode(!isRearrangeMode)}>
            <Edit2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Village suggestions sheet */}
      <Sheet>
        <SheetTrigger asChild>
          <Button 
            variant="outline" 
            size="icon"
            className="fixed bottom-20 right-4"
          >
            <Lightbulb className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Dorpsuggesties</SheetTitle>
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchSuggestions()}
                disabled={isSuggestionsLoading}
              >
                {isSuggestionsLoading ? (
                  <span className="animate-spin">↻</span>
                ) : (
                  <div className="flex items-center gap-2">
                    <RotateCcw className="w-4 h-4" />
                    <span>Ververs suggesties</span>
                  </div>
                )}
              </Button>
            </div>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            {isSuggestionsLoading ? (
              <div className="flex items-center justify-center p-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
              </div>
            ) : suggestions && suggestions.length > 0 ? (
              suggestions.map((suggestion) => (
                <Card key={suggestion.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium">{suggestion.text}</p>
                        {suggestion.context && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {suggestion.context}
                          </p>
                        )}
                      </div>
                      <Badge 
                        variant="outline" 
                        className="shrink-0 cursor-pointer"
                        onClick={() => markAsUsed(suggestion.id)}
                      >
                        Verwerken
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8">
                <Lightbulb className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">
                  Geen suggesties beschikbaar. Klik op ververs om nieuwe suggesties op te halen.
                </p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex-1 relative overflow-hidden">
        <div
          ref={containerRef}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: "transform 0.2s ease-out",
            touchAction: "none",
          }}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        >
          <div
            style={{
              width: getCircleRadius(5) * 2,
              height: getCircleRadius(5) * 2,
            }}
            className="relative rounded-full flex items-center justify-center"
          >
            {[1, 2, 3, 4].map((circle) => (
              <div
                key={circle}
                className="absolute rounded-full border-2 border-dashed border-[#2F4644] opacity-25"
                style={{
                  width: getCircleRadius(circle) * 2,
                  height: getCircleRadius(circle) * 2,
                  boxShadow: "0 0 20px rgba(254, 176, 25, 0.2)"
                }}
              />
            ))}
            {members.map((member) => {
              const pos = getMemberPosition(member);
              const nodeRef = getMemberRef(member.id);
              if (isRearrangeMode) {
                return (
                  <Draggable
                    key={member.id}
                    nodeRef={nodeRef}
                    position={pos}
                    onStop={(e, data) => {
                      const newX = data.x;
                      const newY = data.y;
                      updateMember(member.id, {...member, x: newX, y: newY});
                    }}
                    bounds={{
                      left: -getCircleRadius(4),
                      right: getCircleRadius(4),
                      top: -getCircleRadius(4),
                      bottom: getCircleRadius(4)
                    }}
                  >
                    <div
                      ref={nodeRef}
                      className="absolute"
                      style={{
                        transform: "translate(-50%, -50%)"
                      }}
                    >
                      <MemberContent
                        member={member}
                        position={{ x: 0, y: 0 }}
                        isRearrangeMode={isRearrangeMode}
                        onEdit={handleEdit}
                        onSetMemory={(m) => {
                          setSelectedMember(m);
                          setIsMemoryDialogOpen(true);
                        }}
                        onDelete={setMemberToDelete}
                      />
                    </div>
                  </Draggable>
                );
              }
              return (
                <div
                  key={member.id}
                  className="absolute"
                  style={{
                    transform: `translate(${pos.x}px, ${pos.y}px) translate(-50%, -50%)`,
                    left: "50%",
                    top: "50%",
                    touchAction: "none",
                    zIndex: 20
                  }}
                >
                  <MemberContent
                    member={member}
                    position={{ x: 0, y: 0 }}
                    isRearrangeMode={isRearrangeMode}
                    onEdit={handleEdit}
                    onSetMemory={(m) => {
                      setSelectedMember(m);
                      setIsMemoryDialogOpen(true);
                    }}
                    onDelete={setMemberToDelete}
                  />
                </div>
              );
            })}
            <div
              className="absolute w-24 h-24 rounded-full flex items-center justify-center"
              style={{
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
                boxShadow: "0 0 30px rgba(254, 176, 25, 0.4)"
              }}
            >
              <Avatar className="w-full h-full border-2 border-[#629785]">
                {user?.avatarUrl ? (
                  <AvatarImage src={user.avatarUrl} alt="Profile" className="object-cover" />
                ) : (
                  <AvatarFallback className="bg-[#F4F1E4] text-[#629785]">
                    <Users className="w-12 h-12" />
                  </AvatarFallback>
                )}
              </Avatar>
            </div>
          </div>
        </div>
      </div>

      <Sheet open={isOpen} onOpenChange={(open) => {
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
        <SheetTrigger asChild>
          <button className="fixed bottom-4 right-4 w-12 h-12 bg-[#2F4644] rounded-full flex items-center justify-center shadow-lg hover:bg-[#3a5452]">
            <Plus className="w-6 h-6 text-white" />
          </button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{memberToEdit ? 'Edit Village Member' : 'Add Village Member'}</SheetTitle>
          </SheetHeader>
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
        </SheetContent>
      </Sheet>

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
            <AlertDialogAction onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Memories Dialog */}
      <Sheet open={isMemoryDialogOpen} onOpenChange={setIsMemoryDialogOpen}>
        <SheetContent side="bottom" className="h-[90vh]">
          <SheetHeader>
            <SheetTitle>Herinneringen met {selectedMember?.name}</SheetTitle>
            <span className="text-sm text-muted-foreground">
              Bekijk of voeg herinneringen toe
            </span>
          </SheetHeader>
          <div className="flex flex-col h-[calc(90vh-120px)] gap-4 mt-4 overflow-hidden">
            <Tabs defaultValue="view">
              <TabsList>
                <TabsTrigger value="view">View Memories</TabsTrigger>
                <TabsTrigger value="add">Add Memory</TabsTrigger>
              </TabsList>
              <TabsContent value="view" className="flex-1">
                {selectedMember && (
                  <VillageMemberMemories
                    memberId={selectedMember.id}
                    memberName={selectedMember.name}
                  />
                )}
              </TabsContent>
              <TabsContent value="add">
                <form onSubmit={handleMemorySubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={newMemory.title}
                      onChange={(e) => setNewMemory({ ...newMemory, title: e.target.value })}
                      placeholder="Enter a title for this memory"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="content">Memory Details</Label>
                    <Textarea
                      id="content"
                      value={newMemory.content}
                      onChange={(e) => setNewMemory({ ...newMemory, content: e.target.value })}
                      placeholder="What happened? How did it make you feel?"
                      className="min-h-[150px]" required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="date">Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={newMemory.date}
                        onChange={(e) => setNewMemory({ ...newMemory, date: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emotionalImpact">Emotional Impact</Label>
                      <Select
                        value={String(newMemory.emotionalImpact)}
                        onValueChange={(value) => setNewMemory({ ...newMemory, emotionalImpact: Number(value) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5].map((n) => (
                            <SelectItem key={n} value={String(n)}>
                              {n} Star{n !== 1 ? 's' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags (comma-separated)</Label>
                    <Input
                      id="tags"
                      value={newMemory.tags.join(", ")}
                      onChange={(e) => setNewMemory({
                        ...newMemory,
                        tags: e.target.value.split(",").map(tag => tag.trim()).filter(Boolean)
                      })}
                      placeholder="e.g., milestone, support, advice"
                    />
                  </div>
                  <Button type="submit" className="w-full">Save Memory</Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
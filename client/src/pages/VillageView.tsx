import { useState, useRef, createRef, useEffect } from "react";
import { useVillage } from "@/hooks/use-village";
import { useUser } from "@/hooks/use-user";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ChevronLeft, Plus, ZoomIn, ZoomOut, RotateCcw, Edit2, Trash2, User, Users, ArrowUpCircle, ArrowDownCircle, ArrowLeftCircle, ArrowRightCircle, Lightbulb, BookMarked, Star, Clock } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useVillageMemories } from "@/hooks/use-village-memories";
import { VillageMemberMemories } from "@/components/VillageMemberMemories";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InsightsPanel from "@/components/InsightsPanel";

const CATEGORY_COLORS = {
  informeel: "#3C9439", // Green
  formeel: "#EE4B92",   // Pink
  inspiratie: "#4D3A88", // Purple
} as const;

interface NewVillageMember {
  name: string;
  type: string;
  circle: number;
  category: "informeel" | "formeel" | "inspiratie" | null;
  contactFrequency: "S" | "M" | "L" | "XL" | null;
}

interface Memory {
  id: number;
  title: string;
  content: string;
  date: string;
  emotionalImpact: number;
  tags: string[];
}

interface Insight {
  id: number;
  type: string;
  title: string;
  description: string;
  suggestedAction?: string;
  priority: number;
  status: string;
  dismissed: boolean;
}

export default function VillageView() {
  const { members, addMember, updateMember, deleteMember } = useVillage();
  const { user } = useUser();
  const { toast } = useToast();
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const memberRefs = useRef(new Map());

  const getMemberRef = (memberId: number) => {
    if (!memberRefs.current.has(memberId)) {
      memberRefs.current.set(memberId, createRef());
    }
    return memberRefs.current.get(memberId);
  };

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
  const [selectedMember, setSelectedMember] = useState<typeof members[0] | null>(null);
  const [isMemoryDialogOpen, setIsMemoryDialogOpen] = useState(false);
  const [isInsightsPanelOpen, setIsInsightsPanelOpen] = useState(false);
  const [newMemory, setNewMemory] = useState<Omit<Memory, 'id'>>({
    title: "",
    content: "",
    emotionalImpact: 3,
    tags: [] as string[],
    date: format(new Date(), "yyyy-MM-dd")
  });
  const [insights, setInsights] = useState<Insight[]>([
    {
      id: 1,
      type: "connection_strength",
      title: "Sterke Verbinding Gedetecteerd",
      description: "Je relatie met Andy is de afgelopen maand consistent sterk geweest.",
      priority: 4,
      status: "active",
      dismissed: false
    },
    {
      id: 2,
      type: "network_gap",
      title: "Verbetering Steunnetwerk",
      description: "Je zou kunnen profiteren van meer professionele contacten in je village.",
      suggestedAction: "Overweeg contact op te nemen met mentoren of collega's",
      priority: 3,
      status: "active",
      dismissed: false
    }
  ]);

  const { addMemory } = useVillageMemories(selectedMember?.id || 0);

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

  const lastTouchDistance = useRef<number>(0);
  const lastTouchPos = useRef<{ x: number; y: number } | null>(null);

  const handleTouch = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
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

  const isInViewport = (x: number, y: number, scale: number, position: { x: number, y: number }) => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const transformedX = (x * scale) + position.x;
    const transformedY = (y * scale) + position.y;

    const padding = 50;

    return (
      transformedX >= -padding &&
      transformedX <= viewportWidth + padding &&
      transformedY >= -padding &&
      transformedY <= viewportHeight + padding
    );
  };

  const getIndicatorInfo = (memberX: number, memberY: number, scale: number, position: { x: number, y: number }) => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const padding = 40;

    const transformedX = (memberX * scale) + position.x;
    const transformedY = (memberY * scale) + position.y;

    const centerX = viewportWidth / 2;
    const centerY = viewportHeight / 2;
    const angle = Math.atan2(transformedY - centerY, transformedX - centerX);

    let indicatorX = centerX;
    let indicatorY = centerY;
    const border = 60;

    if (Math.abs(Math.cos(angle)) > Math.abs(Math.sin(angle))) {
      indicatorX = transformedX < centerX ? border : viewportWidth - border;
      indicatorY = centerY + Math.tan(angle) * (indicatorX - centerX);

      indicatorY = Math.max(border, Math.min(viewportHeight - border, indicatorY));
    } else {
      indicatorY = transformedY < centerY ? border : viewportHeight - border;
      indicatorX = centerX + (indicatorY - centerY) / Math.tan(angle);

      indicatorX = Math.max(border, Math.min(viewportWidth - border, indicatorX));
    }

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

  const handleMemorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;

    try {
      await addMemory({
        title: newMemory.title,
        content: newMemory.content,
        date: newMemory.date,
        emotionalImpact: newMemory.emotionalImpact,
        tags: newMemory.tags
      });

      toast({
        title: "Success",
        description: "Memory saved successfully"
      });
      setIsMemoryDialogOpen(false);
      setNewMemory({
        title: "",
        content: "",
        emotionalImpact: 3,
        tags: [],
        date: format(new Date(), "yyyy-MM-dd")
      });
    } catch (error) {
      console.error('Memory save error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save memory"
      });
    }
  };

  const dismissInsight = (id: number) => {
    setInsights(prev =>
      prev.map(insight =>
        insight.id === id ? { ...insight, dismissed: true } : insight
      )
    );
  };

  const handleInsightAction = (id: number) => {
    const insight = insights.find(i => i.id === id);
    if (insight?.type === "network_gap") {
      setIsOpen(true); // Open add member dialog
    }
    dismissInsight(id);
  };

  const [membersWithState, setMembersWithState] = useState(
    members.map(member => ({...member, actionsOpen: false}))
  );

  // Update membersWithState when members change
  useEffect(() => {
    setMembersWithState(members.map(member => ({
      ...member,
      actionsOpen: membersWithState.find(m => m.id === member.id)?.actionsOpen || false
    })));
  }, [members]);

  const toggleMemberActions = (memberId: number) => {
    setMembersWithState(prev => 
      prev.map(m => ({
        ...m, 
        actionsOpen: m.id === memberId ? !m.actionsOpen : false
      }))
    );
  };

  return (
    <div className="flex flex-col h-screen relative animate-gradient" style={{
      backgroundSize: "400% 400%",
      background: `linear-gradient(135deg, #C9E1D4 0%, #F2F0E5 50%, #F2F0E5 100%)`
    }}>
      <div
        className="fixed top-0 left-0 right-0 z-50 p-4">
        <Link href="/">
          <div className="flex items-center space-x-4 cursor-pointer mb-8">
            <ChevronLeft className="w-6 h-6 text-gray-800" />

          </div>
        </Link>

      </div>

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
        <button
          onClick={() => setIsSuggestionsOpen(true)}
          className="w-10 h-10 flex items-center justify-center bg-white rounded-lg shadow hover:bg-gray-50"
        >
          <Lightbulb className="w-5 h-5 text-gray-700" />
        </button>
      </div>

      {/* Village suggestions dialog */}
      <Sheet open={isSuggestionsOpen} onOpenChange={setIsSuggestionsOpen}>
        <SheetContent side="bottom" className="h-[90vh]">
          <SheetHeader>
            <SheetTitle>Dorpsuggesties</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            {insights.filter(i => !i.dismissed).length === 0 ? (
              <div className="text-center py-8 px-4">
                <Lightbulb className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  Helemaal klaar voor vandaag. Als er nieuwe suggesties zijn kan je die hier altijd vinden!
                </p>
              </div>
            ) : (
              insights.map((insight) => (
                !insight.dismissed && (
                <Card key={insight.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">{insight.title}</h3>
                        <p className="text-sm text-gray-600">{insight.description}</p>
                        {insight.suggestedAction && (
                          <p className="text-sm text-gray-600 mt-2 italic">
                            Suggestie: {insight.suggestedAction}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={insight.priority > 3 ? "default" : "secondary"}>
                          Prioriteit {insight.priority}
                        </Badge>
                        <Button variant="ghost" onClick={() => handleInsightAction(insight.id)}>
                          {insight.type === "network_gap" ? "Voeg toe" : "OK"}
                        </Button>
                        <Button variant="ghost" onClick={() => dismissInsight(insight.id)}>
                          Verwijder
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            ))
            )}
          </div>
        </SheetContent>
      </Sheet>

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
        <AnimatePresence>
          {members.map((member) => {
            const pos = getMemberPosition(member);

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
                  boxShadow: "0 0 30px rgba(254, 176, 25, 0.2)"
                }}
              />
            ))}

            <div
              className="absolute w-24 h-24 rounded-full flex items-center justify-center"
              style={{ boxShadow: "0 0 30px rgba(254, 176, 25, 0.4)" }}
            >
              <Avatar className="w-full h-full border-2 border-[#629785]">
                {user?.profilePicture ? (
                  <AvatarImage src={user.profilePicture} alt="Profile" className="object-cover" />
                ) : (
                  <AvatarFallback className="bg-[#F4F1E4] text-[#629785]">
                    <Users className="w-12 h-12" />
                  </AvatarFallback>
                )}
              </Avatar>
            </div>

            {members.map((member) => {
              const pos = getMemberPosition(member);
              const categoryColor = member.category ? CATEGORY_COLORS[member.category] : "#6b7280";
              const nodeRef = getMemberRef(member.id);
              const memberState = membersWithState.find(m => m.id === member.id) || {...member, actionsOpen: false};

              return (
                <Draggable
                  key={member.id}
                  nodeRef={nodeRef}
                  defaultPosition={pos}
                  disabled={window.innerWidth <= 768}
                  onStop={(e, data) => {
                    const distance = Math.sqrt(data.x * data.x + data.y * data.y);
                    let newCircle = Math.round(distance / 80);
                    newCircle = Math.max(1, Math.min(5, newCircle));

                    const snapped = snapToCircle(data.x, data.y, newCircle);

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
                    ref={nodeRef}
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
                    <div 
                      className="flex items-center space-x-2 bg-white rounded-full px-3 py-1.5 shadow-sm border border-[#E5E7EB]"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (window.innerWidth <= 768) {
                          toggleMemberActions(member.id);
                        }
                      }}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleMemberActions(member.id);
                      }}
                    >
                      <span className="text-sm font-medium text-gray-800">{member.name}</span>
                      <div className={`items-center space-x-1 ${memberState.actionsOpen ? 'flex' : 'hidden md:group-hover:flex'}`}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMember(member);
                            setIsMemoryDialogOpen(true);
                          }}
                          className="p-1 hover:bg-gray-100 rounded-full"
                        >
                          <BookMarked className="w-3 h-3 text-purple-500" />
                        </button>
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
          <button className="fixed bottom-20 right-4 w-12 h-12 bg-[#2F4644] rounded-full flex items-center justify-center shadow-lg hover:bg-[#3a5452]">
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
                    open={isMemoryDialogOpen}
                    onOpenChange={setIsMemoryDialogOpen}
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
                      onChange={(e) => setNewMemory({...newMemory, title: e.target.value })}
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


      <div className="hidden">
        <MinimapView
          members={members}
          scale={scale}
          position={position}
          onNavigate={handleMinimapNavigate}
        />
      </div>
    </div>
  );
}
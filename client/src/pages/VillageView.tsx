import { useState, useRef, createRef } from "react";
import { useVillage } from "@/hooks/use-village";
import { useUser } from "@/hooks/use-user";
import { useVillageSuggestions } from "@/hooks/use-village-suggestions";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  ChevronLeft,
  Plus,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Edit2,
  Trash2,
  User,
  Users,
  ArrowUpCircle,
  ArrowDownCircle,
  ArrowLeftCircle,
  ArrowRightCircle,
  Lightbulb,
  BookMarked,
  Star,
  Clock,
  Move,
  X,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useVillageMemories } from "@/hooks/use-village-memories";
import { VillageMemberMemories } from "@/components/VillageMemberMemories";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InsightsPanel from "@/components/InsightsPanel";
import type { VillageMember } from "@db/schema";

const CATEGORY_COLORS = {
  informeel: "#3C9439", // Green
  formeel: "#EE4B92", // Pink
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
  text: string; // Added text property
  context: string; // Added context property
  relevance: number; // Added relevance property
}

interface MemberContentProps {
  member: VillageMember;
  position: { x: number; y: number };
  isRearrangeMode: boolean;
  onEdit: (member: VillageMember) => void;
  onSetMemory: (member: VillageMember) => void;
  onDelete: (member: VillageMember) => void;
}

interface MemberContentProps {
  member: VillageMember;
  position: { x: number; y: number };
  isRearrangeMode: boolean;
  onEdit: (member: VillageMember) => void;
  onSetMemory: (member: VillageMember) => void;
  onDelete: (member: VillageMember) => void;
  isHighlighted?: boolean;
}

const MemberContent: React.FC<MemberContentProps> = ({
  member,
  position,
  isRearrangeMode,
  onEdit,
  onSetMemory,
  onDelete,
  isHighlighted,
}) => (
  <div
    className="member-pill group flex items-center"
    style={{
      position: "absolute",
      transform: "translate(-50%, -50%)",
      left: position.x,
      top: position.y,
    }}
  >
    <div
      className={`mr-2 rounded-full`}
      style={{
        backgroundColor: member.category
          ? CATEGORY_COLORS[member.category]
          : "#6b7280",
        width:
          member.contactFrequency === "S"
            ? "0.5rem"
            : member.contactFrequency === "M"
              ? "0.875rem"
              : member.contactFrequency === "L"
                ? "1.25rem"
                : member.contactFrequency === "XL"
                  ? "1.75rem"
                  : "0.5rem",
        height:
          member.contactFrequency === "S"
            ? "0.5rem"
            : member.contactFrequency === "M"
              ? "0.875rem"
              : member.contactFrequency === "L"
                ? "1.25rem"
                : member.contactFrequency === "XL"
                  ? "1.75rem"
                  : "0.5rem",
      }}
    />
    <div
      className={`flex items-center space-x-2 bg-white rounded-full px-3 py-1.5 shadow-sm border border-[#E5E7EB] max-w-[150px] ${isHighlighted ? "highlight-animation" : ""}`}
    >
      <div
        className="cursor-pointer flex-1 min-w-0"
        onTouchEnd={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!isRearrangeMode) {
            const submenu = document.querySelector(`#submenu-${member.id}`);
            if (submenu) {
              // Close all other menus first
              document.querySelectorAll('[id^="submenu-"]').forEach((menu) => {
                if (menu.id !== `submenu-${member.id}`) {
                  menu.classList.add("hidden");
                  menu.classList.remove("flex");
                }
              });
              // Toggle current menu
              submenu.classList.toggle("hidden");
              submenu.classList.toggle("flex");
            }
          }
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (!isRearrangeMode) {
            const submenu = document.querySelector(`#submenu-${member.id}`);
            if (submenu) {
              // Close all other menus first
              document.querySelectorAll('[id^="submenu-"]').forEach((menu) => {
                if (menu.id !== `submenu-${member.id}`) {
                  menu.classList.add("hidden");
                  menu.classList.remove("flex");
                }
              });
              // Toggle current menu
              submenu.classList.toggle("hidden");
              submenu.classList.toggle("flex");
            }
          }
        }}
      >
        <span className="text-sm font-medium text-gray-800 truncate block">
          {member.name}
        </span>
      </div>
      <div
        id={`submenu-${member.id}`}
        className="hidden items-center space-x-1 md:group-hover:flex"
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSetMemory(member);
          }}
          className="p-1 hover:bg-gray-100 rounded-full"
        >
          <BookMarked className="w-3 h-3 text-purple-500" />
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
  const { members, addMember, updateMember, deleteMember } = useVillage();
  const { user } = useUser();
  const { toast } = useToast();
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const memberRefs = useRef(new Map());
  const [isRearrangeMode, setIsRearrangeMode] = useState(false);
  const [showListView, setShowListView] = useState(false); // Add state for list view toggle

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
    contactFrequency: "M",
  });
  const [memberToEdit, setMemberToEdit] = useState<VillageMember | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<VillageMember | null>(
    null,
  );
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<VillageMember | null>(
    null,
  );
  const [isMemoryDialogOpen, setIsMemoryDialogOpen] = useState(false);
  const [isInsightsPanelOpen, setIsInsightsPanelOpen] = useState(false);
  const [newMemory, setNewMemory] = useState<Omit<Memory, "id">>({
    title: "",
    content: "",
    emotionalImpact: 3,
    tags: [] as string[],
    date: format(new Date(), "yyyy-MM-dd"),
  });
  const {
    suggestions,
    isLoading: isSuggestionsLoading,
    refetch: refetchSuggestions,
    markAsUsed,
    error: suggestionsError,
  } = useVillageSuggestions({
    autoRefresh: false,
    maxSuggestions: 5,

  });

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
      angle: normalizedAngle,
    };
  };

  const getMemberPosition = (member: VillageMember) => {
    const radius = getCircleRadius(member.circle - 1);
    const angle =
      typeof member.positionAngle === "string"
        ? parseFloat(member.positionAngle)
        : typeof member.positionAngle === "number"
          ? member.positionAngle
          : Math.random() * 2 * Math.PI;

    const position = {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    };

    console.log("Member Position Calculation:", {
      memberId: member.id,
      memberName: member.name,
      angle,
      radius,
      position,
      originalAngle: member.positionAngle,
    });

    return position;
  };

  const calculateAngleFromPosition = (x: number, y: number) => {
    return Math.atan2(y, x);
  };

  const lastTouchDistance = useRef<number>(0);
  const lastTouchPos = useRef<{ x: number; y: number } | null>(null);

  // Update handleTouch to log zoom operations
  const handleTouch = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(
        touch1.clientX - touch2.clientX,
        touch1.clientY - touch2.clientY,
      );

      if (!lastTouchDistance.current) {
        lastTouchDistance.current = dist;
        return;
      }

      const delta = dist - lastTouchDistance.current;
      lastTouchDistance.current = dist;

      console.log("Pinch Zoom:", {
        distance: dist,
        delta,
        currentScale: scale,
        newScale: Math.min(Math.max(scale + delta * 0.01, 0.3), 3),
      });

      setScale((prevScale) =>
        Math.min(Math.max(prevScale + delta * 0.01, 0.3), 3),
      );
    } else if (e.touches.length === 1) {
      const touch = e.touches[0];
      if (!lastTouchPos.current) {
        lastTouchPos.current = { x: touch.clientX, y: touch.clientY };
        return;
      }

      const deltaX = touch.clientX - lastTouchPos.current.x;
      const deltaY = touch.clientY - lastTouchPos.current.y;

      console.log("Single Touch Pan:", {
        deltaX,
        deltaY,
        currentPosition: position,
      });

      lastTouchPos.current = { x: touch.clientX, y: touch.clientY };

      setPosition((prev) => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY,
      }));
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.target instanceof Element && e.target.closest(".member-pill")) {
      e.stopPropagation();
      return;
    }
    if (e.touches.length === 1) {
      setIsDragging(true);
      lastTouchDistance.current = 0;
      lastTouchPos.current = null;
    }
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
    if (e.target instanceof Element && e.target.closest(".member-pill")) {
      return;
    }
    setIsDragging(true);
  };

  // Add logging to handlePanMove
  const handlePanMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;

    if ("touches" in e) {
      const touch = e.touches[0];
      const prevTouch = e.touches[1] || e.touches[0];
      const deltaX = touch.clientX - prevTouch.clientX;
      const deltaY = touch.clientY - prevTouch.clientY;

      console.log("Pan Movement:", {
        deltaX,
        deltaY,
        currentPosition: position,
      });

      setPosition((prev) => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY,
      }));
    } else {
      console.log("Mouse Pan:", {
        movementX: (e as React.MouseEvent).movementX,
        movementY: (e as React.MouseEvent).movementY,
        currentPosition: position,
      });

      setPosition((prev) => ({
        x: prev.x + (e as React.MouseEvent).movementX,
        y: prev.y + (e as React.MouseEvent).movementY,
      }));
    }
  };

  const handlePanEnd = () => {
    setIsDragging(false);
  };

  const [lastAddedMember, setLastAddedMember] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = [];

    // Strict validation for all required fields
    if (!newMember.name?.trim()) validationErrors.push("Name is required");
    if (!newMember.type?.trim()) validationErrors.push("Type is required");
    if (!newMember.circle || newMember.circle < 1 || newMember.circle > 5)
      validationErrors.push("Circle must be between 1 and 5");
    if (
      !newMember.category ||
      !["informeel", "formeel", "inspiratie"].includes(newMember.category)
    )
      validationErrors.push("Valid category is required");
    if (
      !newMember.contactFrequency ||
      !["S", "M", "L", "XL"].includes(newMember.contactFrequency)
    )
      validationErrors.push("Valid contact frequency is required");

    if (validationErrors.length > 0) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: validationErrors.join(", "),
        duration: 3000,
      });
      return;
    }

    try {
      if (memberToEdit) {
        const updated = await updateMember({
          id: memberToEdit.id,
          name: newMember.name,
          type: newMember.type,
          circle: newMember.circle,
          category: newMember.category,
          contactFrequency: newMember.contactFrequency,
          positionAngle: memberToEdit.positionAngle,
        });
        setMemberToEdit(null);
        setLastAddedMember(updated.id);
      } else {
        const added = await addMember(newMember);
        setLastAddedMember(added.id);

        // Reset position and scale to see the new member
        const radius = getCircleRadius(newMember.circle - 1);
        const angle = Math.random() * 2 * Math.PI;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        setPosition({
          x: -x * scale,
          y: -y * scale,
        });
      }
      setIsOpen(false);
      setNewMember({
        name: "",
        type: "individual",
        circle: 1,
        category: "informeel",
        contactFrequency: "M",
      });
      toast({
        title: "Success",
        description: memberToEdit
          ? "Member updated successfully"
          : "Member added successfully",
      });
    } catch (error) {
      console.error("Submit error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to save member. Please try again.",
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
      contactFrequency: member.contactFrequency || "M",
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
        description: "Member removed successfully",
      });
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to delete member. Please try again.",
      });
    }
  };

  const isInViewport = (
    x: number,
    y: number,
    scale: number,
    position: { x: number; y: number },
  ) => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const transformedX = x * scale + position.x;
    const transformedY = y * scale + position.y;

    const padding = 50;

    return (
      transformedX >= -padding &&
      transformedX <= viewportWidth + padding &&
      transformedY >= -padding &&
      transformedY <= viewportHeight + padding
    );
  };

  const getIndicatorInfo = (
    memberX: number,
    memberY: number,
    scale: number,
    position: { x: number; y: number },
  ) => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const padding = 40;

    const transformedX = memberX * scale + position.x;
    const transformedY = memberY * scale + position.y;

    const centerX = viewportWidth / 2;
    const centerY = viewportHeight / 2;
    const angle = Math.atan2(transformedY - centerY, transformedX - centerX);

    let indicatorX = centerX;
    let indicatorY = centerY;
    const border = 60;

    if (Math.abs(Math.cos(angle)) > Math.abs(Math.sin(angle))) {
      indicatorX = transformedX < centerX ? border : viewportWidth - border;
      indicatorY = centerY + Math.tan(angle) * (indicatorX - centerX);

      indicatorY = Math.max(
        border,
        Math.min(viewportHeight - border, indicatorY),
      );
    } else {
      indicatorY = transformedY < centerY ? border : viewportHeight - border;
      indicatorX = centerX + (indicatorY - centerY) / Math.tan(angle);

      indicatorX = Math.max(
        border,
        Math.min(viewportWidth - border, indicatorX),
      );
    }

    let Arrow;
    if (
      transformedY < centerY &&
      Math.abs(Math.sin(angle)) > Math.abs(Math.cos(angle))
    ) {
      Arrow = ArrowUpCircle;
    } else if (
      transformedY > centerY &&
      Math.abs(Math.sin(angle)) > Math.abs(Math.cos(angle))
    ) {
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
        tags: newMemory.tags,
      });

      toast({
        title: "Success",
        description: "Memory saved successfully",
      });

      setNewMemory({
        title: "",
        content: "",
        emotionalImpact: 3,
        tags: [],
        date: format(new Date(), "yyyy-MM-dd"),
      });

      // Switch back to view tab after saving
      const tabsList = document.querySelector('[role="tablist"]');
      if (tabsList) {
        const viewTab = tabsList.querySelector(
          '[value="view"]',
        ) as HTMLButtonElement;
        if (viewTab) {
          viewTab.click();
        }
      }
    } catch (error) {
      console.error("Memory save error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to save memory",
      });
    }
  };

  const dismissInsight = async (id: number) => {
    try {
      await markAsUsed(id);
    } catch (error) {
      console.error("Failed to dismiss insight:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to dismiss suggestion",
      });
    }
  };

  const dismissSuggestion = async (id: number) => {
    try {
      await markAsUsed(id);
    } catch (error) {
      console.error("Failed to dismiss suggestion:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to dismiss suggestion",
      });
    }
  };

  const nextSuggestion = () => {
    refetchSuggestions();
  };

  const handleInsightAction = (id: number) => {
    const insight = suggestions?.find((s) => s.id === id);
    if (insight?.type === "network_gap") {
      setIsOpen(true); // Open add member dialog
    }
    dismissInsight(id);
  };

  const handleDragStop = (_e: any, data: any, member: VillageMember) => {
    const distance = Math.sqrt(data.x * data.x + data.y * data.y);
    let newCircle = Math.round(distance / 80);
    newCircle = Math.max(1, Math.min(5, newCircle));

    const snapped = snapToCircle(data.x, data.y, newCircle);
    const currentAngle = parseFloat(member.positionAngle?.toString() || "0");

    console.log("Drag Stop Position:", {
      memberId: member.id,
      memberName: member.name,
      dragPosition: { x: data.x, y: data.y },
      snappedPosition: { x: snapped.x, y: snapped.y },
      newCircle,
      newAngle: snapped.angle,
      currentAngle,
    });

    if (
      newCircle !== member.circle ||
      Math.abs(snapped.angle - currentAngle) > 0.01
    ) {
      updateMember({
        ...member,
        circle: newCircle,
        positionAngle: snapped.angle.toString(),
      });
    }
  };

  return (
    <div
      className="flex flex-col h-screen relative animate-gradient"
      style={{
        backgroundSize: "400% 400%",
        background: `linear-gradient(135deg, #C9E1D4 0%, #F2F0E5 50%, #F2F0E5 100%)`,
      }}
    >
      <div className="fixed top-0 left-0 right-0 z-50 p-4">
        <div className="flex justify-between items-center">
          <Link href="/">
            <div className="flex items-center space-x-4 cursor-pointer">
              <ChevronLeft className="w-6 h-6 text-gray-800" />
            </div>
          </Link>
          <button
            onClick={() => setShowListView(!showListView)}
            className="bg-white rounded-lg shadow px-3 py-1.5 text-sm font-medium"
          >
            {showListView ? "Circle View" : "List View"}
          </button>
        </div>
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
          onClick={() => setIsRearrangeMode(!isRearrangeMode)}
          className={`w-10 h-10 flex items-center justify-center rounded-lg shadow hover:bg-gray-50 ${
            isRearrangeMode ? "bg-primary text-white" : "bg-white"
          }`}
        >
          <Move
            className={`w-5 h-5 ${isRearrangeMode ? "text-white" : "text-gray-700"}`}
          />
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
          <div className="space-y-4 mt-4">
            {isSuggestionsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
                <p className="mt-2 text-gray-600">Laden...</p>
              </div>
            ) : suggestionsError ? (
              <div className="text-center py-8 px-4">
                <X className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-600">
                  Er is een fout opgetreden bij het ophalen van suggesties.
                  Probeer het later opnieuw.
                </p>
              </div>
            ) : !suggestions || !suggestions.length ? (
              <div className="text-center py-8 px-4">
                <Lightbulb className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  Geen suggesties beschikbaar. Klik op ververs om nieuwe
                  suggesties op te halen.
                </p>
              </div>
            ) : (
              suggestions.map((suggestion) => (
                <Card key={suggestion.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">
                          {suggestion.text}
                        </h3>
                        <p className="text-sm text-gray-600 mt-2 italic">
                          Context: {suggestion.context}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Badge
                          variant={
                            suggestion.relevance > 3 ? "default" : "secondary"
                          }
                        >
                          Prioriteit {suggestion.relevance}
                        </Badge>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            dismissSuggestion(suggestion.id);
                            nextSuggestion();
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
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
        style={{ cursor: isDragging ? "grabbing" : "grab" }}
      >
        <AnimatePresence>
          {members.map((member) => {
            const pos = getMemberPosition(member);

            if (!isInViewport(pos.x, pos.y, scale, position)) {
              const { x, y, Arrow } = getIndicatorInfo(
                pos.x,
                pos.y,
                scale,
                position,
              );
              const categoryColor = member.category
                ? CATEGORY_COLORS[member.category]
                : "#6b7280";

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
                      <Arrow
                        className="w-6 h-6"
                        style={{ color: categoryColor }}
                      />
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
            transition: isDragging ? "none" : "transform 0.1s ease-out",
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
                  boxShadow: "0 0 30px rgba(254, 176, 25, 0.2)",
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
                    onStop={(e, data) => handleDragStop(e, data, member)}
                    bounds={{
                      left: -getCircleRadius(4),
                      right: getCircleRadius(4),
                      top: -getCircleRadius(4),
                      bottom: getCircleRadius(4),
                    }}
                  >
                    <div
                      ref={nodeRef}
                      className="absolute"
                      style={{
                        transform: "translate(-50%, -50%)",
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

              // Regular view - adjusted to match edit mode's coordinate system
              return (
                <div
                  key={member.id}
                  className="absolute"
                  style={{
                    transform: `translate(${pos.x}px, ${pos.y}px) translate(-50%, -50%)`,
                    left: "50%",
                    top: "50%",
                    touchAction: "none",
                    zIndex: 20,
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
                    isHighlighted={lastAddedMember === member.id}
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
                boxShadow: "0 0 30px rgba(254, 176, 25, 0.4)",
              }}
            >
              <Avatar className="w-full h-full border-2 border-[#629785]">
                {user?.profilePicture ? (
                  <AvatarImage
                    src={user.profilePicture}
                    alt="Profile"
                    className="object-cover"
                  />
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

      <Sheet
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) {
            setMemberToEdit(null);
            setNewMember({
              name: "",
              type: "individual",
              circle: 1,
              category: "informeel",
              contactFrequency: "M",
            });
          }
        }}
      >
        <SheetTrigger asChild>
          <button className="fixed bottom-20 right-4 w-12 h-12 bg-[#2F4644] rounded-full flex items-center justify-center shadow-lg hover:bg-[#3a5452]">
            <Plus className="w-6 h-6 text-white" />
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[90vh] overflow-hidden">
          <ScrollArea className="h-[calc(100vh-120px)] w-full pr-4">
            <SheetHeader className="sticky top-0 z-10 bg-background pb-6">
              <SheetTitle className="font-baskerville font-normal">
                {memberToEdit ? "Edit Village Member" : "Add Village Member"}
              </SheetTitle>
            </SheetHeader>
            <form onSubmit={handleSubmit} className="space-y-6 mt-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={newMember.name}
                  onChange={(e) =>
                    setNewMember({ ...newMember, name: e.target.value })
                  }
                  placeholder="Enter the name of the member"
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
                    <SelectValue placeholder="Choose the type of member" />
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
                  onValueChange={(
                    value: "informeel" | "formeel" | "inspiratie",
                  ) => setNewMember({ ...newMember, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a category" />
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
                    <SelectValue placeholder="Select contact frequency" />
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
                    <SelectValue placeholder="Choose a circle" />
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
              <Button type="submit" className="w-full mb-8">
                {memberToEdit ? "Update Member" : "Add Member"}
              </Button>
            </form>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={!!memberToDelete}
        onOpenChange={(open) => !open && setMemberToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {memberToDelete?.name} from your village. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* List View */}
      {showListView && (
        <div
          className="fixed inset-0 z-20 overflow-auto pt-20 pb-24 px-4 animate-gradient"
          style={{
            backgroundSize: "400% 400%",
            background: `linear-gradient(135deg, #C9E1D4 0%, #F2F0E5 50%, #F2F0E5 100%)`,
          }}
        >
          <ScrollArea className="h-[calc(100vh-100px)]">
            <div className="space-y-4 mb-20">
              {[1, 2, 3, 4, 5].map((circle) => (
                <div key={circle}>
                  <h3 className="text-lg font-semibold mb-2">
                    Circle {circle}
                  </h3>
                  <div className="space-y-2">
                    {members
                      .filter((member) => member.circle === circle)
                      .map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between bg-white p-3 rounded-lg border"
                        >
                          <div className="flex items-center space-x-3">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{
                                backgroundColor: member.category
                                  ? CATEGORY_COLORS[member.category]
                                  : "#6b7280",
                              }}
                            />
                            <span>{member.name}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                setSelectedMember(member);
                                setIsMemoryDialogOpen(true);
                              }}
                              className="p-1.5 hover:bg-gray-100 rounded-full"
                            >
                              <BookMarked className="w-4 h-4 text-purple-500" />
                            </button>
                            <button
                              onClick={() => handleEdit(member)}
                              className="p-1.5 hover:bg-gray-100 rounded-full"
                            >
                              <Edit2 className="w-4 h-4 text-gray-500" />
                            </button>
                            <button
                              onClick={() => setMemberToDelete(member)}
                              className="p-1.5 hover:bg-gray-100 rounded-full"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Memories Dialog */}
      <Sheet open={isMemoryDialogOpen} onOpenChange={setIsMemoryDialogOpen}>
        <SheetContent side="bottom" className="h-[90vh] overflow-y-auto pb-20">
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
                      onChange={(e) =>
                        setNewMemory({ ...newMemory, title: e.target.value })
                      }
                      placeholder="Enter a title for this memory"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="content">Memory Details</Label>
                    <Textarea
                      id="content"
                      value={newMemory.content}
                      onChange={(e) =>
                        setNewMemory({ ...newMemory, content: e.target.value })
                      }
                      placeholder="What happened? How did it make you feel?"
                      className="min-h-[150px] mb-16 resize-none"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="date">Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={newMemory.date}
                        onChange={(e) =>
                          setNewMemory({ ...newMemory, date: e.target.value })
                        }
                        placeholder="Select the date of the memory"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emotionalImpact">Emotional Impact</Label>
                      <Select
                        value={String(newMemory.emotionalImpact)}
                        onValueChange={(value) =>
                          setNewMemory({
                            ...newMemory,
                            emotionalImpact: Number(value),
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select emotional impact" />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5].map((n) => (
                            <SelectItem key={n} value={String(n)}>
                              {n} Star{n !== 1 ? "s" : ""}
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
                      onChange={(e) =>
                        setNewMemory({
                          ...newMemory,
                          tags: e.target.value
                            .split(",")
                            .map((tag) => tag.trim())
                            .filter(Boolean),
                        })
                      }
                      placeholder="e.g., milestone, support, advice"
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Save Memory
                  </Button>
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

      {/* Add/Edit member dialog */}
      <Sheet
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) {
            setMemberToEdit(null);
            setNewMember({
              name: "",
              type: "individual",
              circle: 1,
              category: "informeel",
              contactFrequency: "M",
            });
          }
        }}
      >
        <SheetTrigger asChild>
          <button className="fixed bottom-20 right-4 w-12 h-12 bg-[#2F4644] rounded-full flex items-center justify-center shadow-lg hover:bg-[#3a5452] z-50">
            <Plus className="w-6 h-6 text-white" />
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
          <ScrollArea className="h-[calc(100vh-120px)] w-full pr-4">
            <SheetHeader className="sticky top-0 z-10 bg-background pb-6">
              <SheetTitle className="font-baskerville font-normal">
                {memberToEdit ? "Edit Village Member" : "Add Village Member"}
              </SheetTitle>
            </SheetHeader>
            <form onSubmit={handleSubmit} className="space-y-6 mt-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={newMember.name}
                  onChange={(e) =>
                    setNewMember({ ...newMember, name: e.target.value })
                  }
                  placeholder="Enter the name of the member"
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
                    <SelectValue placeholder="Choose the type of member" />
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
                  onValueChange={(
                    value: "informeel" | "formeel" | "inspiratie",
                  ) => setNewMember({ ...newMember, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a category" />
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
                    <SelectValue placeholder="Select contact frequency" />
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
                    <SelectValue placeholder="Choose a circle" />
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
              <Button type="submit" className="w-full mb-8">
                {memberToEdit ? "Update Member" : "Add Member"}
              </Button>
            </form>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}

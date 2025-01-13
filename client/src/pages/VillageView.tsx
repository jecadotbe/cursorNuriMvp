import { useState } from "react";
import { useVillage } from "@/hooks/use-village";
import VillageCircle from "@/components/VillageCircle";
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
import { Plus } from "lucide-react";

export default function VillageView() {
  const { members, addMember } = useVillage();
  const [isOpen, setIsOpen] = useState(false);
  const [newMember, setNewMember] = useState({
    name: "",
    type: "individual",
    circle: 1,
    interactionFrequency: 1,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addMember(newMember);
    setIsOpen(false);
    setNewMember({
      name: "",
      type: "individual",
      circle: 1,
      interactionFrequency: 1,
    });
  };

  return (
    <div className="min-h-screen p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Mijn Village</h1>
          <p className="text-gray-500">
            Een bloeiende Village als middel tegen 'Village Armoede'
          </p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="icon" className="rounded-full">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Village Member</DialogTitle>
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
                Add Member
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative aspect-square w-full max-w-2xl mx-auto">
        <VillageCircle members={members} />
      </div>
    </div>
  );
}


import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useVillageMemories } from "@/hooks/use-village-memories";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface VillageMemberMemoriesProps {
  memberId: number;
  memberName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VillageMemberMemories({ memberId, memberName, open, onOpenChange }: VillageMemberMemoriesProps) {
  const { memories, isLoading } = useVillageMemories(memberId);

  if (isLoading) {
    return <div>Loading memories...</div>;
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh]">
        <SheetHeader>
          <SheetTitle>Herinneringen met {memberName}</SheetTitle>
          <span className="text-sm text-muted-foreground">
            {memories.length} {memories.length === 1 ? 'herinnering' : 'herinneringen'}
          </span>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(90vh-120px)] mt-4">
          <div className="space-y-4">
            {memories.map((memory) => (
              <Card key={memory.id} className="bg-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{memory.title}</CardTitle>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: memory.emotionalImpact }).map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                  </div>
                  <CardDescription>
                    {format(new Date(memory.date), 'PPP')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{memory.content}</p>
                  {memory.tags && memory.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {memory.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            {memories.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                Nog geen herinneringen vastgelegd. Voeg je eerste herinnering toe om je relatiereis te volgen.
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

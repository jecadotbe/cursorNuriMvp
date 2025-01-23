
import { format } from "date-fns";
import { useVillageMemories } from "@/hooks/use-village-memories";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "@/components/ui/drawer";

interface VillageMemberMemoriesProps {
  memberId: number;
  memberName: string;
}

export function VillageMemberMemories({ memberId, memberName }: VillageMemberMemoriesProps) {
  const { memories, isLoading } = useVillageMemories(memberId);

  if (isLoading) {
    return <div>Loading memories...</div>;
  }

  return (
    <ScrollArea className="h-[70vh] px-4">
      <div className="space-y-4 pb-8">
        {memories.map((memory) => (
          <Drawer key={memory.id}>
            <DrawerTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span>{memory.title}</span>
                <div className="flex items-center gap-1">
                  {Array.from({ length: memory.emotionalImpact }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
              </Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>{memory.title}</DrawerTitle>
                <DrawerDescription>
                  {format(new Date(memory.date), 'PPP')}
                </DrawerDescription>
              </DrawerHeader>
              <div className="p-4">
                <p className="text-sm whitespace-pre-wrap">{memory.content}</p>
                {memory.tags && memory.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {memory.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                )}
              </div>
              <DrawerFooter>
                <Button variant="outline">Close</Button>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        ))}
        {memories.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            No memories recorded yet. Add your first memory to start tracking your relationship journey.
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

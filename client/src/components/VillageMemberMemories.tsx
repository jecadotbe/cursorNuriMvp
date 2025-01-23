
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useVillageMemories } from "@/hooks/use-village-memories";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerDescription } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

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
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="outline">View Memories</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Memories with {memberName}</DrawerTitle>
          <DrawerDescription>
            {memories.length} {memories.length === 1 ? 'memory' : 'memories'}
          </DrawerDescription>
        </DrawerHeader>
        <ScrollArea className="h-[70vh] px-4">
          <div className="space-y-4 pb-8">
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
                No memories recorded yet. Add your first memory to start tracking your relationship journey.
              </div>
            )}
          </div>
        </ScrollArea>
        <DrawerFooter>
          <Button variant="outline">Close</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

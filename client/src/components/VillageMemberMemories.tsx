
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useVillageMemories } from "@/hooks/use-village-memories";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
    <div className="flex flex-col h-full">
      <Tabs defaultValue="view" className="flex flex-col flex-1">
        <TabsList>
          <TabsTrigger value="view">View Memories</TabsTrigger>
          <TabsTrigger value="add">Add Memory</TabsTrigger>
        </TabsList>
        <TabsContent value="view" className="flex-1 mt-4">
          <ScrollArea className="h-[calc(100vh-300px)]">
            <div className="space-y-4 pr-4">
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
        </TabsContent>
        <TabsContent value="add" className="flex-1 mt-4">
          <ScrollArea className="h-[calc(100vh-300px)]">
            <div className="space-y-4 pr-4">
              <form className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" placeholder="Enter memory title" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">Content</Label>
                  <Textarea id="content" placeholder="What happened?" className="min-h-[150px]" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input id="date" type="date" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="impact">Emotional Impact</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select impact" />
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
                  <Label htmlFor="tags">Tags</Label>
                  <Input id="tags" placeholder="Enter tags (comma-separated)" />
                </div>
                <Button type="submit" className="w-full">Save Memory</Button>
              </form>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

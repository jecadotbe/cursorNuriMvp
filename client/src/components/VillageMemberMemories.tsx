import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useVillageMemories } from "@/hooks/use-village-memories";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { useState } from 'react';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";

interface VillageMemberMemoriesProps {
  memberId: number;
  memberName: string;
}

export function VillageMemberMemories({ memberId, memberName }: VillageMemberMemoriesProps) {
  const { memories, isLoading, deleteMemory, addMemory } = useVillageMemories(memberId);
  const [memoryToDelete, setMemoryToDelete] = useState<number | null>(null);

  const handleDeleteMemory = async (memoryId: number) => {
    try {
      await deleteMemory(memoryId);
      setMemoryToDelete(null);
      console.log('Memory deleted:', memoryId);
    } catch (error) {
      console.error('Failed to delete memory:', error);
    }
  };

  if (isLoading) {
    return <div>Loading memories...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="h-[calc(100vh-300px)]">
        <div className="space-y-4 pr-4">
          {memories.map((memory) => (
            <Card key={memory.id} className="bg-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{memory.title}</CardTitle>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setMemoryToDelete(memory.id)} className="p-2 hover:bg-gray-100 rounded-full">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 14.74a6 6 0 11-8.49 8.49" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 19.5a6 6 0 11-8.48-8.48" />
                      </svg>
                    </button>
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

      <AlertDialog open={!!memoryToDelete} onOpenChange={(open) => !open && setMemoryToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Memory</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this memory? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                if (memoryToDelete) {
                  handleDeleteMemory(memoryToDelete);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
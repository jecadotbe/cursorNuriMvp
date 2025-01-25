import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

interface Memory {
  id: number;
  title: string;
  content: string;
  date: string;
  emotionalImpact: number;
  tags: string[];
}

export function useVillageMemories(memberId: number) {
  const queryClient = useQueryClient();

  const { data: memories, isLoading } = useQuery<Memory[]>({
    queryKey: [`/api/village/members/${memberId}/memories`],
    enabled: !!memberId,
  });

  const addMemoryMutation = useMutation({
    mutationFn: async (newMemory: Omit<Memory, "id">) => {
      const response = await fetch(`/api/village/members/${memberId}/memories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMemory),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to add memory");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/village/members/${memberId}/memories`] });
      toast({
        title: "Success",
        description: "Memory added successfully",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add memory",
      });
    },
  });

  const deleteMemoryMutation = useMutation({
    mutationFn: async (memoryId: number) => {
      console.log('Deleting memory:', memoryId, 'for member:', memberId);
      const response = await fetch(`/api/village/members/${memberId}/memories/${memoryId}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to delete memory: ${error}`);
      }

      return memoryId;
    },
    onSuccess: (deletedMemoryId) => {
      // Optimistically update the cache
      queryClient.setQueryData<Memory[]>(
        [`/api/village/members/${memberId}/memories`],
        (old) => old?.filter(memory => memory.id !== deletedMemoryId) || []
      );
      
      // Invalidate and refetch in background
      queryClient.invalidateQueries({
        queryKey: [`/api/village/members/${memberId}/memories`],
        exact: true
      });
      
      // Also invalidate any parent queries that might include this data
      queryClient.invalidateQueries({
        queryKey: [`/api/village/members/${memberId}`],
        exact: false
      });
      toast({
        title: "Success",
        description: "Memory deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete memory",
      });
    },
  });

  return {
    memories: memories || [],
    isLoading,
    addMemory: addMemoryMutation.mutate,
    deleteMemory: deleteMemoryMutation.mutate,
  };
}

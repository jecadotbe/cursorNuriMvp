import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { VillageMember, InsertVillageMember } from "@db/schema";
import { useToast } from './use-toast';

async function fetchVillageMembers(): Promise<VillageMember[]> {
  const response = await fetch('/api/village', {
    credentials: 'include'
  });

  if (!response.ok) {
    if (response.status >= 500) {
      throw new Error(`${response.status}: ${response.statusText}`);
    }

    throw new Error(`${response.status}: ${await response.text()}`);
  }

  return response.json();
}

async function createVillageMember(member: Omit<InsertVillageMember, 'userId'>): Promise<VillageMember> {
  const response = await fetch('/api/village', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(member),
  });

  if (!response.ok) {
    if (response.status >= 500) {
      throw new Error(`${response.status}: ${response.statusText}`);
    }

    throw new Error(`${response.status}: ${await response.text()}`);
  }

  return response.json();
}

export function useVillage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: members = [], isLoading, error } = useQuery<VillageMember[], Error>({
    queryKey: ['village'],
    queryFn: fetchVillageMembers,
    staleTime: Infinity,
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: createVillageMember,
    onSuccess: (newMember) => {
      queryClient.setQueryData<VillageMember[]>(['village'], (old = []) => [...old, newMember]);
      toast({
        title: "Success",
        description: `Added ${newMember.name} to your village`,
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  return {
    members,
    isLoading,
    error,
    addMember: mutation.mutateAsync,
    isAdding: mutation.isPending,
  };
}
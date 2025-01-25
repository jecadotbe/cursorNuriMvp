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
  // Initialize with a random angle if not provided
  const memberWithAngle = {
    ...member,
    positionAngle: member.positionAngle || (Math.random() * 2 * Math.PI).toString()
  };

  const response = await fetch('/api/village', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(memberWithAngle),
  });

  if (!response.ok) {
    const errorText = await response.text();
    try {
      const errorJson = JSON.parse(errorText);
      throw new Error(errorJson.message || `Error: ${response.status}`);
    } catch (e) {
      throw new Error(`Request failed: ${response.status}`);
    }
  }

  return response.json();
}

async function updateVillageMember(member: Partial<VillageMember> & { id: number }): Promise<VillageMember> {
  // Ensure positionAngle is always stored as a string
  const memberToUpdate = {
    ...member,
    positionAngle: member.positionAngle?.toString()
  };

  const response = await fetch(`/api/village/${member.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(memberToUpdate),
  });

  if (!response.ok) {
    const errorText = await response.text();
    try {
      const errorJson = JSON.parse(errorText);
      throw new Error(errorJson.message || `Error: ${response.status}`);
    } catch (e) {
      throw new Error(`Request failed: ${response.status}`);
    }
  }

  return response.json();
}

async function deleteVillageMember(id: number): Promise<void> {
  const response = await fetch(`/api/village/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    const errorText = await response.text();
    try {
      const errorJson = JSON.parse(errorText);
      throw new Error(errorJson.message || `Error: ${response.status}`);
    } catch (e) {
      throw new Error(`Request failed: ${response.status}`);
    }
  }
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

  const createMutation = useMutation({
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

  const updateMutation = useMutation({
    mutationFn: updateVillageMember,
    onSuccess: (updatedMember) => {
      queryClient.setQueryData<VillageMember[]>(['village'], (old = []) => 
        old.map(member => member.id === updatedMember.id ? {
          ...updatedMember,
          positionAngle: updatedMember.positionAngle?.toString() // Ensure consistent string format
        } : member)
      );
      toast({
        title: "Success",
        description: `Updated ${updatedMember.name}`,
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

  const deleteMutation = useMutation({
    mutationFn: deleteVillageMember,
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData<VillageMember[]>(['village'], (old = []) => 
        old.filter(member => member.id !== deletedId)
      );
      toast({
        title: "Success",
        description: "Member removed from your village",
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
    members: members.map(member => ({
      ...member,
      positionAngle: member.positionAngle?.toString() // Ensure consistent string format
    })),
    isLoading,
    error,
    addMember: createMutation.mutateAsync,
    updateMember: updateMutation.mutateAsync,
    deleteMember: deleteMutation.mutateAsync,
    isAdding: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface Suggestion {
  id: number;
  text: string;
  type: string;
  context?: string;
  relevance?: number;
}

interface VillageSuggestionOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  maxSuggestions?: number;
  filterByType?: readonly string[];
}

export function useVillageSuggestions({
  autoRefresh = false,
  refreshInterval = 60000,
  maxSuggestions = 3,
  filterByType,
}: VillageSuggestionOptions = {}) {
  const queryClient = useQueryClient();

  const fetchVillageSuggestions = async (): Promise<Suggestion[]> => {
    try {
      // Use the member-suggestions endpoint that retrieves from the database
      const response = await fetch('/api/member-suggestions?type=village');

      if (!response.ok) {
        throw new Error('Failed to fetch village suggestions');
      }

      return response.json();
    } catch (error) {
      console.error('Error fetching village suggestions:', error);
      throw error;
    }
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['village-suggestions'],
    queryFn: fetchVillageSuggestions,
    staleTime: refreshInterval,
    refetchInterval: autoRefresh ? refreshInterval : false,
  });
  
  // Force refresh function to invalidate and refetch data
  const forceRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['village-suggestions'] });
    return refetch();
  };

  const markAsUsed = async (id: number) => {
    try {
      const response = await fetch(`/api/suggestions/${id}/use`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark suggestion as used');
      }
      
      // Invalidate and refetch suggestions after marking one as used
      queryClient.invalidateQueries({ queryKey: ['village-suggestions'] });
      return response.json();
    } catch (error) {
      console.error('Error marking suggestion as used:', error);
      throw error;
    }

      if (!response.ok) {
        throw new Error('Failed to mark suggestion as used');
      }
      
      // Invalidate after marking as used
      queryClient.invalidateQueries({ queryKey: ['village-suggestions'] });
    } catch (error) {
      console.error('Error marking suggestion as used:', error);
      throw error;
    }
  };
  
  // Function to invalidate suggestions cache
  const invalidateSuggestions = () => {
    queryClient.invalidateQueries({ queryKey: ['village-suggestions'] });
  };
  
  return {
    suggestions: data?.slice(0, maxSuggestions) || [],
    isLoading,
    error,
    refetch,
    markAsUsed,
    invalidateSuggestions,
    forceRefresh
  };

      // Update local state
      queryClient.setQueryData(
        ['village-suggestions'],
        (oldData: Suggestion[] | undefined) => {
          if (!oldData) return [];
          return oldData.filter(suggestion => suggestion.id !== id);
        }
      );

      return response.json();
    } catch (error) {
      console.error('Error marking suggestion as used:', error);
      throw error;
    }
  };

  const forceRefresh = async () => {
    try {
      // Force refresh should use the appropriate endpoint
      const response = await fetch('/api/member-suggestions/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to refresh suggestions');
      }

      await queryClient.invalidateQueries({ queryKey: ['village-suggestions'] });
      return refetch();
    } catch (error) {
      console.error('Error refreshing suggestions:', error);
    }
  };

  const invalidateSuggestions = () => {
    queryClient.invalidateQueries({ queryKey: ['village-suggestions'] });
  };

  // Filter and limit suggestions
  const filteredSuggestions = data?.filter(suggestion => 
    !filterByType || filterByType.includes(suggestion.type)
  ).slice(0, maxSuggestions);

  return {
    suggestions: filteredSuggestions || [],
    isLoading,
    error,
    refetch,
    markAsUsed,
    forceRefresh,
    invalidateSuggestions,
  };
}
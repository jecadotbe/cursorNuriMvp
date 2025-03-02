import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useVillage } from '@/hooks/use-village';
import { Loader2, Check, Plus, UserPlus, X } from 'lucide-react';

interface VillageRecommendation {
  name: string;
  confidence: number;
  source: 'chat' | 'memory';
  mentioned: number;
  type?: string;
}

export function VillageRecommendations() {
  const [recommendations, setRecommendations] = useState<VillageRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [adding, setAdding] = useState<Record<string, boolean>>({});
  const [added, setAdded] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const { members, addMember, updateMember, deleteMember } = useVillage();

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/chat/village/recommendations', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.recommendations) {
          setRecommendations(data.recommendations);
        }
      }
    } catch (error) {
      console.error('Error fetching village recommendations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMember = async (recommendation: VillageRecommendation) => {
    if (adding[recommendation.name] || added[recommendation.name]) {
      return;
    }

    setAdding(prev => ({ ...prev, [recommendation.name]: true }));
    
    try {
      const response = await fetch('/api/chat/village/recommendations/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          name: recommendation.name,
          type: recommendation.type || 'other',
          circle: 2, // Default to support circle
          category: 'informeel' // Default category
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAdded(prev => ({ ...prev, [recommendation.name]: true }));
          toast({
            title: 'Toegevoegd aan Village',
            description: `${recommendation.name} is toegevoegd aan je Village`,
            variant: 'default',
          });
          
          // No need to refresh here - handled by react-query in parent component
        } else {
          toast({
            title: 'Let op',
            description: data.message || 'Deze persoon kon niet worden toegevoegd',
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      console.error('Error adding village member:', error);
      toast({
        title: 'Fout',
        description: 'Er is een fout opgetreden bij het toevoegen aan je Village',
        variant: 'destructive',
      });
    } finally {
      setAdding(prev => ({ ...prev, [recommendation.name]: false }));
    }
  };

  const handleIgnore = (recommendation: VillageRecommendation) => {
    // Remove this recommendation from the list
    setRecommendations(prev => prev.filter(r => r.name !== recommendation.name));
  };

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Aanbevolen voor je Village</CardTitle>
          <CardDescription>We zoeken naar mogelijke village-leden</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  if (recommendations.length === 0) {
    return null; // Don't show anything if no recommendations
  }

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Aanbevolen voor je Village</CardTitle>
        <CardDescription>
          Mensen die we hebben ontdekt in je gesprekken
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recommendations.map((recommendation) => (
            <div 
              key={recommendation.name} 
              className="flex items-center justify-between border-b border-gray-100 pb-2"
            >
              <div className="flex items-center">
                <div className="font-medium">{recommendation.name}</div>
                {recommendation.source === 'chat' && (
                  <span className="ml-2 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                    Uit gesprek
                  </span>
                )}
                {recommendation.source === 'memory' && (
                  <span className="ml-2 text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                    Uit geheugen
                  </span>
                )}
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => handleIgnore(recommendation)}
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className={`h-8 ${
                    added[recommendation.name] 
                      ? "bg-green-600 hover:bg-green-700" 
                      : "bg-[#629785] hover:bg-[#4A7566]"
                  }`}
                  onClick={() => handleAddMember(recommendation)}
                  disabled={adding[recommendation.name] || added[recommendation.name]}
                >
                  {adding[recommendation.name] ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : added[recommendation.name] ? (
                    <Check className="h-4 w-4 mr-1" />
                  ) : (
                    <Plus className="h-4 w-4 mr-1" />
                  )}
                  <span>{added[recommendation.name] ? 'Toegevoegd' : 'Toevoegen'}</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="pt-2 justify-end">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={fetchRecommendations}
          className="text-xs text-gray-500"
        >
          Vernieuwen
        </Button>
      </CardFooter>
    </Card>
  );
}
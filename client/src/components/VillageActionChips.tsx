import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Check } from 'lucide-react';
import { useVillage } from '@/hooks/use-village';
import type { InsertVillageMember } from '@db/schema';
import { useToast } from '@/hooks/use-toast';

interface VillageActionProps {
  id: string;
  name: string;
  action: string;
  children: React.ReactNode;
}

interface VillageMemberData {
  name: string;
  type?: string;
  circle?: number;
  category?: "informeel" | "formeel" | "inspiratie" | null;
  contactFrequency?: "S" | "M" | "L" | "XL" | null;
}

/**
 * Component to render an individual village action chip
 */
export const VillageAction: React.FC<VillageActionProps> = ({
  id,
  name,
  action,
  children
}) => {
  const { createMember } = useVillage();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isComplete, setIsComplete] = React.useState(false);
  
  const handleClick = async () => {
    if (isLoading || isComplete) return;
    
    setIsLoading(true);
    
    try {
      if (action === 'add-to-village') {
        // Add a single member to the village
        const memberData: VillageMemberData = {
          name,
          type: 'Friend',
          circle: 2,
          category: 'informeel',
          contactFrequency: 'M'
        };
        
        await createMember(memberData);
        setIsComplete(true);
        
        toast({
          title: 'Toegevoegd aan Village',
          description: `${name} is toegevoegd aan je Village`,
          variant: 'default',
        });
      }
    } catch (error) {
      console.error('Error adding village member:', error);
      toast({
        title: 'Fout',
        description: 'Er is een fout opgetreden bij het toevoegen aan je Village',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Button
      onClick={handleClick}
      size="sm"
      variant={isComplete ? "outline" : "default"}
      className="mr-2 my-1 rounded-full"
      disabled={isLoading || isComplete}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          <span>Bezig...</span>
        </>
      ) : isComplete ? (
        <>
          <Check className="mr-1 h-4 w-4" />
          <span>Toegevoegd</span>
        </>
      ) : (
        <>
          <Plus className="mr-1 h-4 w-4" />
          {children}
        </>
      )}
    </Button>
  );
};

/**
 * Component to parse and render village actions from chat messages
 */
export const VillageActionChips: React.FC<{ content: string }> = ({ content }) => {
  // Extract action sections from the message
  const actionSectionRegex = /<village-actions>([\s\S]*?)<\/village-actions>/g;
  const actionSections = [...content.matchAll(actionSectionRegex)];
  
  if (actionSections.length === 0) {
    return null;
  }
  
  // Extract individual actions from the section
  const actionRegex = /<village-action id="(.*?)" name="(.*?)" action="(.*?)">(.*?)<\/village-action>/g;
  
  return (
    <>
      {actionSections.map((section, sectionIndex) => {
        const sectionContent = section[1];
        const actions = [...sectionContent.matchAll(actionRegex)];
        
        return (
          <div key={`section-${sectionIndex}`} className="flex flex-wrap my-2">
            {actions.map((action, actionIndex) => {
              const [_, id, name, actionType, label] = action;
              
              return (
                <VillageAction 
                  key={`action-${actionIndex}`}
                  id={id}
                  name={name}
                  action={actionType}
                >
                  {label}
                </VillageAction>
              );
            })}
          </div>
        );
      })}
    </>
  );
};

/**
 * Custom markdown renderer that processes village action tags
 */
export function processVillageActions(content: string): string {
  // Remove the village-actions tags but preserve the content for rendering
  return content.replace(/<village-actions>[\s\S]*?<\/village-actions>/g, '');
}
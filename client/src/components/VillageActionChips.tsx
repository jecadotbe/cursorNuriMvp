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

// We don't need this interface anymore since we're using the schema directly
// and providing explicit type assertions in the component

/**
 * Component to render an individual village action chip
 */
export const VillageAction: React.FC<VillageActionProps> = ({
  id,
  name,
  action,
  children
}) => {
  const { addMember } = useVillage();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isComplete, setIsComplete] = React.useState(false);
  
  const handleClick = async () => {
    if (isLoading || isComplete) return;
    
    setIsLoading(true);
    
    try {
      if (action === 'add-to-village') {
        // Add a single member to the village
        const memberData = {
          name,
          type: 'Friend', // Required field
          circle: 2, // Required field
          category: 'informeel' as "informeel", // Type assertion to match the enum
          contactFrequency: 'M' as "M" // Type assertion to match the enum
        };
        
        await addMember(memberData);
        setIsComplete(true);
        
        toast({
          title: 'Toegevoegd aan Village',
          description: `${name} is toegevoegd aan je Village`,
          variant: 'default',
        });
      } else if (action === 'add-all-to-village') {
        // Get the current message content from the DOM
        // We need to identify which message contains our action
        let messageText = '';
        
        try {
          // Try to find the closest message content by traversing up the DOM
          const button = document.activeElement as HTMLElement;
          const messageContainer = button?.closest('[data-message-content]') as HTMLElement;
          
          if (messageContainer) {
            // Extract only the text content, without the action buttons
            messageText = messageContainer.getAttribute('data-message-content') || '';
          } else {
            // Fallback: try to get the message from the DOM more broadly
            const allMessages = document.querySelectorAll('[data-message-content]');
            if (allMessages.length > 0) {
              // Get the latest message
              const latestMessage = allMessages[allMessages.length - 1] as HTMLElement;
              messageText = latestMessage.getAttribute('data-message-content') || '';
            }
          }
        } catch (error) {
          console.error('Error getting message text:', error);
        }
        
        // This is handled by a separate backend endpoint
        // We'll make a direct API call since it's a bulk operation
        try {
          const response = await fetch('/api/chat/village/add-all', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              message: messageText // Send the message text to help the backend identify members
            }),
          });
          
          if (!response.ok) {
            throw new Error('Failed to add members');
          }
          
          const result = await response.json();
          setIsComplete(true);
          
          toast({
            title: 'Toegevoegd aan Village',
            description: `${result.addedMembers.length} mensen toegevoegd aan je Village`,
            variant: 'default',
          });
        } catch (error) {
          console.error('Error adding all village members:', error);
          toast({
            title: 'Fout',
            description: 'Er is een fout opgetreden bij het toevoegen aan je Village',
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
      setIsLoading(false);
    }
  };
  
  return (
    <Button
      onClick={handleClick}
      size="sm"
      variant={isComplete ? "outline" : "default"} 
      className={`mr-2 my-1 rounded-full ${isComplete ? "bg-gray-100 text-gray-500" : "bg-[#629785] hover:bg-[#4A7566] text-white"}`}
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
  const actionSections = Array.from(content.matchAll(actionSectionRegex));
  
  if (actionSections.length === 0) {
    return null;
  }
  
  // Extract individual actions from the section
  const actionRegex = /<village-action id="(.*?)" name="(.*?)" action="(.*?)">(.*?)<\/village-action>/g;
  
  return (
    <>
      {actionSections.map((section, sectionIndex) => {
        const sectionContent = section[1];
        const actions = Array.from(sectionContent.matchAll(actionRegex));
        
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
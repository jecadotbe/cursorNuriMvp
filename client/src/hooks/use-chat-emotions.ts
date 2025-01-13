import { useQuery } from "@tanstack/react-query";
import { useToast } from "./use-toast";

interface EmotionalContext {
  primaryEmotion: string;
  emotionalContext: string;
}

export function useChatEmotions(chatId: string | number) {
  const { toast } = useToast();

  const { data: emotionalContext, isLoading } = useQuery<{ emotionalContext: EmotionalContext | null }>({
    queryKey: [`/api/chats/${chatId}/emotional-context`],
    enabled: !!chatId,
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  return {
    emotionalContext: emotionalContext?.emotionalContext,
    isLoading,
  };
}

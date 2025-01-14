import { Link, useLocation } from "wouter";
import { useChatHistory } from "@/hooks/use-chat-history";
import { ArrowLeft, MessageSquare, Clock, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import type { Chat } from "@db/schema";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function ChatHistoryView() {
  const { chats = [], isLoading } = useChatHistory();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const startNewChat = async () => {
    try {
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `Chat ${format(new Date(), 'M/d/yyyy')}`,
          messages: [],
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to create new chat');
      }

      const newChat = await response.json();
      if (!newChat.id) {
        throw new Error('No chat ID received from server');
      }

      // Navigate to the new chat using the ID
      navigate(`/chat/${newChat.id}`);
    } catch (error) {
      console.error('Error creating new chat:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not create a new chat. Please try again.",
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F2F0E5]">
      {/* Header */}
      <div className="w-full px-4 py-3 flex items-center justify-between border-b border-gray-200 bg-white">
        <Link href="/">
          <button className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
        </Link>
        <h1 className="text-lg font-semibold">Gesprekken</h1>
        <Button
          onClick={startNewChat}
          className="p-2 bg-[#629785] hover:bg-[#4A7566] rounded-full"
        >
          <Plus className="w-6 h-6 text-white" />
        </Button>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-8">
        {isLoading ? (
          <div className="text-center py-4 text-gray-500">Laden...</div>
        ) : chats.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            Nog geen gesprekken gevonden
          </div>
        ) : (
          chats.map((chat: Chat) => {
            const messages = Array.isArray(chat.messages) ? chat.messages : [];
            const lastMessage = messages[messages.length - 1];
            const chatDate = chat.updatedAt || chat.createdAt || new Date();

            return (
              <Link key={chat.id} href={`/chat/${chat.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-[#FFC74A] flex items-center justify-center flex-shrink-0">
                        <MessageSquare className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate text-lg">
                          {chat.title || "Gesprek"}
                        </h3>
                        <p className="text-sm text-gray-500 line-clamp-2 mt-2">
                          {lastMessage?.content || "Geen berichten"}
                        </p>
                        <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
                          <Clock className="w-4 h-4" />
                          {format(new Date(chatDate), "d MMM yyyy, HH:mm")}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
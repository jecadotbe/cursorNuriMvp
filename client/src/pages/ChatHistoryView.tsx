import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { useChatHistory } from "@/hooks/use-chat-history";
import { ArrowLeft, Plus, Trash } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatHistoryView() {
  const { chats = [], isLoading } = useChatHistory();
  const [isDeleting, setIsDeleting] = useState(false);
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

  const handleDeleteChat = async (chatId: number) => {
    if (isDeleting) return;

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/chats/${chatId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete chat');
      }

      toast({
        title: "Success",
        description: "Chat deleted successfully.",
      });

      // Reload the page to refresh the chat list
      window.location.reload();
    } catch (error) {
      console.error('Error deleting chat:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete chat. Please try again.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#F2F0E5]">
      <div className="w-full px-4 py-3 flex items-center justify-between border-b border-gray-200 bg-[#F2F0E5] fixed top-0 left-0 z-50">
        <Link href="/">
          <button className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
        </Link>
        <h1 className="text-lg font-baskerville">Mijn gesprekken</h1>
        <button
          onClick={startNewChat}
          className="p-2 bg-[#629785] hover:bg-[#4A7566] rounded-full"
        >
          <Plus className="w-6 h-6 text-white" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 pt-16">
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#629785]"></div>
          </div>
        ) : chats.length === 0 ? (
          <Card className="bg-white hover:shadow-md transition-all rounded-2xl shadow-sm border-0 cursor-pointer" onClick={startNewChat}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Start a new chat</span>
                <Plus className="w-5 h-5 text-gray-400" />
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {chats.map((chat) => {
              const messages = Array.isArray(chat.messages) ? (chat.messages as ChatMessage[]) : [];
              const lastMessage = messages[messages.length - 1];

              return (
                <Card key={chat.id} className="hover:shadow-md transition-all bg-white rounded-2xl shadow-sm border-0">
                  <CardContent className="p-5">
                    <div className="flex flex-col">
                      <Link href={`/chat/${chat.id}`} className="flex-1 min-w-0">
                        <h3 className="font-medium truncate font-baskerville">{chat.title || "Gesprek"}</h3>
                      </Link>
                      <p className="text-sm text-gray-500 line-clamp-2 mt-1 mb-2 break-words font-baskerville">
                        {lastMessage?.content || "Geen berichten"}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-500">
                          {format(new Date(chat.updatedAt || chat.createdAt || new Date()), "d MMM yyyy")}
                        </div>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            if (confirm("Are you sure you want to delete this conversation? This action cannot be undone.")) {
                              handleDeleteChat(chat.id);
                            }
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
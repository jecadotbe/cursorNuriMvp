import { Link, useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useChatHistory } from "@/hooks/use-chat-history";
import { ArrowLeft, MessageSquare, Clock, Plus, Trash } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import type { Chat } from "@db/schema";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatHistoryView() {
  const { chats = [], isLoading } = useChatHistory();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingChatId, setEditingChatId] = useState<number | null>(null);

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

  // Memoize the date calculations and chat grouping
  const groupedChats = useMemo(() => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);
    const lastMonth = new Date(today);
    lastMonth.setMonth(today.getMonth() - 1);

    const groups: Record<string, Chat[]> = {
      Today: [],
      Yesterday: [],
      'This Week': [],
      'Last Month': [],
      Older: [],
    };

    chats.forEach(chat => {
      const chatDate = new Date(chat.updatedAt || chat.createdAt || new Date());
      if (format(chatDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
        groups.Today.push(chat);
      } else if (format(chatDate, 'yyyy-MM-dd') === format(yesterday, 'yyyy-MM-dd')) {
        groups.Yesterday.push(chat);
      } else if (chatDate >= lastWeek) {
        groups['This Week'].push(chat);
      } else if (chatDate >= lastMonth) {
        groups['Last Month'].push(chat);
      } else {
        groups.Older.push(chat);
      }
    });

    return groups;
  }, [chats]);

  const updateChatTitle = async (chatId: number, newTitle: string) => {
    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to update chat title');
      }

      await queryClient.invalidateQueries({ queryKey: ['chats'] });
      setEditingChatId(null);
    } catch (error) {
      console.error('Error updating chat title:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update chat title. Please try again.",
      });
    }
  };

  const deleteChat = async (chatId: number) => {
    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete chat');
      }

      await queryClient.invalidateQueries({ queryKey: ['chats'] });
    } catch (error) {
      console.error('Error deleting chat:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete chat. Please try again.",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen animate-gradient">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading chats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen animate-gradient" style={{
      backgroundSize: "400% 400%",
      background: `linear-gradient(135deg, #C9E1D4 0%, #F2F0E5 50%, #F2F0E5 100%)`
    }}>
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
        <div className="grid grid-cols-1 gap-5">
          {Object.entries(groupedChats).map(([groupName, groupChats]) => (
            groupChats.length > 0 && (
              <div key={groupName}>
                <div className="text-sm font-medium text-gray-500 mb-3 mt-6">
                  {groupName}
                </div>
                {groupChats.map((chat) => {
                  const messages = Array.isArray(chat.messages) ? (chat.messages as ChatMessage[]) : [];
                  const lastMessage = messages[messages.length - 1];

                  return (
                    <Card key={chat.id} className="hover:shadow-md transition-all bg-white rounded-2xl shadow-sm border-0">
                      <CardContent className="p-5">
                        <div className="flex flex-col">
                          <div className="flex items-center justify-between">
                            <Link href={`/chat/${chat.id}`} className="flex-1 min-w-0">
                              <h3 className="font-medium truncate font-baskerville">{chat.title || "Gesprek"}</h3>
                            </Link>
                            <Dialog open={editingChatId === chat.id} onOpenChange={(open) => setEditingChatId(open ? chat.id : null)}>
                              <DialogTrigger asChild>
                                <button 
                                  className="text-xs text-gray-500 hover:text-gray-700 flex-shrink-0 ml-2"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  Edit
                                </button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                  <DialogTitle>Edit Chat Title</DialogTitle>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                  <Input
                                    id="title"
                                    defaultValue={chat.title || ''}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        const newTitle = e.currentTarget.value;
                                        if (newTitle && newTitle !== chat.title) {
                                          updateChatTitle(chat.id, newTitle);
                                        }
                                      }
                                    }}
                                  />
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
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
                                  deleteChat(chat.id);
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
            )
          ))}
        </div>
      </div>
    </div>
  );
}
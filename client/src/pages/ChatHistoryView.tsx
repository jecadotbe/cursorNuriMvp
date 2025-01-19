
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

// Add proper typing for the chat messages
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

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
    <div className="flex-1 flex flex-col bg-[#F2F0E5] min-h-screen">
      <div className="w-full px-4 py-3 flex items-center justify-between border-b border-gray-200">
        <Link href="/">
          <button className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
        </Link>
        <h1 className="text-lg font-semibold">Mijn gesprekken</h1>
        <button
          onClick={startNewChat}
          className="p-2 bg-[#629785] hover:bg-[#4A7566] rounded-full"
        >
          <Plus className="w-6 h-6 text-white" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 gap-5">
        {isLoading ? (
          <div className="text-center py-4 text-gray-500">Laden...</div>
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
          chats.reduce<JSX.Element[]>((acc: JSX.Element[], chat: Chat) => {
            const messages = Array.isArray(chat.messages) ? (chat.messages as ChatMessage[]) : [];
            const lastMessage = messages[messages.length - 1];
            const chatDate = new Date(chat.updatedAt || chat.createdAt || new Date());
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            const lastWeek = new Date(today);
            lastWeek.setDate(today.getDate() - 7);
            const lastMonth = new Date(today);
            lastMonth.setMonth(today.getMonth() - 1);

            let dateGroup = '';
            if (format(chatDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
              dateGroup = 'Today';
            } else if (format(chatDate, 'yyyy-MM-dd') === format(yesterday, 'yyyy-MM-dd')) {
              dateGroup = 'Yesterday';
            } else if (chatDate >= lastWeek) {
              dateGroup = 'This Week';
            } else if (chatDate >= lastMonth) {
              dateGroup = 'Last Month';
            } else {
              dateGroup = 'Older';
            }

            if (!acc.find(el => el.key === `divider-${dateGroup}`)) {
              acc.push(
                <div key={`divider-${dateGroup}`} className="text-sm font-medium text-gray-500 mb-3 mt-6">
                  {dateGroup}
                </div>
              );
            }

            acc.push(
              <Card key={chat.id} className="hover:shadow-md transition-all bg-white rounded-2xl shadow-sm border-0">
                <CardContent className="p-5">
                  <div className="flex flex-col">
                    <div className="flex items-center justify-between">
                      <Link href={`/chat/${chat.id}`} className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{chat.title || "Gesprek"}</h3>
                      </Link>
                      <Dialog>
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
                                    fetch(`/api/chats/${chat.id}`, {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ title: newTitle })
                                    }).then(() => window.location.reload());
                                  }
                                }
                              }}
                            />
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-2 mt-1 mb-2 break-words">
                      {lastMessage?.content || "Geen berichten"}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-500">
                        {format(chatDate, "d MMM yyyy")}
                      </div>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          if (confirm("Are you sure you want to delete this conversation? This action cannot be undone.")) {
                            fetch(`/api/chats/${chat.id}`, {
                              method: 'DELETE'
                            }).then(() => window.location.reload());
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
            return acc;
          }, [] as JSX.Element[])
        )}
        </div>
      </div>
    </div>
  );
}

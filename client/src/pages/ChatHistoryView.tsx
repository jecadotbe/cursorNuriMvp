import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { useChatHistory } from "@/hooks/use-chat-history";
import { ArrowLeft, MessageSquare, Clock, Plus, Trash, Check, X, Edit2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import type { Chat } from "@db/schema";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { renderMarkdown } from "@/lib/markdown";
import { useEffect, useState } from "react";

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const replaceTemplateVariables = (content: string) => {
  const now = new Date();
  const formattedDateTime = format(now, "d MMMM yyyy 'om' HH:mm");
  return content.replace(/{{currentDateTime}}/g, formattedDateTime);
};

const formatMessagePreview = (content: string) => {
  const processedContent = replaceTemplateVariables(content);
  return renderMarkdown(processedContent);
};

export default function ChatHistoryView() {
  const queryClient = useQueryClient();
  const { chats = [], isLoading } = useChatHistory();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  useEffect(() => {
    queryClient.prefetchQuery({
      queryKey: ["suggestion"],
      queryFn: () => fetch('/api/suggestions', { credentials: 'include' }).then(r => r.json()),
    });
  }, [queryClient]);

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

  const handleUpdateTitle = async (chatId: number, newTitle: string) => {
    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title: newTitle })
      });

      if (!response.ok) throw new Error('Failed to update title');

      queryClient.setQueryData(['chats'], (old: Chat[] | undefined) => {
        if (!old) return old;
        return old.map(c => 
          c.id === chatId ? { ...c, title: newTitle } : c
        );
      });

      toast({
        title: "Success",
        description: "Title updated successfully"
      });
      setEditingId(null);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update title"
      });
    }
  };

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
          {isLoading ? (
            <div className="text-center py-4 text-gray-500">Laden...</div>
          ) : chats.length === 0 ? (
            <div className="space-y-8 pt-8">
              <div className="text-center space-y-4">
                <h2 className="text-2xl font-baskerville">Welkom bij Nuri</h2>
                <p className="text-gray-600">Wat fijn dat je op deze geweldig spannende reis wilt gaan met ons.</p>
              </div>
              <Card className="bg-white hover:shadow-md transition-all rounded-2xl shadow-sm border-0 cursor-pointer" onClick={startNewChat}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Start je eerste gesprek met Nuri</span>
                    <Plus className="w-5 h-5 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            chats.reduce<JSX.Element[]>((acc: JSX.Element[], chat: Chat) => {
              const messages = Array.isArray(chat.messages) ? (chat.messages as ChatMessage[]) : [];
              const lastMessage = messages[messages.length - 1];
              const chatDate = new Date(chat.updatedAt || chat.createdAt || new Date());

              let dateGroup = '';
              if (format(chatDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')) {
                dateGroup = 'Vandaag';
              } else if (format(chatDate, 'yyyy-MM-dd') === format(new Date(Date.now() - 86400000), 'yyyy-MM-dd')) {
                dateGroup = 'Gisteren';
              } else if (chatDate >= new Date(Date.now() - 604800000)) {
                dateGroup = 'Deze Week';
              } else if (chatDate >= new Date(Date.now() - 2592000000)) {
                dateGroup = 'Vorige Maand';
              } else {
                dateGroup = 'Ouder';
              }

              if (!acc.find(el => el.key === `divider-${dateGroup}`)) {
                acc.push(
                  <div key={`divider-${dateGroup}`} className="text-sm font-medium text-gray-500 mb-3 mt-6">
                    {dateGroup}
                  </div>
                );
              }

              acc.push(
                <motion.div
                  key={chat.id}
                  layout
                  initial={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="hover:shadow-md transition-all bg-white rounded-2xl shadow-sm border-0">
                    <CardContent className="p-5">
                      <div className="flex flex-col">
                        <div className="flex items-center justify-between">
                          {editingId === chat.id ? (
                            <div className="flex items-center gap-2 flex-1">
                              <Input
                                value={editingTitle}
                                onChange={(e) => setEditingTitle(e.target.value)}
                                className="h-8 text-sm font-medium"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleUpdateTitle(chat.id, editingTitle);
                                  } else if (e.key === 'Escape') {
                                    setEditingId(null);
                                  }
                                }}
                              />
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleUpdateTitle(chat.id, editingTitle)}
                                  className="p-1 hover:bg-gray-100 rounded-full text-green-600"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="p-1 hover:bg-gray-100 rounded-full text-red-600"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <Link href={`/chat/${chat.id}`} className="flex-1 min-w-0">
                                <h3 className="font-medium truncate font-baskerville">{chat.title || "Gesprek"}</h3>
                              </Link>
                              <button
                                className="p-1 hover:bg-gray-100 rounded-full ml-2"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setEditingId(chat.id);
                                  setEditingTitle(chat.title || "");
                                }}
                              >
                                <Edit2 className="w-4 h-4 text-gray-500" />
                              </button>
                            </>
                          )}
                        </div>
                        <div className="prose prose-sm text-gray-500 line-clamp-2 mt-1 mb-2 break-words font-baskerville">
                          {lastMessage?.content ? (
                            <div dangerouslySetInnerHTML={{ 
                              __html: formatMessagePreview(lastMessage.content)
                            }} />
                          ) : (
                            "Geen berichten"
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-gray-500">
                            {format(chatDate, "d MMM yyyy")}
                          </div>
                          <button
                            onClick={async (e) => {
                              e.preventDefault();
                              if (confirm("Are you sure you want to delete this conversation? This action cannot be undone.")) {
                                try {
                                  await fetch(`/api/chats/${chat.id}`, {
                                    method: 'DELETE'
                                  });

                                  const newChats = chats.filter(c => c.id !== chat.id);
                                  queryClient.setQueryData(['chats'], newChats);

                                  toast({
                                    title: "Success",
                                    description: "Conversation deleted successfully"
                                  });
                                } catch (error) {
                                  toast({
                                    variant: "destructive",
                                    title: "Error",
                                    description: "Failed to delete conversation"
                                  });
                                }
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
                </motion.div>
              );
              return acc;
            }, [] as JSX.Element[])
          )}
        </div>
      </div>
    </div>
  );
}
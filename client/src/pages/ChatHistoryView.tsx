import { Link } from "wouter";
import { useChatHistory } from "@/hooks/use-chat-history";
import { ArrowLeft, MessageSquare, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import type { Chat } from "@db/schema";

export default function ChatHistoryView() {
  const { chats, isLoading } = useChatHistory();

  return (
    <div className="flex-1 flex flex-col bg-[#F2F0E5]">
      {/* Header */}
      <div className="w-full px-4 py-3 flex items-center justify-between border-b border-gray-200 bg-white">
        <Link href="/chat">
          <button className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
        </Link>
        <h1 className="text-lg font-semibold">Gesprekken</h1>
        <div className="w-10" /> {/* Spacer for alignment */}
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="text-center py-4 text-gray-500">Laden...</div>
        ) : !chats || chats.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            Nog geen gesprekken gevonden
          </div>
        ) : (
          chats.map((chat: Chat) => {
            const messages = chat.messages as { role: string; content: string }[];
            const lastMessage = messages[messages.length - 1];

            return (
              <Link key={chat.id} href={`/chat/${chat.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-[#FFC74A] flex items-center justify-center flex-shrink-0">
                        <MessageSquare className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">
                          {chat.title || "Gesprek"}
                        </h3>
                        <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                          {lastMessage?.content || "Geen berichten"}
                        </p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                          <Clock className="w-4 h-4" />
                          {format(new Date(chat.updatedAt || chat.createdAt), "d MMM yyyy, HH:mm")}
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
import { useState, useRef, useEffect } from "react";
import { useChat } from "@/hooks/use-chat";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Plus, Mic, ArrowUpCircle, Expand, Circle } from "lucide-react";
import { format } from "date-fns";
import { MessageFeedback } from "@/components/MessageFeedback";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const theme = {
  primary: 'bg-[#F2F0E5]',
  secondary: 'bg-white',
  accent: 'bg-[#629785]',
  text: {
    primary: 'text-black',
    secondary: 'text-gray-800',
    muted: 'text-gray-500'
  }
};

// Format message content with markdown-style syntax
const formatMessageContent = (content: string) => {
  return content
    .split('\n\n')
    .map(paragraph => {
      // Handle italics
      paragraph = paragraph.replace(/\*(.*?)\*/g, '<em>$1</em>');
      // Handle bold
      paragraph = paragraph.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      return paragraph;
    })
    .map((paragraph, i) => (
      <p
        key={i}
        className={`${i > 0 ? 'mt-4' : ''}`}
        dangerouslySetInnerHTML={{ __html: paragraph }}
      />
    ));
};

const TypingIndicator = () => (
  <div className="flex space-x-2 p-3 bg-gray-100 rounded-2xl w-16">
    <Circle className="w-2 h-2 animate-bounce" />
    <Circle className="w-2 h-2 animate-bounce delay-100" />
    <Circle className="w-2 h-2 animate-bounce delay-200" />
  </div>
);

const Avatar = ({ sender }: { sender: 'user' | 'assistant' }) => (
  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
    sender === 'assistant' ? 'bg-[#FFC74A]' : 'bg-yellow-100'
  }`}>
    <span className="text-white text-sm">
      {sender === 'assistant' ? 'N' : 'U'}
    </span>
  </div>
);

export default function ChatView() {
  const { messages, sendMessage, isLoading, chatId } = useChat();
  const [inputText, setInputText] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const initializeChat = async () => {
    if (!chatId && !isInitializing) {
      setIsInitializing(true);
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
        navigate(`/chat/${newChat.id}`, { replace: true });
      } catch (error) {
        console.error('Error creating new chat:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not create a new chat. Please try again.",
        });
      } finally {
        setIsInitializing(false);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    if (e.target.value.trim() && !chatId) {
      initializeChat();
    }
  };

  const handleSend = async () => {
    if (inputText.trim()) {
      if (!chatId) {
        await initializeChat();
        if (!chatId) return; // Don't proceed if chat initialization failed
      }
      const text = inputText.trim();
      setInputText('');
      setIsExpanded(false);
      await sendMessage(text);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

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

      navigate(`/chat/${newChat.id}`, { replace: true });
      setShowNewChatDialog(false);
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
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="w-full px-4 py-3 flex items-center justify-between border-b border-gray-200 bg-white fixed top-0 left-0 z-50">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => window.history.back()} 
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <Link href="/chat">
            <button className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg text-gray-600 hover:bg-gray-200">
              <Circle className="w-4 h-4" />
              <span>Geschiedenis</span>
            </button>
          </Link>
        </div>
        <button
          onClick={() => setShowNewChatDialog(true)}
          className={`p-2 ${theme.accent} hover:bg-[#4A7566] rounded-full`}
        >
          <Plus className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 pt-16 space-y-4 bg-orange-50">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex items-start space-x-2 ${
              message.role === 'user' ? 'flex-row-reverse space-x-reverse' : 'flex-row'
            }`}
          >
            <Avatar sender={message.role} />
            <div className="flex flex-col">
              <div
                className={`px-4 py-3 rounded-2xl max-w-[280px] chat-message ${
                  message.role === 'user'
                    ? `${theme.primary} ${theme.text.primary}`
                    : `${theme.secondary} ${theme.text.secondary}`
                }`}
              >
                {message.role === 'assistant' ? (
                  <div className="prose prose-sm prose-p:mt-4 prose-p:first:mt-0">
                    {formatMessageContent(message.content)}
                  </div>
                ) : (
                  <p>{message.content}</p>
                )}
                {message.role === 'assistant' && (
                  <MessageFeedback
                    messageId={`${chatId}-${index}`}
                    onFeedback={(feedback) => {
                      console.log(`Feedback for message ${index}: ${feedback}`);
                    }}
                  />
                )}
              </div>
              <span className={`text-xs ${theme.text.muted} mt-1 ${
                message.role === 'user' ? 'text-right' : 'text-left'
              }`}>
                {format(new Date(), 'HH:mm')}
              </span>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-start space-x-2">
            <Avatar sender="assistant" />
            <TypingIndicator />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="w-full border-t border-gray-200 bg-white">
        <div className="max-w-screen-lg mx-auto px-4 py-3">
          <div className="flex items-start space-x-2">
            <button className="p-2 hover:bg-gray-100 rounded-full flex-shrink-0">
              <Mic className="w-6 h-6 text-[#629785]" />
            </button>
            <textarea
              value={inputText}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="Typ een boodschap..."
              className={`flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-[#629785] focus:border-transparent resize-none transition-all duration-200 ease-in-out chat-message ${
                isExpanded ? 'h-24' : 'h-10'
              }`}
              style={{
                lineHeight: '1.5rem',
                overflowY: isExpanded ? 'auto' : 'hidden',
              }}
            />
            <div className="flex-shrink-0 flex items-center space-x-2">
              <button
                onClick={handleSend}
                disabled={isLoading || !inputText.trim()}
                className="p-2 hover:bg-gray-100 rounded-full disabled:opacity-50"
              >
                <ArrowUpCircle className="w-6 h-6 text-[#629785]" />
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={`p-2 hover:bg-gray-100 rounded-full ${isExpanded ? 'bg-gray-100' : ''}`}
              >
                <Expand className={`w-6 h-6 text-[#629785] transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* New Chat Dialog */}
      <AlertDialog open={showNewChatDialog} onOpenChange={setShowNewChatDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start a New Conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              Your current conversation will be saved and you can access it later from the history tab.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNewChatDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={startNewChat}>
              Start New Chat
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
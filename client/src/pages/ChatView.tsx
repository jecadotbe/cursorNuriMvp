import { useState, useRef, useEffect } from "react";
import { useChat } from "@/hooks/use-chat";
import { TextareaAutosize } from "@/components/ui/textarea-autosize";
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
import { useUser } from "@/hooks/use-user";
import { useVoiceInput } from "@/hooks/use-voice-input";
import { MicrophoneVisualizer } from "@/components/MicrophoneVisualizer";
import { CustomerResults } from "@/components/CustomerResults"; // Added import

import { renderMarkdown } from "@/lib/markdown";

const theme = {
  primary: 'bg-[#DEDBCA]',
  secondary: 'bg-white',
  accent: 'bg-[#629785]',
  text: {
    primary: 'text-black',
    secondary: 'text-gray-800',
    muted: 'text-gray-500'
  }
};


const formatMessageContent = (content: string) => {
  const processedContent = replaceTemplateVariables(content);
  return (
    <div
      className="prose prose-sm max-w-none dark:prose-invert"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(processedContent) }}
    />
  );
};

export default function ChatView() {
  const { messages, sendMessage, isLoading, chatId } = useChat();
  const [inputText, setInputText] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isRecording, startRecording, stopRecording, error: voiceError } = useVoiceInput(
    (transcript) => {
      setInputText(transcript);
      if (voiceError) {
        toast({
          variant: "destructive",
          title: "Voice Input Error",
          description: voiceError
        });
      }
    }
  );

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
    const newText = e.target.value;
    setInputText(newText);
    if (newText.trim() && !chatId) {
      initializeChat();
    }
  };

  const handleSend = async () => {
    if (inputText.trim()) {
      if (!chatId) {
        await initializeChat();
        if (!chatId) return;
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

  // Placeholder for suggestionChips -  replace with your actual data source
  const suggestionChips = ["Suggestion 1", "Suggestion 2", "Suggestion 3", "Suggestion 4"];


  return (
    <div className="flex flex-col h-screen animate-gradient" style={{
      backgroundSize: "400% 400%",
      background: `linear-gradient(135deg, #F8DD9F 0%, #F2F0E5 50%, #F2F0E5 100%)`
    }}>
      <div className="w-full px-4 py-3 flex items-center justify-between border-b border-gray-200 bg-white fixed top-0 left-0 z-50 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => window.history.back()}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>

        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewChatDialog(true)}
            className={`p-2 ${theme.accent} hover:bg-[#4A7566] rounded-full`}
          >
            <Plus className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pt-24 pb-16 space-y-4 z-0">
        {messages.map((message, index) => (
          <div key={index}>
            <div
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
                    <>
                      {formatMessageContent(message.content)}
                      {index === messages.findLastIndex(m => m.role === 'assistant') && (
                        <p className="text-xs text-gray-400 mt-2 italic">Nuri kan fouten maken. Controleer de antwoorden.</p>
                      )}
                    </>
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
              </div>
            </div>
            {message.role === 'assistant' && message.content.includes('Helan kinderopvang') && (
              <div className="ml-10 mt-4">
                <CustomerResults trigger="Helan kinderopvang" />
              </div>
            )}
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

      <div className="w-full border-t border-gray-200 bg-[#F2F0E5] fixed bottom-0 left-0 z-50">
        <div className="max-w-screen-lg mx-auto px-4 py-6">
          <div className="flex flex-col space-y-">
            <div className="flex flex-col space-y-2 w-full">
              <TextareaAutosize
                value={inputText}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder="Typ een boodschap..."
                maxHeight={200}
                className="resize-none transition-all duration-200 ease-in-out chat-message text-left"
                style={{
                  lineHeight: '1.5rem',
                  minHeight: '40px',
                }}
              />
              <div className="flex items-center justify-between space-x-2">
                <MicrophoneVisualizer
                  isRecording={isRecording}
                  onToggle={() => isRecording ? stopRecording() : startRecording()}
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
        </div>
      </div>

      <AlertDialog open={showNewChatDialog} onOpenChange={setShowNewChatDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nieuw gesprek starten?</AlertDialogTitle>
            <AlertDialogDescription>
              Je kan start een nieuw gesprek, je huidige gesprek kan je raadplegen via de chat historiek.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNewChatDialog(false)}
            >
              Annuleren
            </Button>
            <Button onClick={startNewChat}>
              Start nieuwe chat
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Hide navigation on this page */}
      <style>{`
        nav {
          display: none !important;
        }
      `}</style>
    </div>
  );
}

const replaceTemplateVariables = (content: string) => {
  const now = new Date();
  const formattedDateTime = format(now, "d MMMM yyyy 'om' HH:mm");
  return content.replace(/{{currentDateTime}}/g, formattedDateTime);
};


const TypingIndicator = () => (
  <div className="flex space-x-2 p-3 bg-gray-100 rounded-2xl w-16">
    <Circle className="w-2 h-2 animate-bounce" />
    <Circle className="w-2 h-2 animate-bounce delay-100" />
    <Circle className="w-2 h-2 animate-bounce delay-200" />
  </div>
);

const Avatar = ({ sender }: { sender: 'user' | 'assistant' }) => {
  const { user } = useUser();
  return (
    <div className={`w-8 ${sender === 'assistant' ? 'aspect-[9/16]' : 'h-8 rounded-full'} flex items-center justify-center overflow-hidden ${
      sender === 'assistant' ? '' : 'bg-[#294636]'
    }`}>
      {sender === 'assistant' ? (
        <img src="/images/nuri_chat.png" alt="Nuri" className="w-full h-full object-contain" />
      ) : (
        <span className="text-white text-sm">
          {user?.username[0].toUpperCase()}
        </span>
      )}
    </div>
  );
};
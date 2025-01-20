import { useState, useRef, useEffect, useCallback } from "react";
import { useChat } from "@/hooks/use-chat";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Plus, Mic, ArrowUpCircle, Expand, Circle } from "lucide-react";
import { format } from "date-fns";
import { MessageFeedback } from "@/components/MessageFeedback";
import { SuggestionChips } from "@/components/SuggestionChips";
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

const DEFAULT_SUGGESTIONS = [
  "Ik weet het niet goed",
  "Kan je mij verder helpen?",
  "Waar moet ik beginnen?",
  "Leg eens uit hoe andere ouders dit doen"
];

export default function ChatView() {
  const { messages, sendMessage, isLoading, chatId } = useChat();
  const [inputText, setInputText] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [currentSuggestions, setCurrentSuggestions] = useState<string[]>(DEFAULT_SUGGESTIONS);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
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

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  const initializeChat = useCallback(async () => {
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
  }, [chatId, isInitializing, navigate, toast]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setInputText(newText);
    checkForUncertainty(newText);
    if (newText.trim() && !chatId) {
      initializeChat();
    }
  }, [chatId, initializeChat, checkForUncertainty]);

  const handleSend = useCallback(async () => {
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
  }, [inputText, chatId, initializeChat, sendMessage]);

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

  const checkForUncertainty = useCallback((text: string) => {
    const uncertaintyPatterns = [
      'weet niet',
      'help mij',
      'waar te beginnen',
      'even nadenken',
      '?',
      'geen idee',
      'lastig',
      'moeilijk',
      'hoe moet'
    ];

    const hasUncertainty = uncertaintyPatterns.some(pattern =>
      text.toLowerCase().includes(pattern.toLowerCase())
    );

    if (hasUncertainty) {
      setCurrentSuggestions([
        "Help mij even op weg?",
        "Ik weet niet waar te beginnen",
        "Kan je een voorbeeld geven?",
        "Wat zou jij aanraden?",
        "Leg eens uit hoe andere ouders dit aanpakken"
      ]);
    } else if (!text.trim()) {
      setCurrentSuggestions(DEFAULT_SUGGESTIONS);
    } else {
      setCurrentSuggestions([]);
    }
  }, []);

  const generateContextualSuggestions = useCallback(async () => {
    if (!chatId || messages.length === 0) return;

    setIsLoadingSuggestions(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(`/api/suggestions/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          lastMessageContent: messages[messages.length - 1].content,
        }),
        credentials: 'include',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) throw new Error('Failed to generate suggestions');

      const data = await response.json();
      if (Array.isArray(data.suggestions)) {
        setCurrentSuggestions(data.suggestions);
      } else {
        setCurrentSuggestions(DEFAULT_SUGGESTIONS);
      }
    } catch (error) {
      console.error('Error generating suggestions:', error);
      setCurrentSuggestions(DEFAULT_SUGGESTIONS);

      if (error instanceof Error) {
        const message = error.name === 'AbortError'
          ? "Suggestion generation timed out. Using default suggestions."
          : "Could not generate suggestions. Using default suggestions instead.";

        toast({
          variant: "destructive",
          title: "Error",
          description: message,
        });
      }
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [chatId, messages, toast]);

  const handleSuggestionSelect = useCallback(async (suggestion: string) => {
    if (!chatId) {
      await initializeChat();
      if (!chatId) return;
    }
    setInputText('');
    setCurrentSuggestions([]);
    await sendMessage(suggestion);
  }, [chatId, initializeChat, sendMessage]);

  // Prevent clicks from propagating through the dialog
  const handleDialogClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <div className="flex flex-col h-screen animate-gradient" style={{
      backgroundSize: "400% 400%",
      background: `linear-gradient(135deg, #F8DD9F 0%, #F2F0E5 50%, #F2F0E5 100%)`
    }}>
      <div className="w-full px-4 py-3 flex items-center justify-between border-b border-gray-200 bg-white fixed top-0 left-0 z-50 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              window.history.back();
            }}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <Link href="/chat">
            <button
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg text-gray-600 hover:bg-gray-200"
            >
              <Circle className="w-4 h-4" />
              <span>Geschiedenis</span>
            </button>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowNewChatDialog(true);
            }}
            className={`p-2 ${theme.accent} hover:bg-[#4A7566] rounded-full`}
          >
            <Plus className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pt-24 pb-16 space-y-4 z-0">
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
                className={`px-4 py-3 rounded-2xl  max-w-[280px] chat-message ${
                  message.role === 'user'
                    ? `${theme.primary} ${theme.text.primary}`
                    : `${theme.secondary} ${theme.text.secondary}`
                }`}
              >
                {message.role === 'assistant' ? (
                  <>
                    <div>
                      {formatMessageContent(message.content)}
                    </div>
                    {message.role === 'assistant' &&
                      index === messages.findLastIndex(m => m.role === 'assistant') && (
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
        <div className="max-w-screen-lg mx-auto px-4 py-2">
          <div className="flex flex-col space-y-2">
            <div className="flex items-start space-x-2">
              <MicrophoneVisualizer
                isRecording={isRecording}
                onToggle={() => isRecording ? stopRecording() : startRecording()}
              />
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

            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500">
                {currentSuggestions.length} suggesties beschikbaar
              </div>
              {!showSuggestions ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    generateContextualSuggestions();
                    setShowSuggestions(true);
                  }}
                  disabled={isLoadingSuggestions || !chatId}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingSuggestions ? 'animate-spin' : ''}`} />
                  <span>Toon suggesties</span>
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSuggestions(!showSuggestions);
                  }}
                  className="flex items-center gap-2"
                >
                  <Star className="w-4 h-4" />
                  <span>Bekijk suggesties</span>
                </Button>
              )}
            </div>

            <SuggestionChips
              suggestions={currentSuggestions}
              onSelect={handleSuggestionSelect}
              isExpanded={showSuggestions}
              onToggle={() => setShowSuggestions(!showSuggestions)}
            />
          </div>
        </div>
      </div>

      <AlertDialog open={showNewChatDialog} onOpenChange={setShowNewChatDialog}>
        <AlertDialogContent onClick={handleDialogClick}>
          <AlertDialogHeader>
            <AlertDialogTitle>Start a New Conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              Your current conversation will be saved and you can access it later from the history tab.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                setShowNewChatDialog(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                startNewChat();
              }}
            >
              Start New Chat
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <style>{`
        nav {
          display: none !important;
        }
      `}</style>
    </div>
  );
}

const formatMessageContent = (content: string) => {
  return content
    .split('\n\n')
    .map(paragraph => {
      paragraph = paragraph.replace(/\*(.*?)\*/g, '<em>$1</em>');
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
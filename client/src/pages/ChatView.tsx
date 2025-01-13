import { useState, useRef, useEffect } from "react";
import { useChat } from "@/hooks/use-chat";
import { Link } from "wouter";
import { ArrowLeft, Plus, Mic, ArrowUpCircle, Expand, Circle } from "lucide-react";
import { format } from "date-fns";

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
  const { messages, sendMessage, isLoading } = useChat();
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (inputText.trim()) {
      const text = inputText.trim();
      setInputText('');
      await sendMessage(text);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Header */}
      <div className="w-full px-4 py-3 flex items-center justify-between border-b border-gray-200 bg-white">
        <Link href="/">
          <button className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
        </Link>
        <Link href="/chat">
          <button className={`p-2 ${theme.accent} hover:bg-[#4A7566] rounded-full`}>
            <Plus className="w-6 h-6 text-white" />
          </button>
        </Link>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-orange-50">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex items-end space-x-2 ${
              message.role === 'user' ? 'flex-row-reverse space-x-reverse' : 'flex-row'
            }`}
          >
            <Avatar sender={message.role} />
            <div className="flex flex-col">
              <div
                className={`px-4 py-2 rounded-2xl max-w-[280px] ${
                  message.role === 'user'
                    ? `${theme.primary} ${theme.text.primary}`
                    : `${theme.secondary} ${theme.text.secondary}`
                }`}
              >
                {message.content}
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
          <div className="flex items-end space-x-2">
            <Avatar sender="assistant" />
            <TypingIndicator />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="w-full px-4 py-3 border-t border-gray-200 bg-white">
        <div className="flex items-center space-x-2">
          <button className="p-2 hover:bg-gray-100 rounded-full">
            <Mic className="w-6 h-6 text-[#629785]" />
          </button>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Typ een boodschap..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-[#629785] focus:border-transparent"
          />
          <button 
            onClick={handleSend}
            disabled={isLoading || !inputText.trim()}
            className="p-2 hover:bg-gray-100 rounded-full disabled:opacity-50"
          >
            <ArrowUpCircle className="w-6 h-6 text-[#629785]" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-full">
            <Expand className="w-6 h-6 text-[#629785]" />
          </button>
        </div>
      </div>
    </div>
  );
}
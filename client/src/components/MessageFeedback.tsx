import { useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';

interface MessageFeedbackProps {
  messageId: string | number;
  onFeedback: (feedback: 'positive' | 'negative') => void;
}

export function MessageFeedback({ messageId, onFeedback }: MessageFeedbackProps) {
  const [feedback, setFeedback] = useState<'positive' | 'negative' | null>(null);

  const handleFeedback = (type: 'positive' | 'negative') => {
    if (feedback !== type) {
      setFeedback(type);
      onFeedback(type);
    }
  };

  return (
    <div className="flex gap-2 mt-1">
      <button
        onClick={() => handleFeedback('positive')}
        className={`p-1 rounded-full transition-colors ${
          feedback === 'positive'
            ? 'bg-green-100 text-green-600'
            : 'hover:bg-gray-100 text-gray-400'
        }`}
        aria-label="Thumbs up"
      >
        <ThumbsUp className="w-4 h-4" />
      </button>
      <button
        onClick={() => handleFeedback('negative')}
        className={`p-1 rounded-full transition-colors ${
          feedback === 'negative'
            ? 'bg-red-100 text-red-600'
            : 'hover:bg-gray-100 text-gray-400'
        }`}
        aria-label="Thumbs down"
      >
        <ThumbsDown className="w-4 h-4" />
      </button>
    </div>
  );
}

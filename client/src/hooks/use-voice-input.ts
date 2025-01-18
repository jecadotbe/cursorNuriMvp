import { useState, useCallback } from 'react';

interface VoiceInputHook {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  error: string | null;
}

export function useVoiceInput(onTranscription: (text: string) => void): VoiceInputHook {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);

  const startRecording = useCallback(async () => {
    try {
      if (!('webkitSpeechRecognition' in window)) {
        throw new Error('Speech recognition is not supported in this browser');
      }

      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      const newRecognition = new SpeechRecognition();
      
      newRecognition.continuous = false;
      newRecognition.interimResults = false;
      newRecognition.lang = 'nl-NL'; // Set to Dutch

      newRecognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        onTranscription(transcript);
      };

      newRecognition.onerror = (event) => {
        setError(event.error);
        setIsRecording(false);
      };

      newRecognition.onend = () => {
        setIsRecording(false);
      };

      setRecognition(newRecognition);
      newRecognition.start();
      setIsRecording(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start recording');
      setIsRecording(false);
    }
  }, [onTranscription]);

  const stopRecording = useCallback(() => {
    if (recognition) {
      recognition.stop();
      setIsRecording(false);
    }
  }, [recognition]);

  return {
    isRecording,
    startRecording,
    stopRecording,
    error
  };
}

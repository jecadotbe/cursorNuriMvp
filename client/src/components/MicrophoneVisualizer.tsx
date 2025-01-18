import { useEffect, useRef } from 'react';
import { Circle } from 'lucide-react';

interface MicrophoneVisualizerProps {
  isRecording: boolean;
  onToggle: () => void;
}

export function MicrophoneVisualizer({ isRecording, onToggle }: MicrophoneVisualizerProps) {
  const waveCircles = Array.from({ length: 3 }, (_, i) => i);
  
  return (
    <button 
      onClick={onToggle}
      className={`relative p-2 hover:bg-gray-100 rounded-full flex-shrink-0 transition-colors duration-200 ${
        isRecording ? 'bg-red-100' : ''
      }`}
    >
      {isRecording && (
        <div className="absolute inset-0 flex items-center justify-center">
          {waveCircles.map((i) => (
            <Circle
              key={i}
              className={`absolute w-full h-full text-red-500/20 animate-ping`}
              style={{
                animationDelay: `${i * 200}ms`,
                animationDuration: '2s',
              }}
            />
          ))}
        </div>
      )}
      <Circle 
        className={`w-6 h-6 relative z-10 ${
          isRecording ? 'text-red-500' : 'text-[#629785]'
        } transition-colors duration-200`}
      />
    </button>
  );
}

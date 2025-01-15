
import { useState, useRef } from 'react';
import { ArrowLeft } from "lucide-react";
import { Link, useLocation } from "wouter";

interface VideoPlayerProps {
  videoUrl: string;
  title: string;
}

const VideoPlayer = ({ videoUrl, title }: VideoPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleProgress = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current) {
      const time = parseFloat(e.target.value);
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      videoRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div className="relative">
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-auto rounded-lg"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
      />
      <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-4 rounded-b-lg">
        <h2 className="text-white mb-2">{title}</h2>
        <div className="flex items-center gap-4">
          <button
            onClick={togglePlay}
            className="text-white"
          >
            {isPlaying ? '⏸' : '▶️'}
          </button>
          <div className="flex-1 flex items-center gap-2">
            <span className="text-white text-sm">{formatTime(currentTime)}</span>
            <input
              type="range"
              min="0"
              max={duration}
              value={currentTime}
              onChange={handleProgress}
              className="flex-1"
            />
            <span className="text-white text-sm">{formatTime(duration)}</span>
          </div>
          <button
            onClick={toggleFullscreen}
            className="text-white"
          >
            {isFullscreen ? '⊙' : '⛶'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function LearnDetailView() {
  return (
    <div className="flex-1 bg-[#F2F0E5] overflow-y-auto">
      <div className="px-4 py-2 flex items-center">
        <Link href="/learn">
          <div className="flex items-center space-x-2 cursor-pointer">
            <ArrowLeft className="w-6 h-6" />
            <span>Terug</span>
          </div>
        </Link>
      </div>

      <div className="p-4 space-y-6">
        <VideoPlayer
          videoUrl="/videos/aware-parenting-intro.mp4"
          title="Wat is Aware Parenting?"
        />
      </div>
    </div>
  );
}

import { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, Volume2, VolumeX, Play, Pause } from "lucide-react";
import ReactPlayer from 'react-player';
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { useLocation } from "wouter";

interface VideoData {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
}

const videos: VideoData[] = [
  {
    id: "1",
    title: "Lynn Geerinck",
    description:
      "Mama baas podcast. Ah kak. :).",
    videoUrl: "https://youtu.be/IF09TweYKkc?si=kQZE7N6r7LwTKxJ5",
  },
];

export default function LearnDetailView() {
  const [currentIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const playerRef = useRef<ReactPlayer>(null);
  const [controlTimeout, setControlTimeout] = useState<NodeJS.Timeout | null>(null);
  const [, setLocation] = useLocation();

  // Navigate back using wouter's hook.
  const handleBackClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLocation("/learn");
  }, [setLocation]);

  const handlePlayPause = useCallback(() => {
    setPlaying(prev => !prev);
    setShowControls(true);
  }, []);

  const handleProgress = useCallback((state: { played: number }) => {
    setProgress(state.played);
  }, []);

  const handleSeek = useCallback((value: number) => {
    setProgress(value);
    if (playerRef.current) {
      playerRef.current.seekTo(value);
    }
  }, []);

  const handleVolumeChange = useCallback((value: number[]) => {
    setVolume(value[0]);
  }, []);

  const toggleMute = useCallback(() => {
    setVolume(prev => (prev === 0 ? 1 : 0));
  }, []);

  const formatTime = useCallback((seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  // Auto-hide controls after 3 seconds of inactivity when playing.
  useEffect(() => {
    if (playing) {
      if (controlTimeout) clearTimeout(controlTimeout);
      const timeout = setTimeout(() => {
        setShowControls(false);
      }, 3000);
      setControlTimeout(timeout);
      return () => clearTimeout(timeout);
    } else {
      setShowControls(true);
      if (controlTimeout) clearTimeout(controlTimeout);
    }
  }, [playing, controlTimeout]);

  // Whenever the user interacts (taps/clicks), show the controls.
  const handleUserInteraction = useCallback(() => {
    setShowControls(true);
    if (controlTimeout) clearTimeout(controlTimeout);
    if (playing) {
      const timeout = setTimeout(() => {
        setShowControls(false);
      }, 3000);
      setControlTimeout(timeout);
    }
  }, [playing, controlTimeout]);

  return (
    <div className="fixed inset-0 bg-black" onClick={handleUserInteraction}>
      <div className="relative h-full w-full">
        {/* Video Player */}
        <ReactPlayer
          ref={playerRef}
          url={videos[currentIndex].videoUrl}
          width="100%"
          height="100%"
          playing={playing}
          volume={volume}
          onProgress={handleProgress}
          onDuration={setDuration}
          progressInterval={100}
          style={{ position: 'absolute', top: 0, left: 0 }}
        />

        {/* Overlay Controls */}
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: showControls ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 z-50"
        >
          {/* Background gradient overlay (non-interactive) */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/60 pointer-events-none" />

          {/* Top Bar */}
          <div className="fixed top-0 left-0 right-0 p-4 flex items-center z-[100] pointer-events-auto">
            <Button
              variant="ghost"
              size="lg"
              className="text-white hover:bg-black/30 rounded-xl p-3 flex items-center gap-2"
              onClick={handleBackClick}
            >
              <ArrowLeft className="h-6 w-6" />
              <span className="text-sm">Back to Learning</span>
            </Button>
            <div className="ml-4">
              <h1 className="text-white text-xl font-semibold">
                {videos[currentIndex].title}
              </h1>
              <p className="text-white/80 text-sm">
                {videos[currentIndex].description}
              </p>
            </div>
          </div>

          {/* Center Play/Pause Button */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:text-white/80 w-16 h-16 rounded-full bg-black/30"
              onClick={handlePlayPause}
            >
              {playing ? (
                <Pause className="h-8 w-8" />
              ) : (
                <Play className="h-8 w-8" />
              )}
            </Button>
          </div>

          {/* Bottom Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-4 space-y-4 pointer-events-auto">
            {/* Timeline */}
            <div className="flex items-center gap-2">
              <span className="text-white text-sm">
                {formatTime(duration * progress)}
              </span>
              <Slider
                value={[progress]}
                max={1}
                step={0.001}
                className="flex-1"
                onValueChange={(value) => handleSeek(value[0])}
              />
              <span className="text-white text-sm">
                {formatTime(duration)}
              </span>
            </div>
            {/* Volume Controls */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                className="text-white"
                onClick={toggleMute}
              >
                {volume === 0 ? (
                  <VolumeX className="h-6 w-6" />
                ) : (
                  <Volume2 className="h-6 w-6" />
                )}
              </Button>
              <Slider
                value={[volume]}
                max={1}
                step={0.1}
                className="w-32"
                onValueChange={handleVolumeChange}
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Progress Indicators */}
      <div className="fixed top-4 right-4 z-50 flex justify-center gap-1 pointer-events-none">
        {videos.map((_, index) => (
          <div
            key={index}
            className={`h-1 w-6 rounded-full ${index === currentIndex ? 'bg-white' : 'bg-white/30'}`}
          />
        ))}
      </div>
    </div>
  );
}
import { useState, useRef } from 'react';
import { ArrowLeft, Volume2, VolumeX, Play, Pause } from "lucide-react";
import { Link } from "wouter";
import ReactPlayer from 'react-player';
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Slider } from "@/components/ui/slider";

interface VideoData {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
}

const videos: VideoData[] = [
  {
    id: "1",
    title: "Aware Parenting Introduction",
    description: "Learn about the core principles of Aware Parenting and how it can transform your relationship with your children.",
    videoUrl: "/videos/demovideo.mp4"
  },
  {
    id: "2",
    title: "Understanding Child Development",
    description: "Discover the key stages of child development and how to support your child's growth.",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  },
  {
    id: "3",
    title: "Test Video",
    description: "Test video integration with YouTube",
    videoUrl: "https://www.youtube.com/watch?v=gwVARm-J1Rg"
  }
];

export default function LearnDetailView() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const playerRef = useRef<ReactPlayer>(null);
  const [showControls, setShowControls] = useState(true);

  const handlePlayPause = () => {
    setPlaying(!playing);
  };

  const handleProgress = (state: { played: number }) => {
    setProgress(state.played);
  };

  const handleSeek = (value: number) => {
    setProgress(value);
    if (playerRef.current) {
      playerRef.current.seekTo(value);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
  };

  const toggleMute = () => {
    setVolume(volume === 0 ? 1 : 0);
  };

  return (
    <div className="fixed inset-0 bg-black">
      <div className="relative h-full w-full" onClick={() => setShowControls(true)}>
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
          style={{ position: 'absolute', top: 0, left: 0 }}
          progressInterval={100}
        />

        {/* Overlay Controls */}
        <motion.div
          initial={false}
          animate={{ opacity: showControls ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/50 z-50"
        >
          {/* Top Bar */}
          <div className="absolute top-0 left-0 right-0 p-4 flex items-center">
            <Link href="/learn">
              <Button 
                variant="ghost" 
                size="lg"
                className="text-white hover:bg-black/30 rounded-xl p-6 flex items-center gap-2"
              >
                <ArrowLeft className="h-8 w-8" />
                <span>Back to Learning</span>
              </Button>
            </Link>
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
          <div className="absolute inset-0 flex items-center justify-center">
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
          <div className="absolute bottom-0 left-0 right-0 p-4 space-y-4">
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

      {/* Progress indicators */}
      <div className="fixed top-4 right-4 z-50 flex justify-center gap-1">
        {videos.map((_, index) => (
          <div
            key={index}
            className={`h-1 w-6 rounded-full ${
              index === currentIndex ? 'bg-white' : 'bg-white/30'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
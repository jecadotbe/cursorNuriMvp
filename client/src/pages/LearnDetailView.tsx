import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Volume2, VolumeX, Play, Pause, ChevronDown, ChevronUp } from "lucide-react";
import { Link, useLocation, useParams } from "wouter";
import YouTube from 'react-youtube';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import * as Collapsible from '@radix-ui/react-collapsible';
import * as AspectRatio from '@radix-ui/react-aspect-ratio';

interface VideoData {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  isYoutube: boolean;
}

// Mock data - replace with real data from your backend
const videos: VideoData[] = [
  {
    id: "1",
    title: "Aware Parenting Introduction",
    description: "Learn about the core principles of Aware Parenting and how it can transform your relationship with your children.",
    videoUrl: "/videos/demovideo.mp4",
    isYoutube: false
  },
  {
    id: "2",
    title: "Understanding Child Development",
    description: "Discover the key stages of child development and how to support your child's growth.",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    isYoutube: true
  }
];

interface VideoPlayerProps {
  videoUrl: string;
  title: string;
  isYoutube?: boolean;
  onEnded?: () => void;
}

const VideoPlayer = ({ videoUrl, title, isYoutube = false, onEnded }: VideoPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const youtubeRef = useRef<YouTube>(null);

  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

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
    if (isYoutube && youtubeRef.current?.internalPlayer) {
      if (isPlaying) {
        youtubeRef.current.internalPlayer.pauseVideo();
      } else {
        youtubeRef.current.internalPlayer.playVideo();
      }
    } else if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
    setIsPlaying(!isPlaying);
  };

  const handleProgress = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (isYoutube && youtubeRef.current?.internalPlayer) {
      youtubeRef.current.internalPlayer.seekTo(time, true);
      setCurrentTime(time);
    } else if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    setIsMuted(newVolume === 0);

    if (isYoutube && youtubeRef.current?.internalPlayer) {
      youtubeRef.current.internalPlayer.setVolume(newVolume * 100);
    } else if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);

    if (isYoutube && youtubeRef.current?.internalPlayer) {
      youtubeRef.current.internalPlayer.setVolume(newMuted ? 0 : volume * 100);
    } else if (videoRef.current) {
      videoRef.current.volume = newMuted ? 0 : volume;
    }
  };

  return (
    <div className="relative w-full">
      <AspectRatio.Root ratio={9/16}>
        <div className="w-full h-full flex items-center justify-center bg-black">
          {isYoutube ? (
            <YouTube
              ref={youtubeRef}
              videoId={getYoutubeId(videoUrl)}
              className="w-full h-full"
              opts={{
                width: '100%',
                height: '100%',
                playerVars: {
                  controls: 0,
                  modestbranding: 1,
                },
              }}
              onStateChange={(event) => {
                setIsPlaying(event.data === 1);
                setCurrentTime(event.target.getCurrentTime());
                if (!duration) {
                  setDuration(event.target.getDuration());
                }
                if (event.data === 0) {
                  onEnded?.();
                }
              }}
              onReady={(event) => {
                setDuration(event.target.getDuration());
                const interval = setInterval(() => {
                  setCurrentTime(event.target.getCurrentTime());
                }, 1000);
                return () => clearInterval(interval);
              }}
            />
          ) : (
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-full object-contain"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={onEnded}
            />
          )}
        </div>
      </AspectRatio.Root>

      <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-4">
        <div className="flex items-center gap-4 mb-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:text-white/80"
            onClick={togglePlay}
          >
            {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
          </Button>

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

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:text-white/80"
              onClick={toggleMute}
            >
              {isMuted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
            </Button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-20"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default function LearnDetailView() {
  const { id } = useParams();
  const [location, setLocation] = useLocation();
  const [isInfoVisible, setIsInfoVisible] = useState(true);
  const currentIndex = id ? parseInt(id) - 1 : 0;
  const currentVideo = videos[currentIndex];

  const handleNext = () => {
    if (currentIndex < videos.length - 1) {
      setLocation(`/learn/${currentIndex + 2}`);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setLocation(`/learn/${currentIndex}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed top-0 left-0 w-full px-4 py-2 z-10 bg-gradient-to-b from-black/50 to-transparent flex justify-between items-center">
        <Link href="/learn">
          <Button variant="ghost" className="text-white hover:text-white/80">
            <ArrowLeft className="w-6 h-6 mr-2" />
            Back to Overview
          </Button>
        </Link>
      </div>

      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="w-full max-w-3xl mx-auto">
          <VideoPlayer
            videoUrl={currentVideo.videoUrl}
            title={currentVideo.title}
            isYoutube={currentVideo.isYoutube}
            onEnded={handleNext}
          />

          <Card className="mt-4 mx-4">
            <Collapsible.Root open={isInfoVisible} onOpenChange={setIsInfoVisible}>
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <h1 className="text-2xl font-semibold">{currentVideo.title}</h1>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsInfoVisible(!isInfoVisible)}
                  >
                    {isInfoVisible ? (
                      <ChevronUp className="h-6 w-6" />
                    ) : (
                      <ChevronDown className="h-6 w-6" />
                    )}
                  </Button>
                </div>
                <Collapsible.Content>
                  <p className="mt-2 text-muted-foreground">
                    {currentVideo.description}
                  </p>
                </Collapsible.Content>
              </div>
            </Collapsible.Root>
          </Card>
        </div>

        <div className="fixed bottom-4 left-0 right-0 flex justify-center gap-4 z-10">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="bg-white/80 hover:bg-white"
          >
            <ChevronLeft className="w-6 h-6 mr-2" />
            Previous
          </Button>
          <Button
            variant="outline"
            onClick={handleNext}
            disabled={currentIndex === videos.length - 1}
            className="bg-white/80 hover:bg-white"
          >
            Next
            <ChevronRight className="w-6 h-6 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
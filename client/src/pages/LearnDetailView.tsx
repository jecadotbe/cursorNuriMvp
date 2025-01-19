import { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, Heart, MessageSquare, Share2, Volume2, VolumeX, Play, Pause } from "lucide-react";
import { Link } from "wouter";
import YouTube from 'react-youtube';
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence, PanInfo } from "framer-motion";

interface VideoData {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  isYoutube: boolean;
  likes?: number;
  comments?: number;
}

// Mock data - replace with real data from your backend
const videos: VideoData[] = [
  {
    id: "1",
    title: "Aware Parenting Introduction",
    description: "Learn about the core principles of Aware Parenting and how it can transform your relationship with your children.",
    videoUrl: "/videos/demovideo.mp4",
    isYoutube: false,
    likes: 245,
    comments: 23
  },
  {
    id: "2",
    title: "Understanding Child Development",
    description: "Discover the key stages of child development and how to support your child's growth.",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    isYoutube: true,
    likes: 189,
    comments: 15
  }
];

const VideoPlayer: React.FC<{
  video: VideoData;
  isActive: boolean;
  onVideoEnd: () => void;
}> = ({ video, isActive, onVideoEnd }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false); // Changed to false by default
  const videoRef = useRef<HTMLVideoElement>(null);
  const youtubeRef = useRef<any>(null);
  const [showControls, setShowControls] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [isPlaying, showControls]);

  useEffect(() => {
    const handlePlay = async () => {
      try {
        if (video.isYoutube && youtubeRef.current?.internalPlayer) {
          if (isActive && !isPlaying) {
            await youtubeRef.current.internalPlayer.playVideo();
            setIsPlaying(true);
          } else if (!isActive) {
            await youtubeRef.current.internalPlayer.pauseVideo();
            setIsPlaying(false);
          }
        } else if (videoRef.current) {
          if (isActive && !isPlaying) {
            await videoRef.current.play();
            setIsPlaying(true);
          } else if (!isActive) {
            videoRef.current.pause();
            setIsPlaying(false);
          }
        }
      } catch (error) {
        console.error('Error controlling video:', error);
        setIsPlaying(false);
      }
    };
    handlePlay();
  }, [isActive, video.isYoutube]);

  const togglePlay = async () => {
    setShowControls(true);
    try {
      if (video.isYoutube && youtubeRef.current?.internalPlayer) {
        if (isPlaying) {
          await youtubeRef.current.internalPlayer.pauseVideo();
        } else {
          await youtubeRef.current.internalPlayer.playVideo();
        }
      } else if (videoRef.current) {
        if (isPlaying) {
          await videoRef.current.pause();
        } else {
          await videoRef.current.play();
        }
      }
      setIsPlaying(!isPlaying);
    } catch (error) {
      console.error('Error toggling play state:', error);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (video.isYoutube && youtubeRef.current?.internalPlayer) {
      youtubeRef.current.internalPlayer.setVolume(isMuted ? 100 : 0);
    } else if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
  };

  return (
    <div className="relative w-full h-full" onClick={() => setShowControls(true)}>
      <div className="absolute inset-0 bg-black">
        {video.isYoutube ? (
          <YouTube
            ref={youtubeRef}
            videoId={video.videoUrl.split('v=')[1]}
            className="w-full h-full"
            opts={{
              width: '100%',
              height: '100%',
              playerVars: {
                controls: 0,
                modestbranding: 1,
                playsinline: 1,
                rel: 0,
                showinfo: 0,
                mute: 0,
                enablejsapi: 1
              },
            }}
            onEnd={onVideoEnd}
            onReady={() => {
              if (isActive && youtubeRef.current?.internalPlayer) {
                youtubeRef.current.internalPlayer.playVideo();
              }
            }}
            onStateChange={(event) => {
              setIsPlaying(event.data === 1);
              setShowControls(true);
            }}
            onError={(error) => console.error('YouTube Error:', error)}
          />
        ) : (
          <video
            ref={videoRef}
            src={video.videoUrl}
            className="w-full h-full object-cover"
            playsInline
            loop={false}
            muted={isMuted}
            onEnded={onVideoEnd}
          />
        )}
      </div>

      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/50"
          >
            {/* Top navigation */}
            <div className="absolute top-0 left-0 right-0 p-4">
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white"
                onClick={() => window.history.back()}
              >
                <ArrowLeft className="h-6 w-6" />
              </Button>
            </div>

            {/* Center play/pause button */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:text-white/80 w-16 h-16 rounded-full bg-black/30"
                onClick={togglePlay}
              >
                {isPlaying ? (
                  <Pause className="h-8 w-8" />
                ) : (
                  <Play className="h-8 w-8" />
                )}
              </Button>
            </div>

            {/* Side actions */}
            <div className="absolute right-4 bottom-20 flex flex-col gap-6">
              <Button variant="ghost" size="icon" className="text-white">
                <Heart className="h-6 w-6" />
                <span className="text-sm mt-1">{video.likes}</span>
              </Button>
              <Button variant="ghost" size="icon" className="text-white">
                <MessageSquare className="h-6 w-6" />
                <span className="text-sm mt-1">{video.comments}</span>
              </Button>
              <Button variant="ghost" size="icon" className="text-white">
                <Share2 className="h-6 w-6" />
              </Button>
              <Button variant="ghost" size="icon" className="text-white" onClick={toggleMute}>
                {isMuted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
              </Button>
            </div>

            {/* Bottom info */}
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <h2 className="text-white text-lg font-semibold mb-2">{video.title}</h2>
              <p className="text-white/80 text-sm line-clamp-2">{video.description}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function LearnDetailView() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const swipeThreshold = 50;
    if (info.offset.y < -swipeThreshold && currentIndex < videos.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else if (info.offset.y > swipeThreshold && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleVideoEnd = useCallback(() => {
    if (currentIndex < videos.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }, [currentIndex]);

  return (
    <div className="fixed inset-0 bg-black">
      <motion.div
        ref={containerRef}
        className="h-full w-full"
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
      >
        <div className="relative h-full w-full">
          <VideoPlayer
            video={videos[currentIndex]}
            isActive={true}
            onVideoEnd={handleVideoEnd}
          />
        </div>
      </motion.div>

      {/* Progress indicators */}
      <div className="fixed top-4 left-0 right-0 z-50 flex justify-center gap-1">
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
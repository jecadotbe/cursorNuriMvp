import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useUser } from "@/hooks/use-user";
import { useSuggestion } from "@/hooks/use-suggestion";
import { MessageSquare, Users, Clock, ChevronRight } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { SuggestionFeedback } from "@/components/SuggestionFeedback";

// Image handling functions remain unchanged
const handleImageLoad = (imageName: string) => {
  console.log(`Successfully loaded image: ${imageName}`);
};

const handleImageError = (imageName: string, error: any) => {
  console.error(`Failed to load image: ${imageName}`, error);
  console.log('Image path attempted:', `/images/${imageName}`);
};

export default function HomeView() {
  const { user } = useUser();
  const { suggestion, isLoading, markAsUsed } = useSuggestion();
  const [showFeedback, setShowFeedback] = useState(false);
  const [currentSuggestionId, setCurrentSuggestionId] = useState<number | null>(null);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const handlePromptClick = async () => {
    if (!suggestion) return;

    try {
      // Mark suggestion as used and store ID for feedback
      await markAsUsed(suggestion.id);
      setCurrentSuggestionId(suggestion.id);

      if (suggestion.context === "existing" && suggestion.relatedChatId) {
        // Navigate to existing chat
        navigate(`/chat/${suggestion.relatedChatId}`);
      } else {
        // Create new chat with the prompt
        const response = await fetch('/api/chats', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: `Chat ${format(new Date(), 'M/d/yyyy')}`,
            messages: [{
              role: 'assistant',
              content: suggestion.text
            }],
          }),
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to create new chat');
        }

        const newChat = await response.json();
        navigate(`/chat/${newChat.id}`);
      }

      // Show feedback dialog after successful navigation
      setShowFeedback(true);
    } catch (error) {
      console.error('Error handling prompt:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not process the prompt. Please try again.",
      });
    }
  };

  const handleFeedbackClose = () => {
    setShowFeedback(false);
    setCurrentSuggestionId(null);
  };

  return (
    <div className="flex-1 bg-[#F2F0E5] overflow-y-auto">
      {/* Greeting Section with Logo */}
      <div className="w-full bg-gradient-to-r from-[#F8DD9F] to-[#F2F0E5] via-[#F2F0E5] via-45% ">
        <div className="px-4 pt-8">
          <div className="flex items-end gap-8">
            <div className="w-24 h-32 flex">
              <img
                src="/images/nuri_logo.png"
                alt="Nuri Logo"
                className="w-full object-contain self-end block"
                onLoad={() => handleImageLoad('nuri_logo.png')}
                onError={(e) => {
                  handleImageError('nuri_logo.png', e);
                  e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='200' viewBox='0 0 150 200'%3E%3Crect width='100%25' height='100%25' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='system-ui' font-size='16' fill='%23666'%3ENuri%3C/text%3E%3C/svg%3E";
                }}
              />
            </div>
            <div className="space-y-1 homebottom">
              <h1 className="text-2xl font-baskerville">
                Dag {user?.username},
              </h1>
              <p className="text-xl">
                Fijn je weer te zien.
                <br />
                Waarover wil je praten?
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Prompt */}
      <div className="px-5 py-6">
        {isLoading ? (
          <Card className="bg-white animate-pulse mb-4">
            <CardContent className="p-4">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ) : suggestion ? (
          <div onClick={handlePromptClick}>
            <Card className="bg-white hover:shadow-md transition-shadow cursor-pointer mb-4 animate-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                      <div className="text-orange-500 font-semibold text-sm tracking-wide uppercase">
                        Op basis van onze gesprekken
                      </div>
                    </div>
                    <p className="text-lg pr-8">{suggestion.text}</p>
                    {suggestion.context === "existing" && suggestion.relatedChatTitle && (
                      <div className="mt-2 text-sm text-gray-500 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        <span>Vervolg op: {suggestion.relatedChatTitle}</span>
                      </div>
                    )}
                  </div>
                  <ChevronRight className="w-6 h-6 text-gray-400 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}
        {suggestion && (
          <div className="flex justify-end mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
              ) : null}
              Toon andere suggestie
            </Button>
          </div>
        )}
      </div>

      {/* Village Section */}
      <div className="w-full">
        <div
          className="rounded-xl p-6 relative overflow-hidden min-h-[200px]"
          style={{
            backgroundImage: `url('/images/village_circles.png'), linear-gradient(180deg, #C9E1D4 0%, #F2F0E5 35%)`,
            backgroundPosition: "right top",
            backgroundRepeat: "no-repeat",
            backgroundSize: "contain",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <img src="/images/VillageIcon.svg" alt="Village" className="w-6 h-6" />
            <h2 className="text-2xl font-baskerville">Mijn Village</h2>
          </div>
          <h3 className="text-l mb-4">Laat je Village bloeien</h3>

          <div className="flex justify-end mt-4">
            <Link href="/village">
              <div className="bg-white rounded-full px-4 py-2 shadow-sm inline-flex items-center gap-2 cursor-pointer hover:shadow-md transition-shadow">
                <span>Bekijk je Village</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Learning Section */}
      <div className="w-full">
        <div
          className="rounded-xl p-6 relative overflow-hidden mb-4"
          style={{
            background: "linear-gradient(180deg, #F8DD9F 0%, #F2F0E5 35%)",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <img src="/images/LearningIcon.svg" alt="Learning" className="w-6 h-6" />
              <h2 className="text-2xl font-baskerville">Verder leren</h2>
            </div>
          </div>

          {/* One Card */}
          <div className="space-y-3">
            {OneCard.map((video, index) => (
              <Link key={index} href="/learn">
                <Card className="bg-white hover:shadow-md transition-shadow cursor-pointer mb-4">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-24 h-24 flex-shrink-0">
                        <img
                          src={video.image}
                          alt={video.title}
                          className="w-full h-full object-cover rounded-lg"
                          onLoad={() => handleImageLoad(video.image.split('/').pop()!)}
                          onError={(e) => {
                            handleImageError(video.image.split('/').pop()!, e);
                            e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Crect width='100%25' height='100%25' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='system-ui' font-size='12' fill='%23666'%3EThumbnail%3C/text%3E%3C/svg%3E";
                          }}
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-baskerville mb-2">{video.title}</h3>
                        <div className="inline-flex items-center px-4 py-1 rounded-full bg-[#E8E6DC] text-sm">
                          <Clock className="w-4 h-4 mr-1" />
                          <span>{video.duration}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-6 h-6 text-gray-400" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {learningVideos.map((video, index) => (
              <Link key={index} href="/learn" className="h-full">
                <Card
                  className="
                    bg-white 
                    border-2 border-[#E5E7EB] 
                    hover:shadow-md 
                    hover:border-[#D1D5DB]
                    transition-all
                    duration-200
                    cursor-pointer 
                    overflow-hidden 
                    h-full 
                    rounded-lg
                  "
                >
                  <CardContent className="p-4">
                    <img
                      src={video.image}
                      alt={video.title}
                      className="w-full aspect-[16/9] object-cover rounded-lg mb-4"
                      onLoad={() => handleImageLoad(video.image.split('/').pop()!)}
                      onError={(e) => {
                        handleImageError(video.image.split('/').pop()!, e);
                        e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Crect width='100%25' height='100%25' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='system-ui' font-size='12' fill='%23666'%3EThumbnail%3C/text%3E%3C/svg%3E";
                      }}
                    />
                    <h3 className="text-xl font-baskerville text-[#2F4644] mb-3">{video.title}</h3>
                    <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-white border border-[#E5E7EB]">
                      <Clock className="w-4 h-4 mr-2 text-gray-500" />
                      <span className="text-sm text-gray-600">{video.duration}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
      {showFeedback && currentSuggestionId && (
        <SuggestionFeedback
          suggestionId={currentSuggestionId}
          open={showFeedback}
          onClose={handleFeedbackClose}
        />
      )}
    </div>
  );
}

const learningVideos = [
  {
    title: "Wat is Aware Parenting?",
    duration: "10 min",
    image: "/images/alexander-dummer-ncyGJJ0TSLM-unsplash (1).jpg",
  },
  {
    title: "Niet straffen en belonen; hoe dan?",
    duration: "5 min",
    image: "/images/fabian-centeno-Snce5c3YjgI-unsplash.jpg",
  },
];

const OneCard = [
  {
    title: "Wat is Aware Parenting?",
    duration: "10 min",
    image: "/images/alexander-dummer-ncyGJJ0TSLM-unsplash (1).jpg",
  },
];
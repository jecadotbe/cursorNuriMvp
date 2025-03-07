import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollingTicker } from "@/components/ScrollingTicker";
import { useUser } from "@/hooks/use-user";
import { useSuggestion } from "@/hooks/use-suggestion";
import { useVillageSuggestions } from "@/hooks/use-village-suggestions";
import { MessageSquare, Users, Clock, ChevronRight, Wind, Heart, MessageCircle, X, RefreshCw, Check, Wand } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { renderMarkdown } from '@/lib/markdown';
import { SuggestionFeedback } from "@/components/SuggestionFeedback";
import { useBackgroundRefresh } from "@/hooks/use-background-refresh";
import { VillageSuggestionCards } from "@/components/VillageSuggestionCards";
import NotificationPermission from "@/components/NotificationPermission";
import NotificationTest from "@/components/NotificationTest";

const WelcomeView = () => {
  const greetings = [
    "Welkom bij Nuri",
    "Hallo! Nuri staat voor je klaar",
    "Goed dat je er bent",
    "Samen groeien met Nuri",
    "Ontdek Nuri vandaag"
  ];

  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * greetings.length);
    setGreeting(greetings[randomIndex]);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-[#F8DD9F] to-[#F2F0E5] p-4">
      <div className="w-24 h-32 mb-8">
        <img
          src="/images/nuri_logo.png"
          alt="Nuri Logo"
          className="w-full object-contain"
          onError={(e) => {
            e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='200' viewBox='0 0 150 200'%3E%3Crect width='100%25' height='100%25' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='system-ui' font-size='16' fill='%23666'%3ENuri%3C/text%3E%3C/svg%3E";
          }}
        />
      </div>
      <h1 className="text-4xl font-baskerville text-center mb-6">
        {greeting}
      </h1>
      <p className="text-xl text-center max-w-md mb-8">
        Je persoonlijke gids voor bewust opvoeden en ontwikkeling
      </p>
      <Link href="/auth" className="inline-block">
        <Button className="px-8 py-6 text-lg bg-[#2F4644] hover:bg-[#1a2726] text-white rounded-full">
          Start met Nuri
        </Button>
      </Link>
    </div>
  );
};


export default function HomeView() {
  const { user, isLoading: userLoading } = useUser();
  useBackgroundRefresh();

  // Wait for user state to be determined before rendering
  if (userLoading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
    </div>;
  }

  if (!user) {
    return <WelcomeView />;
  }

  const {
    suggestion,
    suggestions,
    isLoading: suggestionLoading,
    markAsUsed,
    nextSuggestion,
    dismissSuggestion,
    refetch: refetchSuggestions,
    error: suggestionError
  } = useSuggestion();

  const {
    suggestions: villageSuggestions,
    isLoading: villageLoading,
    error: villageError,
    markAsUsed: markVillageSuggestionAsUsed,
    refetch: refetchVillageSuggestions,
    invalidateSuggestions: invalidateVillageSuggestions,
    forceRefresh
  } = useVillageSuggestions({
    autoRefresh: true, // Enable auto-refresh to get new suggestions
    refreshInterval: 60000, // Check every minute for new suggestions
    maxSuggestions: 5,
    filterByType: ['network_growth', 'network_expansion', 'village_maintenance'] as const
  });
  
  // Debug logging to check suggestion sources
  useEffect(() => {
    console.log('Suggestions comparison:', {
      chatSuggestion: suggestion,
      villageSuggestions
    });
  }, [suggestion, villageSuggestions]);

  // Debug logging
  useEffect(() => {
    console.log('Village suggestions state:', {
      suggestions: villageSuggestions,
      loading: villageLoading,
      error: villageError
    });
  }, [villageSuggestions, villageLoading, villageError]);

  // Handle suggestion errors
  useEffect(() => {
    if (suggestionError) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load suggestions. Please try again.",
      });
    }
  }, [suggestionError]);

  const [isLoading, setIsLoading] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [hasSuggestions, setHasSuggestions] = useState(false);

  // Effect to handle suggestion loading state
  useEffect(() => {
    if (!suggestionLoading && suggestions?.length > 0) {
      setHasSuggestions(true);
      setShowSkeleton(false);
    } else if (!suggestionLoading && suggestions?.length === 0) {
      setHasSuggestions(false);
      setShowSkeleton(false);
    }
  }, [suggestionLoading, suggestions]);

  // Effect to refresh suggestions if needed
  useEffect(() => {
    if (!hasSuggestions && !suggestionLoading) {
      refetchSuggestions().catch(console.error);
    }
  }, [hasSuggestions, suggestionLoading, refetchSuggestions]);

  // Effect to refresh suggestions after chat sessions
  useEffect(() => {
    const refreshAfterChat = () => {
      invalidateVillageSuggestions();
      forceRefresh();
    };

    window.addEventListener('chatSessionEnd', refreshAfterChat);
    return () => window.removeEventListener('chatSessionEnd', refreshAfterChat);
  }, [invalidateVillageSuggestions, forceRefresh]);

  const shouldShowSkeleton = showSkeleton || suggestionLoading || (!hasSuggestions && !suggestion);

  const [showFeedback, setShowFeedback] = useState(false);
  const [currentSuggestionId, setCurrentSuggestionId] = useState<number | null>(null);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const actionChips = [
    {
      text: "Ik wil ventileren",
      icon: <Wind className="w-4 h-4" />,
    },
    {
      text: "Village vraagje",
      icon: <Heart className="w-4 h-4" />,
    },
    {
      text: "Gewoon chatten",
      icon: <MessageCircle className="w-4 h-4" />,
    },
  ];

  const handleChipClick = async (topic: string) => {
    try {
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `Chat ${format(new Date(), 'M/d/yyyy')}`,
          messages: [{
            role: 'assistant',
            content: `Ik begrijp dat je ${topic.toLowerCase()}. Waar wil je het over hebben?`
          }],
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to create new chat');
      }

      const newChat = await response.json();
      navigate(`/chat/${newChat.id}`);
    } catch (error) {
      console.error('Error creating chat:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not start the conversation. Please try again.",
      });
    }
  };

  const handlePromptClick = async () => {
    if (!suggestion) return;

    try {
      await markAsUsed(suggestion.id);
      setCurrentSuggestionId(suggestion.id);

      if (suggestion.context === "existing" && suggestion.relatedChatId) {
        navigate(`/chat/${suggestion.relatedChatId}`);
      } else {
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

  const handleImageLoad = (imageName: string) => {
    console.log(`Successfully loaded image: ${imageName}`);
  };

  const handleImageError = (imageName: string, error: any) => {
    console.error(`Failed to load image: ${imageName}`, error);
    console.log('Image path attempted:', `/images/${imageName}`);
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">Welkom bij Nuri</h1>
      
      {/* Notification components */}
      <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
        <h2 className="text-lg font-medium mb-2">Notification Settings</h2>
        <NotificationPermission />
        <NotificationTest />
      </div>
      
      <div className="flex-1 bg-[#F2F0E5] overflow-y-auto">
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

        <div className="px-5 py-6">
          {shouldShowSkeleton ? (
            <Card className="bg-white mb-4">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                  <div className="w-48 h-4 bg-gray-200 rounded animate-pulse"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                </div>
              </CardContent>
            </Card>
          ) : suggestion ? (
            <div onClick={handlePromptClick} className="transition-opacity duration-300 ease-in-out animate-fade-in">
              <Card className="hover:shadow-md transition-shadow cursor-pointer mb-3 animate-border rounded-2xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)]">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (suggestion) {
                          dismissSuggestion(suggestion.id);
                          nextSuggestion();
                        }
                      }}
                      className="absolute top-0 right-0 p-2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full" style={{
                          backgroundColor: suggestion.type === 'stress' ? '#EF4444' :
                            suggestion.type === 'learning' ? '#3B82F6' :
                            suggestion.type === 'village' ? '#10B981' :
                            suggestion.type === 'child_development' ? '#8B5CF6' :
                            suggestion.type === 'personal_growth' ? '#F59E0B' :
                            '#6B7280'
                        }}></div>
                        <div className="text-sm font-semibold tracking-wide uppercase" style={{
                          color: suggestion.type === 'stress' ? '#EF4444' :
                            suggestion.type === 'learning' ? '#3B82F6' :
                            suggestion.type === 'village' ? '#10B981' :
                            suggestion.type === 'child_development' ? '#8B5CF6' :
                            suggestion.type === 'personal_growth' ? '#F59E0B' :
                            '#6B7280'
                        }}>
                          {suggestion.title || (
                            suggestion.type === 'stress' ? 'Stress Management' :
                            suggestion.type === 'learning' ? 'Leren & Ontwikkeling' :
                            suggestion.type === 'village' ? 'Je Village' :
                            suggestion.type === 'child_development' ? 'Kind Ontwikkeling' :
                            suggestion.type === 'personal_growth' ? 'Persoonlijke Groei' :
                            'Op basis van onze gesprekken'
                          )}
                        </div>
                      </div>
                      <div
                        className="text-lg pr-8"
                        dangerouslySetInnerHTML={{
                          __html: renderMarkdown(suggestion.text)
                        }}
                      />
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
            <div className="flex justify-center gap-4 mt-2">
              <button
                onClick={() => {
                  setIsLoading(true);
                  nextSuggestion();
                  setIsLoading(false);
                }}
                disabled={isLoading || suggestionLoading || !suggestions?.length}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Volgende suggestie</span>
                <Wand className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="mt-4 overflow-hidden">
            <ScrollingTicker
              items={actionChips.map((chip, index) => ({
                id: index.toString(),
                text: (
                  <div
                    className="inline-flex items-center cursor-pointer"
                    onClick={() => handleChipClick(chip.text)}
                  >
                    {chip.icon}
                    <span className="ml-2">{chip.text}</span>
                  </div>
                )
              }))}
              className="py-2"
              speed={5}
            />
          </div>
        </div>

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
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <img src="/images/VillageIcon.svg" alt="Village" className="w-6 h-6" />
                <h2 className="text-2xl font-baskerville">Mijn Village</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={forceRefresh}
                disabled={villageLoading}
                className="hover:bg-white/20"
              >
                <RefreshCw className={`w-4 h-4 ${villageLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            <h3 className="text-l mb-4">I takes a Village to raise a child</h3>

            <div className="mt-4 space-y-4">
              {/* Village suggestions */}
              <div className="grid grid-cols-1 gap-3">
                {villageError ? (
                  <Card className="bg-white">
                    <CardContent className="p-4 text-center text-red-500">
                      Er ging iets mis bij het ophalen van de suggesties
                    </CardContent>
                  </Card>
                ) : villageLoading ? (
                  // Show loading skeleton while suggestions are being fetched
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Card key={i} className="bg-white animate-pulse">
                        <CardContent className="p-4">
                          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : villageSuggestions?.length === 0 ? (
                  <Card className="bg-white">
                    <CardContent className="p-4 text-center text-gray-500">
                      Nieuwe suggesties worden voorbereid...
                    </CardContent>
                  </Card>
                ) : (
                  <VillageSuggestionCards
                    suggestions={villageSuggestions || []}
                    onDismiss={(id) => {
                      markVillageSuggestionAsUsed(id);
                    }}
                    onNext={() => {
                      refetchVillageSuggestions();
                    }}
                    onRefresh={refetchVillageSuggestions}
                    isLoading={villageLoading}
                  />
                )}
              </div>

              <div className="flex justify-end">
                <Link href="/village">
                  <div className="px-4 py-2 shadow-sm inline-flex items-center gap-2 cursor-pointer hover:shadow-md transition-shadow">
                    <span>Bekijk je Village</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>

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
    title: "Spel & Spel?",
    duration: "5 min",
    image: "/images/ben-hagemann-sOW4e4EbPSk-unsplash.jpg",
  },
  {
    title: "Niet straffen en belonen; hoe dan?",
    duration: "5 min",
    image: "/images/fabian-centeno-Snce5c3YjgI-unsplash.jpg",
  },
];

const OneCard = [
  {
    title: "Van start met Nuri: in 10 minuten",
    duration: "10 min",
    image: "/images/alexander-dummer-ncyGJJ0TSLM-unsplash (1).jpg",
  },
];
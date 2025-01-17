import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useUser } from "@/hooks/use-user";
import { useChatHistory } from "@/hooks/use-chat-history";
import { MessageSquare, Users, Clock, ChevronRight } from "lucide-react";
import { Link } from "wouter";

// Add image load success handler
const handleImageLoad = (imageName: string) => {
  console.log(`Successfully loaded image: ${imageName}`);
};

// Add detailed error handling
const handleImageError = (imageName: string, error: any) => {
  console.error(`Failed to load image: ${imageName}`, error);
  console.log('Image path attempted:', `/images/${imageName}`);
};

export default function HomeView() {
  const { user } = useUser();
  const { getLatestPrompt, chats } = useChatHistory();
  const [prompt, setPrompt] = useState<{ text: string; type: string; context?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    if (isLoading && !prompt) {
      getLatestPrompt()
        .then(result => {
          if (mounted) {
            setPrompt(result.prompt);
            setIsLoading(false);
          }
        })
        .catch(err => {
          if (mounted) {
            console.error('Failed to load initial prompt:', err);
            setError('Failed to load recommendation');
            setIsLoading(false);
          }
        });
    }

    return () => {
      mounted = false;
    };
  }, []); // Run only once on mount

  return (
    <div className="flex-1 bg-[#F2F0E5] overflow-y-auto">
      {/* Greeting Section with Logo */}
      <div className="w-full bg-gradient-to-r from-[#F8DD9F] to-[#F2F0E5] via-[#F2F0E5] via-45% ">
        <div className="px-4 pt-8 homemeeting">
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
            <CardContent className="p-4 h-24" />
          </Card>
        ) : error ? (
          <Card className="bg-white mb-4">
            <CardContent className="p-4">
              <p className="text-red-500">{error}</p>
            </CardContent>
          </Card>
        ) : prompt && (
          <Link href={chats?.length > 0 ? `/chat/${chats[0].id}` : "/chat/history"}>
            <Card className="bg-white hover:shadow-md transition-shadow cursor-pointer mb-4">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-orange-500 font-medium text-sm mb-2">
                      {prompt.type === 'action' ? 'ACTIE' : prompt.type === 'reflection' ? 'REFLECTIE' : 'VERVOLG'}
                    </div>
                    <p className="text-lg pr-8">{prompt.text}</p>
                  </div>
                  <ChevronRight className="w-6 h-6 text-gray-400 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          </Link>
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
          <div className="flex justify-end">
            <Link href="/village">
              <div className="bg-white rounded-full px-4 py-2 shadow-sm inline-flex items-center gap-2 cursor-pointer">
                <span>
                  Er zijn <strong className="text-orange-500">3</strong> village
                  suggesties
                </span>
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
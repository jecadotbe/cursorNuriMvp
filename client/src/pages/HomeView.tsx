import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useUser } from "@/hooks/use-user";
import { useChatHistory } from "@/hooks/use-chat-history";
import { MessageSquare, Users, GraduationCap, Star, Clock, ChevronRight } from "lucide-react";
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
  const { getLatestPrompt } = useChatHistory();
  const [currentTime, setCurrentTime] = useState<string>("");

  useEffect(() => {
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const updateTime = () => {
    const now = new Date();
    setCurrentTime(
      now.toLocaleTimeString("nl-NL", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    );
  };

  const prompt = getLatestPrompt();

  return (
    <div className="flex-1 bg-[#F2F0E5] overflow-y-auto">
      {/* Status Bar */}
      <div className="flex justify-between items-center p-4">
        <span className="text-black">{currentTime}</span>
      </div>

      {/* Greeting Section with Logo */}
      <div className="w-full bg-gradient-to-r from-[#F8DD9F] to-[#F2F0E5] via-[#F2F0E5] via-35%">
        <div className="px-4 py-6">
          <div className="flex items-start gap-4">
            <div className="w-18 h-24">
              <img
                src="/images/nuri_logo.png"
                alt="Nuri Logo"
                className="w-full h-full object-contain"
                onLoad={() => handleImageLoad('nuri_logo.png')}
                onError={(e) => {
                  handleImageError('nuri_logo.png', e);
                  e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='200' viewBox='0 0 150 200'%3E%3Crect width='100%25' height='100%25' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='system-ui' font-size='16' fill='%23666'%3ENuri%3C/text%3E%3C/svg%3E";
                }}
              />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl text-[#2F4644]">
                Dag {user?.username},
              </h1>
              <p className="text-xl text-[#2F4644]">
                Fijn je weer te zien.
                <br />
                Waarover wil je praten?
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Prompt */}
      <div className="px-4 py-6">
        <Link href="/chat">
          <Card className="bg-white hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-orange-500 font-medium text-sm mb-2">
                    {prompt?.title}
                  </div>
                  <p className="text-lg pr-8">{prompt?.message}</p>
                </div>
                <ChevronRight className="w-6 h-6 text-gray-400 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Village Section */}
      <div className="w-full">
        <div
          className="rounded-xl p-4 relative overflow-hidden min-h-[200px]"
          style={{
            backgroundImage: `url('/images/village_circles.png')`,
            backgroundColor: '#D9E7DA',
            backgroundPosition: "right top",
            backgroundRepeat: "no-repeat",
            backgroundSize: "contain",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-5 h-5" />
            <h2 className="text-xl">Village</h2>
          </div>
          <h3 className="text-xl mb-4">Laat je Village bloeien</h3>
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

      {/* Learning Section */}
      <div className="w-full p-4">
        <div
          className="rounded-xl p-4"
          style={{
            background: "linear-gradient(180deg, #F8DD9F 0%, #F2F0E5 35%)",
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <GraduationCap className="w-5 h-5" />
            <h2 className="text-xl">Verder leren?</h2>
          </div>
          <div className="space-y-4">
            {learningVideos.map((video, index) => (
              <Link key={index} href="/learn">
                <Card className="bg-white hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <img
                        src={video.image}
                        alt={video.title}
                        className="w-20 h-20 object-cover rounded-lg"
                        onLoad={() => handleImageLoad(video.image.split('/').pop()!)}
                        onError={(e) => {
                          handleImageError(video.image.split('/').pop()!, e);
                          e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Crect width='100%25' height='100%25' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='system-ui' font-size='12' fill='%23666'%3EThumbnail%3C/text%3E%3C/svg%3E";
                        }}
                      />
                      <div className="flex-1">
                        <h3 className="text-lg mb-2">{video.title}</h3>
                        <div className="flex items-center text-gray-500">
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
        </div>
      </div>
    </div>
  );
}

const learningVideos = [
  {
    title: "Wat is Aware Parenting?",
    duration: "10 min",
    image: "/images/bg_test.jpg",
  },
  {
    title: "Niet straffen en belonen; hoe dan?",
    duration: "5 min",
    image: "/images/bg_test.jpg",
  },
  {
    title: "Hoe je kind begeleiden bij een driftbui",
    duration: "7 min",
    image: "/images/bg_test.jpg",
  },
];
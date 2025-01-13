import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Play, Headphones } from "lucide-react";

export default function LearnView() {
  const chapters = [
    {
      title: "Chapter 1: De basis",
      videos: [
        {
          title: "Nuri Basics: Welkom",
          duration: "5:24",
          thumbnail: "https://placehold.co/600x400/png",
        },
        {
          title: "Verbindend spel: deel 1",
          duration: "7:15",
          thumbnail: "https://placehold.co/600x400/png",
        },
      ],
    },
    {
      title: "Chapter 2: De visie van Nuri",
      videos: [
        {
          title: "De moderne complexiteit verstaan",
          duration: "8:30",
          thumbnail: "https://placehold.co/600x400/png",
        },
      ],
    },
  ];

  const podcasts = [
    {
      title: "Episode 5: Voeding familie #2",
      duration: "45:23",
    },
    {
      title: "Episode 4: Our inner values",
      duration: "38:15",
    },
  ];

  const quotes = [
    {
      text: "The less we try to control children, the greater will be our positive influence on them, and therefore our ability to change their behavior.",
      author: "Bonnie Harris",
    },
  ];

  return (
    <ScrollArea className="h-[calc(100vh-4rem)]">
      <div className="p-4 space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Learn</h1>
          <p className="text-gray-500">Expand your knowledge with Nuri</p>
        </div>

        {chapters.map((chapter) => (
          <div key={chapter.title} className="space-y-4">
            <h2 className="text-xl font-semibold">{chapter.title}</h2>
            <div className="grid gap-4">
              {chapter.videos.map((video) => (
                <Card key={video.title}>
                  <CardContent className="p-4">
                    <AspectRatio ratio={16 / 9} className="bg-muted mb-4">
                      <div className="flex items-center justify-center h-full">
                        <Play className="h-12 w-12 opacity-50" />
                      </div>
                    </AspectRatio>
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium">{video.title}</h3>
                      <span className="text-sm text-gray-500">
                        {video.duration}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Podcast and Inspiration</h2>
          <div className="grid gap-4">
            {podcasts.map((podcast) => (
              <Card key={podcast.title}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="bg-muted rounded-full p-3">
                    <Headphones className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">{podcast.title}</h3>
                    <span className="text-sm text-gray-500">
                      {podcast.duration}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Quotes of the day</h2>
          {quotes.map((quote, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <blockquote className="border-l-4 border-primary pl-4 italic">
                  {quote.text}
                  <footer className="text-sm text-gray-500 mt-2">
                    — {quote.author}
                  </footer>
                </blockquote>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}

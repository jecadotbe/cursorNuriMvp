import {
  ArrowLeft,
  MoreVertical,
  Clock,
  Play,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";

export default function LearnView() {
  const chapters1 = [
    {
      title: "Niet straffen en belonen; hoe dan?",
      duration: "5 min",
      image: "/images/alexander-dummer-ncyGJJ0TSLM-unsplash.jpg",
    },
    {
      title: "Hoe je kind begeleiden bij een driftbui",
      duration: "7 min",
      image: "/images/charlein-gracia--Ux5mdMJNEA-unsplash.jpg",
    },
    {
      title: "Verbindend spel; deel 1",
      duration: "5 min",
      image: "/images/toa-heftiba-aIjg99-BeiI-unsplash.jpg",
    },
    {
      title: "Verbindend spel; deel 2",
      duration: "1 min",
      image: "/images/toa-heftiba-MlrYkXOdiBE-unsplash.jpg",
    },
  ];

  const chapters2 = [
    {
      title: "De moderne complexiteit vandaag",
      duration: "5 min",
      image: "/images/charlein-gracia--Ux5mdMJNEA-unsplash.jpg",
    },
    {
      title: "Wat wel, wat niet? Wat nu?",
      duration: "1 min",
      image: "/images/charlein-gracia--Ux5mdMJNEA-unsplash.jpg",
    },
  ];

  const podcasts = [
    {
      number: 5,
      title: "OuderKracht: de zachte kracht van ouderschap",
      type: "PODCAST",
      spotifyUrl:
        "https://open.spotify.com/episode/1dEWkaM6CMbAHBTn52BH71?si=adcd330bdbcf4df7",
      artworkUrl:
        "/images/podcastcover.png",
    },
    {
      number: 4,
      title: "OuderKracht: thuisblijfouder vs. carrièreouder",
      type: "PODCAST",
      spotifyUrl:
        "https://open.spotify.com/episode/1dEWkaM6CMbAHBTn52BH71?si=adcd330bdbcf4df7",
      artworkUrl:
        "/images/podcastcover.png",
    },
  ];

  return (
    <div
      className="flex-1 bg-[#F2F0E5] overflow-y-auto"
      style={{
        background: "linear-gradient(180deg, #F8DD9F 0%, #F2F0E5 10%)",
      }}
    >
      {/* Header */}
      <div className="px-6 py-6 flex items-center justify-between">
        <Link href="/">
          <div className="flex items-center space-x-2 cursor-pointer">
            <ArrowLeft className="w-6 h-6" />
            <span>Terug</span>
          </div>
        </Link>
      </div>

      {/* Hero Image */}
      <div className="px-6">
        <div className="w-full aspect-video bg-gray-200 relative rounded-lg overflow-hidden">
          <img
            src="/images/brooke-cagle-109PiObJQSw-unsplash.jpg"
            alt="Course cover"
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Course Info */}
      <div className="p-6 space-y-4">
        <h1 className="text-4xl font-baskerville">Nuri basics</h1>
        <div className="flex items-center space-x-4 text-sm ">
          <div className="flex items-center">
            <span className="font-medium">16 video's</span>
          </div>
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-1" />
            <span>90 minuten</span>
          </div>
        </div>
        <p>
          Deze cursus biedt je een grondig inzicht in de basisprincipes van
          Nuri. Dit zal je helpen om de adviezen van Nuri gemakkelijker toe te
          passen. Jij, op je eigen tempo kan door deze learnings wandelen.
        </p>

        {/* Instructor */}
        <div className="space-y-8">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-full overflow-hidden">
              <img
                src="/images/lynn-profiel.jpg"
                alt="Lynn Geerinck"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h3 className="text-xl font-baskerville">Lynn Geerinck</h3>
              <p>Co-founder & methodology</p>
            </div>
          </div>
          <div className="h-px bg-gray-200" />
          <h2 className="text-2xl font-baskerville">
            Verder waar we gestopt zijn...
          </h2>
        </div>

        {/* Continue Learning */}
        <Link href="/learn/0">
          <div className="bg-white rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow mt-4">
            <div className="flex items-center space-x-3">
              <img
                src="/images/bg_test.jpg"
                alt="Nuri Basics Welkom"
                className="w-16 h-16 rounded-lg object-cover"
              />
              <div className="flex-1">
                <h3 className="font-medium">Nuri Basics Welkom</h3>
                <p className="text-sm ">10 min</p>
              </div>
              <ChevronRight className="w-5 h-5" />
            </div>
          </div>
        </Link>

        {/* Chapter 1 */}
        <div>
          <h2 className="text-2xl mb-4 font-baskerville">
            Hoofdstuk 1: De basis
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {chapters1.map((chapter, index) => (
              <Link key={index} href={`/learn/${index + 1}`} className="h-full">
                <Card className="
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
                ">
                  <CardContent className="p-4">
                    <img
                      src={chapter.image}
                      alt={chapter.title}
                      className="w-full aspect-[16/9] object-cover rounded-lg mb-4"
                    />
                    <h3 className="text-xl font-baskerville text-[#2F4644] mb-3">{chapter.title}</h3>
                    <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-white border border-[#E5E7EB]">
                      <Clock className="w-4 h-4 mr-2 text-gray-500" />
                      <span className="text-sm text-gray-600">{chapter.duration}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Chapter 2 */}
        <div>
          <h2 className="text-2xl  mb-4 font-baskerville">
            Hoofdstuk 2: De visie van Nuri
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {chapters2.map((chapter, index) => (
              <Link key={index} href={`/learn/${index + 1}`} className="h-full">
                <Card className="
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
                ">
                  <CardContent className="p-4">
                    <img
                      src={chapter.image}
                      alt={chapter.title}
                      className="w-full aspect-[16/9] object-cover rounded-lg mb-4"
                    />
                    <h3 className="text-xl font-baskerville text-[#2F4644] mb-3">{chapter.title}</h3>
                    <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-white border border-[#E5E7EB]">
                      <Clock className="w-4 h-4 mr-2 text-gray-500" />
                      <span className="text-sm text-gray-600">{chapter.duration}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Quote */}
        <div className="py-6">
          <p className="text-3xl font-baskerville italic">
            "The less we try to control children, the greater will be our
            positive influence on them, and therefore our ability to change
            their behavior."
          </p>
          <p className="text-sm  mt-2">Aletha Solter PhD.</p>
        </div>

        {/* Podcasts */}
        <div>
          <h2 className="text-2xl  mb-4 font-baskerville">
            Podcast and Inspiration
          </h2>
          <div className="space-y-4">
            {podcasts.map((podcast, index) => (
              <div key={index} className="bg-white p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex-1 mr-4">
                    <h3 className="font-medium">{podcast.title}</h3>
                    <div className="flex items-center space-x-4 mt-2">
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {podcast.type}
                      </span>
                      <a
                        href={podcast.spotifyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-sm  hover:text-green-500 transition-colors"
                      >
                        <Play className="w-4 h-4 mr-1" />
                        PLAY ON SPOTIFY
                      </a>
                    </div>
                  </div>
                  <img
                    src={podcast.artworkUrl}
                    alt={podcast.title}
                    className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

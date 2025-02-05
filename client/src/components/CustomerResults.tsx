import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

interface CustomerResultsProps {
  trigger: string;
}

export const CustomerResults = ({ trigger }: CustomerResultsProps) => {
  if (trigger !== 'Helan kinderopvang') {
    return null;
  }

  return (
    <div className="mt-4 bg-white rounded-lg p-4 shadow-sm">
      <div className="flex items-center gap-4">
        <img src="/attached_assets/image_1738770335551.png" alt="Helan Logo" className="h-8" />
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="link" className="text-[#629785] hover:text-[#4A7566]">
              Toon alle opties
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh]">
            <SheetHeader>
              <SheetTitle>Helan Kinderopvang Locaties</SheetTitle>
            </SheetHeader>
            <div className="grid gap-4 py-4">
              {[
                {
                  title: "Kinderopvang Gent Centrum",
                  description: "Centrale locatie in het hart van Gent",
                  capacity: "30 plaatsen",
                  address: "Korenmarkt 10, 9000 Gent"
                },
                {
                  title: "Kinderopvang Gent Zuid",
                  description: "Moderne faciliteiten in een groene omgeving",
                  capacity: "25 plaatsen",
                  address: "Zuidpark 15, 9000 Gent"
                },
                {
                  title: "Kinderopvang Gent Noord",
                  description: "Ruime opvang met grote buitenspeelplaats",
                  capacity: "35 plaatsen",
                  address: "Voorhavenlaan 1, 9000 Gent"
                }
              ].map((location, index) => (
                <Card key={index} className="hover:shadow-md transition-all">
                  <CardContent className="pt-6">
                    <h3 className="font-semibold mb-2">{location.title}</h3>
                    <p className="text-sm text-gray-600">{location.description}</p>
                    <p className="text-sm text-gray-600 mt-2">{location.capacity}</p>
                    <p className="text-sm text-gray-600">{location.address}</p>
                  </CardContent>
                  <CardFooter>
                    <a 
                      href="https://www.helan.be" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[#629785] hover:text-[#4A7566] inline-flex items-center gap-2"
                    >
                      Meer informatie
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { VillageMember } from "@db/schema";

// Constants for the circles
const CIRCLE_LEVELS = 5;
const BASE_CIRCLE_SIZE = 100;
const CIRCLE_SPACING = 80;

export default function VillagePage() {
  const [scale, setScale] = useState(1);
  
  const { data: members, isLoading } = useQuery<VillageMember[]>({
    queryKey: ["/api/village"],
  });

  // Group members by circle level
  const membersByCircle = members?.reduce((acc, member) => {
    acc[member.circle] = acc[member.circle] || [];
    acc[member.circle].push(member);
    return acc;
  }, {} as Record<number, VillageMember[]>) || {};

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mb-8 flex justify-between items-center">
        <h1 className="text-4xl font-bold">My Village</h1>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Member
        </Button>
      </div>

      <motion.div 
        className="relative w-full aspect-square max-w-4xl mx-auto bg-background/50 rounded-full overflow-hidden"
        style={{ 
          scale,
          transformOrigin: "center",
        }}
        whileTap={{ cursor: "grabbing" }}
      >
        {/* Core family circle in the center */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="bg-primary/10 rounded-full p-4 text-center">
            <span className="text-sm font-medium">Core Family</span>
          </div>
        </div>

        {/* Concentric circles */}
        {Array.from({ length: CIRCLE_LEVELS }).map((_, index) => {
          const level = index + 1;
          const size = BASE_CIRCLE_SIZE + (level * CIRCLE_SPACING);
          const members = membersByCircle[level] || [];

          return (
            <div
              key={level}
              className="absolute border border-gray-200 rounded-full"
              style={{
                width: `${size}%`,
                height: `${size}%`,
                top: `${50 - size/2}%`,
                left: `${50 - size/2}%`,
              }}
            >
              {/* Members in this circle */}
              {members.map((member, idx) => {
                const angle = (idx / members.length) * 2 * Math.PI;
                const radius = size / 2;
                const x = 50 + radius * Math.cos(angle);
                const y = 50 + radius * Math.sin(angle);

                return (
                  <motion.div
                    key={member.id}
                    className="absolute -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                    }}
                    whileHover={{ scale: 1.1 }}
                  >
                    <Card className="p-2 cursor-pointer">
                      <div className="text-sm font-medium">{member.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {member.category}
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          );
        })}
      </motion.div>

      {/* Zoom controls */}
      <div className="fixed bottom-8 right-8 flex gap-2">
        <Button
          variant="outline"
          onClick={() => setScale(s => Math.min(s + 0.1, 2))}
        >
          +
        </Button>
        <Button
          variant="outline"
          onClick={() => setScale(s => Math.max(s - 0.1, 0.5))}
        >
          -
        </Button>
      </div>
    </div>
  );
}

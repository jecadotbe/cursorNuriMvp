import { Router } from "express";
import { db } from "@db";
import { promptSuggestions } from "@db/schema";

export function setupVillageSuggestionsRouter(router: Router) {
  router.get("/suggestions", async (req, res) => {
    try {
      // For now, return static suggestions
      // In future, this would be dynamic based on user's village context
      const suggestions = [
        {
          id: 1,
          type: "village_interaction",
          text: "Plan een wekelijks koffie-uurtje met oma & opa om de band te versterken",
          priority: "high",
          category: "connection_building",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        },
        {
          id: 2,
          type: "village_support",
          text: "Vraag een vertrouwd familielid om regelmatig bij te springen met kinderopvang",
          priority: "medium",
          category: "support_network",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        {
          id: 3,
          type: "village_growth",
          text: "Organiseer een familiedag om de onderlinge banden te versterken",
          priority: "medium",
          category: "relationship_building",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      ];

      res.json(suggestions);
    } catch (error) {
      console.error("Error fetching village suggestions:", error);
      res.status(500).json({ message: "Failed to fetch village suggestions" });
    }
  });
}

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Mixpanel } from "@/lib/mixpanel";

interface StarButtonProps {
  filled: boolean;
  onClick: () => void;
}

const StarButton = ({ filled, onClick }: StarButtonProps) => (
  <button
    onClick={onClick}
    className="text-2xl focus:outline-none"
  >
    <span className={`${filled ? 'text-yellow-400' : 'text-gray-300'}`}>
      ★
    </span>
  </button>
);

interface SuggestionFeedbackProps {
  suggestionId: number;
  open: boolean;
  onClose: () => void;
}

export function SuggestionFeedback({ suggestionId, open, onClose }: SuggestionFeedbackProps) {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        title: "Rating Required",
        description: "Please select a rating before submitting",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/suggestions/${suggestionId}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rating,
          feedback: feedback.trim() || null,
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }

      // Track feedback submission
      Mixpanel.track('Suggestion Feedback Submitted', {
        suggestionId,
        rating: rating,
        hasComments: !!feedback
      });

      toast({
        title: "Thank you!",
        description: "Your feedback helps improve our suggestions.",
      });

      onClose();
    } catch (error) {
      console.error('Error submitting feedback:', error);

      // Track error
      Mixpanel.track('Suggestion Feedback Error', {
        suggestionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>How helpful was this suggestion?</DialogTitle>
          <DialogDescription>
            Your feedback helps us improve our suggestions.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="flex justify-center space-x-2 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <StarButton
                key={star}
                filled={star <= rating}
                onClick={() => setRating(star)}
              />
            ))}
          </div>
          <Textarea
            placeholder="Additional feedback (optional)"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="min-h-[100px] mb-4"
          />
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Skip
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Feedback"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
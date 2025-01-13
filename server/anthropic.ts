import Anthropic from '@anthropic-ai/sdk';
import type { Response } from 'express';

// the newest Anthropic model is "claude-3-5-sonnet-20241022" which was released October 22, 2024
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export function handleAnthropicError(error: any, res: Response) {
  if (error.status === 401) {
    return res.status(401).send("Invalid API key");
  }
  
  if (error.status === 429) {
    return res.status(429).send("Rate limit exceeded");
  }

  if (error.status === 500) {
    return res.status(500).send("Anthropic API error");
  }

  console.error("Anthropic API error:", error);
  return res.status(500).send("Internal server error");
}

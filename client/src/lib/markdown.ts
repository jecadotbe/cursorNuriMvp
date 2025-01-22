import { marked } from 'marked';

// Configure marked options for secure rendering
marked.setOptions({
  gfm: true, // GitHub Flavored Markdown
  breaks: true, // Convert line breaks to <br>
  sanitize: false, // Content is sanitized elsewhere
  smartLists: true,
  smartypants: true,
});

export function renderMarkdown(text: string): string {
  if (!text) return '';
  return marked(text);
}

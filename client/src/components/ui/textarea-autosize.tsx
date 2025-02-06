
import React, { useEffect, useRef } from 'react';
import { cn } from "@/lib/utils";

interface TextareaAutosizeProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  maxHeight?: number;
}

export const TextareaAutosize = React.forwardRef<HTMLTextAreaElement, TextareaAutosizeProps>(
  ({ className, maxHeight = 150, ...props }, ref) => {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const combinedRef = (node: HTMLTextAreaElement) => {
      textareaRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    };

    const updateHeight = () => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      
      const currentScroll = textarea.scrollTop;
      textarea.style.height = '44px'; // Reset to minimum height
      const newHeight = Math.min(textarea.scrollHeight, maxHeight);
      textarea.style.height = `${newHeight}px`;
      textarea.scrollTop = currentScroll; // Restore scroll position
    };

    useEffect(() => {
      updateHeight();
      window.addEventListener('resize', updateHeight);
      return () => window.removeEventListener('resize', updateHeight);
    }, [maxHeight]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey && props.onKeyPress) {
        e.preventDefault();
        props.onKeyPress(e);
      }
    };

    const handleTouchStart = (e: React.TouchEvent<HTMLTextAreaElement>) => {
      const textarea = textareaRef.current;
      if (!textarea || textarea.scrollHeight <= textarea.clientHeight) {
        return;
      }
      e.stopPropagation();
    };

    return (
      <textarea
        {...props}
        ref={combinedRef}
        onChange={(e) => {
          updateHeight();
          props.onChange?.(e);
        }}
        onKeyDown={handleKeyDown}
        onTouchStart={handleTouchStart}
        className={cn(
          "w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#629785] focus:border-transparent text-base",
          "overscroll-behavior-y-contain touch-pan-y",
          "min-h-[44px] resize-none",
          className
        )}
        style={{
          ...props.style,
          WebkitOverflowScrolling: 'touch',
          WebkitAppearance: 'none',
          msOverflowStyle: '-ms-autohiding-scrollbar',
          touchAction: 'pan-y pinch-zoom',
          caretColor: '#629785',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          isolation: 'isolate',
        }}
      />
    );
  }
);

TextareaAutosize.displayName = "TextareaAutosize";

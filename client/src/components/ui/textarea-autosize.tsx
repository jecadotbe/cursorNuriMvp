
import React, { useEffect, useRef } from 'react';
import { cn } from "@/lib/utils";

interface TextareaAutosizeProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  maxHeight?: number;
}

export const TextareaAutosize = React.forwardRef<HTMLTextAreaElement, TextareaAutosizeProps>(
  ({ className, maxHeight = 200, ...props }, ref) => {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const combinedRef = (node: HTMLTextAreaElement) => {
      textareaRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    };

    const updateHeight = () => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, maxHeight);
      textarea.style.height = `${newHeight}px`;
    };

    useEffect(() => {
      updateHeight();
      window.addEventListener('resize', updateHeight);
      return () => window.removeEventListener('resize', updateHeight);
    }, [maxHeight]);

    return (
      <textarea
        {...props}
        ref={combinedRef}
        onChange={(e) => {
          updateHeight();
          props.onChange?.(e);
        }}
        className={cn(
          "w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#629785] focus:border-transparent text-base",
          "overscroll-none touch-pan-y",
          className
        )}
        style={{
          ...props.style,
          overflowY: textareaRef.current?.scrollHeight > maxHeight ? 'auto' : 'hidden',
          WebkitOverflowScrolling: 'touch',
        }}
      />
    );
  }
);

TextareaAutosize.displayName = "TextareaAutosize";

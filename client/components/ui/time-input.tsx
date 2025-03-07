import React from 'react';
import { Input } from './input';

interface TimeInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
  onChange: (value: string) => void;
}

export function TimeInput({ value, onChange, className, ...props }: TimeInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Validate time format (HH:MM)
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    const newValue = e.target.value;
    
    if (newValue === '' || timeRegex.test(newValue)) {
      onChange(newValue);
    }
  };

  return (
    <Input
      type="time"
      value={value}
      onChange={handleChange}
      className={className}
      {...props}
    />
  );
} 
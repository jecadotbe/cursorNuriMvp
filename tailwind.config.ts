import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      typography: {
        DEFAULT: {
          css: {
            color: 'inherit',
            p: {
              marginTop: '1em',
              marginBottom: '1em',
            },
            'ul, ol': {
              padding: '0 0 0 1.5em',
              margin: '1em 0',
            },
            'ul > li': {
              paddingLeft: '0.375em',
              position: 'relative',
            },
            'ol > li': {
              paddingLeft: '0.375em',
            },
            table: {
              borderCollapse: 'collapse',
              marginTop: '1em',
              marginBottom: '1em',
            },
            'table th, table td': {
              border: '1px solid #e5e7eb',
              padding: '0.5em 1em',
            },
            'table th': {
              backgroundColor: '#f9fafb',
              fontWeight: '600',
            },
            code: {
              color: 'inherit',
              backgroundColor: '#f3f4f6',
              borderRadius: '0.25em',
              padding: '0.2em 0.4em',
            },
            'pre code': {
              backgroundColor: 'transparent',
              padding: '0',
            },
            'blockquote p': {
              borderLeftWidth: '4px',
              borderLeftColor: '#e5e7eb',
              paddingLeft: '1em',
              fontStyle: 'italic',
            },
            strong: {
              fontWeight: '600',
              color: 'inherit',
            },
            em: {
              fontStyle: 'italic',
              color: 'inherit',
            },
          },
        },
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
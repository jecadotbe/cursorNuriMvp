# Nuri Frontend Documentation

## Table of Contents
1. [UI Architecture](#ui-architecture)
2. [Component Library](#component-library)
3. [Feature Documentation](#feature-documentation)
4. [Page Structure](#page-structure)
5. [State Management](#state-management)
6. [Navigation System](#navigation-system)
7. [Accessibility](#accessibility)

## UI Architecture

### Design System
The UI is built on a custom theme extending shadcn/ui components with Tailwind CSS:

```typescript
Theme Configuration:
- Colors: Custom palette with emotional context
  - Primary: #629785 (Nurturing green)
  - Secondary: #F8DD9F (Warm yellow)
  - Background: #F2F0E5 (Soft neutral)
- Typography:
  - Primary: System font stack
  - Special: Baskerville for headings
- Components: shadcn/ui extension
- Animations: Custom Tailwind configurations
```

### Layout System
```typescript
Responsive Design:
- Mobile-first approach
- Breakpoint system
  - Default: Mobile (<768px)
  - md: Tablet (≥768px)
  - lg: Desktop (≥1024px)

Layout Components:
- Flexible grid system
- Card-based content
- Responsive navigation
- Dynamic spacing
```

## Component Library

### Core Components
```typescript
Chat Interface (ChatView.tsx):
- Real-time messaging
- Voice input integration
- Suggestion chips
- Context-aware responses
- Message feedback system

Learning System (LearnView.tsx):
- Course organization
- Chapter navigation
- Media integration
  - Video content
  - Podcast player
- Progress tracking

Home Dashboard (HomeView.tsx):
- Personalized greeting
- Action suggestions
- Village overview
- Learning recommendations
```

### Feature Implementations

#### Suggestion System
```typescript
SuggestionChips.tsx:
- Expandable sidebar interface
- Real-time suggestion updates
- Category-based organization
- Interactive chip selection
- Feedback collection

Features:
- Dynamic expansion/collapse
- Scroll area for overflow
- Loading states
- Error handling
```

#### Learning Content
```typescript
Course Structure:
- Chapter-based organization
- Mixed media content
  - Video lessons
  - Podcasts
  - Interactive elements
- Progress tracking
- Duration indicators

Content Types:
- Basic tutorials
- In-depth courses
- Expert interviews
- Practical exercises
```

#### Home Interface
```typescript
Key Features:
- Personalized greeting
- Context-aware suggestions
- Village status
- Learning progress
- Quick actions

Implementation:
- Gradient backgrounds
- Card-based layout
- Interactive elements
- Real-time updates
```

## Page Interactions

### Chat System
```typescript
Message Handling:
- Real-time sending/receiving
- Markdown rendering
- Code block support
- Link handling
- Image embedding

Voice Integration:
- Speech-to-text
- Recording visualization
- Error handling
- Feedback system
```

### Learning Experience
```typescript
Navigation:
- Chapter progression
- Content discovery
- Progress tracking
- Resume functionality

Media Integration:
- Video playback
- Podcast embedding
- Interactive elements
- Resource downloads
```

### Village Integration
```typescript
Features:
- Network visualization
- Member management
- Interaction tracking
- Memory system

Implementation:
- Interactive graph
- Member cards
- Activity timeline
- Progress indicators
```

## State Management

### React Query Implementation
```typescript
Key Features:
- Data fetching
- Cache management
- Real-time updates
- Error handling

Patterns:
- Optimistic updates
- Background refetching
- Infinite scrolling
- Prefetching
```

### Context Management
```typescript
Core Contexts:
- User authentication
- Theme preferences
- Navigation state
- Feature flags

Implementation:
- React Context API
- Custom hooks
- Local storage sync
- State persistence
```

## Accessibility Features

### Core Implementation
```typescript
Standards:
- WCAG 2.1 compliance
- Keyboard navigation
- Screen reader support
- Focus management

Testing:
- Automated audits
- Manual verification
- User feedback integration
```

### Progressive Enhancement
```typescript
Features:
- Fallback content
- Offline support
- Performance optimization
- Error recovery
```

This documentation provides a comprehensive overview of the Nuri frontend implementation. For specific details, refer to the respective component files and inline documentation.
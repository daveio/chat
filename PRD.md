# Planning Guide

A real-time chat room application that enables users to communicate through MQTT protocol using a public broker, creating an instant messaging experience with persistent connections and topic-based message routing.

**Experience Qualities**: 
1. **Immediate** - Messages appear instantly across all connected clients with zero perceived delay
2. **Conversational** - The interface feels like a natural chat experience with clear message attribution and timestamps
3. **Reliable** - Connection status is always visible, and users understand when they're connected or disconnected

**Complexity Level**: Light Application (multiple features with basic state)
This is a real-time messaging application with connection management, message history, and user presence, but doesn't require complex data persistence or multiple views.

## Essential Features

### MQTT Connection Management
- **Functionality**: Establish and maintain WebSocket connection to broker.emqx.io:8083/8084
- **Purpose**: Enable real-time bidirectional communication between all chat participants
- **Trigger**: Automatic connection on app load with manual reconnect option
- **Progression**: App loads → Generate unique client ID → Connect to broker → Subscribe to chat topic → Display connection status → Enable message input
- **Success criteria**: Connection indicator shows "Connected" and user can send/receive messages; disconnection shows clear error state

### Message Publishing
- **Functionality**: Send messages to the MQTT topic that all participants subscribe to
- **Purpose**: Allow users to broadcast their messages to the entire chat room
- **Trigger**: User types message and presses Enter or clicks Send button
- **Progression**: User types message → Presses Enter/Send → Message published to MQTT topic → Message appears in local chat → Input cleared
- **Success criteria**: Message appears in chat feed within 100ms, input is cleared, and other clients receive the message

### Message Subscription & Display
- **Functionality**: Receive and display all messages published to the chat topic
- **Purpose**: Show the conversation history and real-time updates from all participants
- **Trigger**: Messages arrive via MQTT subscription
- **Progression**: MQTT message received → Parse message payload → Add timestamp if needed → Append to message list → Auto-scroll to latest message
- **Success criteria**: All messages appear in chronological order with sender identification and timestamps

### Username Customization
- **Functionality**: Allow users to set a display name for their messages
- **Purpose**: Personalize the chat experience and identify message senders
- **Trigger**: User clicks username field or icon to edit
- **Progression**: Click username → Input field appears → Type new name → Press Enter or blur → Name saved to local storage → New name used for subsequent messages
- **Success criteria**: Username persists across sessions and appears on all sent messages

### Connection Status Indicator
- **Functionality**: Real-time visual feedback on MQTT connection health
- **Purpose**: Build trust by showing users they're connected and can communicate
- **Trigger**: Connection state changes (connecting, connected, disconnected, error)
- **Progression**: State changes → Indicator updates color/text → Display appropriate icon → Show error message if disconnected
- **Success criteria**: Users can always see their connection status and understand what it means

### Typing Indicators
- **Functionality**: Display real-time indicators when other users are composing messages
- **Purpose**: Create a more engaging, conversational experience by showing active participation
- **Trigger**: User begins typing in the message input field
- **Progression**: User types → Typing event published to MQTT → Other clients receive event → Animated indicator appears below messages → Indicator disappears after 3s of inactivity or when message is sent
- **Success criteria**: Typing indicators appear within 100ms of typing start, display correct usernames, and automatically clear after timeout

## Edge Case Handling

- **Connection Failures** - Display clear error message with reconnect button; queue messages locally until reconnected
- **Empty Messages** - Disable send button when input is empty to prevent blank messages
- **Long Messages** - Word-wrap messages that exceed container width; consider character limit
- **Duplicate Messages** - Use message IDs to prevent showing the same message multiple times
- **Username Not Set** - Default to "Anonymous" + random ID if user hasn't set a username
- **Network Instability** - Auto-reconnect with exponential backoff; show "Reconnecting..." status
- **Rapid Message Sending** - No artificial rate limiting but show sending state feedback
- **Multiple Typing Users** - Display up to 3 usernames, then "X others are typing..."
- **Stale Typing Indicators** - Automatically clear typing status after 3 seconds of inactivity

## Design Direction

The design should evoke feelings of speed, modernity, and digital communication - think retro terminal aesthetics meets contemporary messaging. The interface should feel tech-forward with strong visual indicators for connection status and message flow.

## Color Selection

A vibrant, high-contrast palette inspired by terminal interfaces and neon signage, creating an energetic and modern chat experience.

- **Primary Color**: `oklch(0.55 0.22 285)` - Deep electric purple that communicates technology and real-time communication
- **Secondary Colors**: 
  - Background: `oklch(0.12 0.015 285)` - Dark purple-tinted background for depth
  - Surface: `oklch(0.18 0.02 285)` - Slightly lighter surface for cards and message bubbles
- **Accent Color**: `oklch(0.75 0.19 155)` - Bright cyan for active states, send button, and connection indicators
- **Foreground/Background Pairings**: 
  - Primary purple on dark background (oklch(0.55 0.22 285) on oklch(0.12 0.015 285)): Ratio 5.2:1 ✓
  - Cyan accent on dark background (oklch(0.75 0.19 155) on oklch(0.12 0.015 285)): Ratio 8.5:1 ✓
  - White text on surface (oklch(0.95 0.01 285) on oklch(0.18 0.02 285)): Ratio 12.1:1 ✓
  - Muted text for timestamps (oklch(0.65 0.05 285) on oklch(0.18 0.02 285)): Ratio 4.8:1 ✓

## Font Selection

The typefaces should convey technical precision and modern digital communication, balancing readability with character.

- **Typographic Hierarchy**: 
  - H1 (App Title): JetBrains Mono Bold / 24px / tight letter spacing (-0.02em)
  - Message Sender: JetBrains Mono Medium / 14px / normal spacing
  - Message Body: Inter Regular / 15px / relaxed line-height (1.6)
  - Timestamps: JetBrains Mono Regular / 12px / tracking wide (0.02em)
  - Connection Status: JetBrains Mono Medium / 13px / uppercase

## Animations

Animations should emphasize the real-time nature of the chat while maintaining subtlety - messages should slide in smoothly, connection status should pulse when active, the send button should provide satisfying tactile feedback with a scale effect on press, and typing indicators should have a pulsing dot animation to convey active composition.

## Component Selection

- **Components**: 
  - Card (message container and chat window)
  - Input (message composition with custom styling)
  - Button (send message, reconnect with accent color)
  - Badge (connection status with dynamic color)
  - ScrollArea (message feed with auto-scroll)
  - Avatar (user identification with generated colors)
  - Separator (visual breaks between UI sections)
  
- **Customizations**: 
  - Custom message bubble component with timestamp and sender info
  - Animated connection indicator with pulse effect
  - Custom input with integrated send button
  - Animated typing indicator with pulsing dots
  
- **States**: 
  - Input: Focus state with cyan glow ring, disabled when disconnected
  - Send Button: Hover scale (1.05), active scale (0.95), disabled opacity (0.5)
  - Connection Badge: Green (connected), yellow (connecting), red (disconnected) with pulse animation
  - Messages: Subtle fade-in slide-up animation on arrival
  - Typing Indicator: Pulsing dots with staggered animation delays, fade in/out on appearance/disappearance
  
- **Icon Selection**: 
  - PaperPlaneRight (send message)
  - WifiHigh/WifiSlash (connection status)
  - UserCircle (username/profile)
  - ArrowClockwise (reconnect)
  
- **Spacing**: 
  - Container padding: p-6
  - Message gaps: gap-3
  - Input group gap: gap-2
  - Section margins: mb-4
  
- **Mobile**: 
  - Single column layout maintained
  - Larger touch targets for send button (min-h-12)
  - Fixed input at bottom with sticky positioning
  - Message font size scales up slightly (16px) to prevent zoom on iOS
  - Reduced padding (p-4) on mobile viewports

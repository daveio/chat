# Planning Guide

A real-time chat room application that enables users to communicate through MQTT protocol using a public broker, creating an instant messaging experience with persistent connections and topic-based message routing.

**Experience Qualities**: 
1. **Immediate** - Messages appear instantly across all connected clients with zero perceived delay
2. **Conversational** - The interface feels like a natural chat experience with clear message attribution and timestamps
3. **Reliable** - Connection status is always visible, and users understand when they're connected or disconnected

**Complexity Level**: Light Application (multiple features with basic state)
This is a real-time messaging application with connection management, message history, and user presence, but doesn't require complex data persistence or multiple views.

## Essential Features

### Encryption Key Generation
- **Functionality**: Generate ECDH P-256 keypair on app initialization for end-to-end encryption
- **Purpose**: Enable secure, authenticated message encryption between all chat participants
- **Trigger**: Automatic on app load before MQTT connection
- **Progression**: App loads → Generate ECDH keypair → Export public key → Show loading screen → Initialize MQTT connection
- **Success criteria**: Keypair generated within 500ms, public key ready for distribution, UI shows "E2EE" badge

### Public Key Exchange
- **Functionality**: Announce and collect public keys from all chat participants
- **Purpose**: Enable message encryption to multiple recipients without exposing private keys
- **Trigger**: On MQTT connection and when new typing events are received
- **Progression**: Connect to MQTT → Subscribe to pubkey topic → Announce own public key → Receive peer public keys → Store imported keys
- **Success criteria**: All active participants' public keys are collected and stored for encryption

### MQTT Connection Management
- **Functionality**: Establish and maintain WebSocket connection to test.mosquitto.org:8081
- **Purpose**: Enable real-time bidirectional communication between all chat participants
- **Trigger**: Automatic connection after keypair generation with manual reconnect option
- **Progression**: Keys generated → Generate unique client ID → Connect to broker → Subscribe to chat/typing/pubkey topics → Announce public key → Display connection status → Enable message input
- **Success criteria**: Connection indicator shows "Connected" and user can send/receive encrypted messages; disconnection shows clear error state

### Encrypted Message Publishing
- **Functionality**: Encrypt and send messages to all known participants using AES-GCM AEAD
- **Purpose**: Ensure only intended recipients can read messages, with tamper protection
- **Trigger**: User types message and presses Enter or clicks Send button
- **Progression**: User types message → Presses Enter/Send → Collect all peer public keys → Derive shared keys via ECDH → Encrypt with AES-GCM for each recipient → Publish encrypted payload to MQTT → Add plaintext to local view → Input cleared
- **Success criteria**: Message encrypted for all peers, appears in local chat within 100ms, encrypted data published to MQTT, other clients can decrypt

### Encrypted Message Reception & Decryption
- **Functionality**: Receive and decrypt messages using ECDH shared key derivation and AES-GCM
- **Purpose**: Display decrypted conversation history from authenticated senders
- **Trigger**: Encrypted messages arrive via MQTT subscription
- **Progression**: MQTT message received → Parse encrypted payload → Verify sender public key → Derive shared key → Decrypt with AES-GCM → Verify authentication tag → Display plaintext → Auto-scroll to latest message
- **Success criteria**: All messages decrypted successfully, appear in chronological order with sender identification, failed decryption handled gracefully

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
- **Functionality**: Display real-time indicators when other users are composing messages, includes public key for new participants
- **Purpose**: Create a more engaging, conversational experience by showing active participation
- **Trigger**: User begins typing in the message input field
- **Progression**: User types → Typing event with public key published to MQTT → Other clients receive event → Import public key if new → Animated indicator appears below messages → Indicator disappears after 3s of inactivity or when message is sent
- **Success criteria**: Typing indicators appear within 100ms of typing start, display correct usernames, automatically clear after timeout, public keys collected from typing events

## Edge Case Handling

- **Connection Failures** - Display clear error message with reconnect button; clear peer keys on reconnect to re-establish encrypted channels
- **Empty Messages** - Disable send button when input is empty to prevent blank messages
- **Long Messages** - Word-wrap messages that exceed container width; consider character limit
- **Duplicate Messages** - Use message IDs to prevent showing the same message multiple times
- **Username Not Set** - Default to "Anonymous" + random ID if user hasn't set a username
- **Network Instability** - Auto-reconnect with exponential backoff; show "Reconnecting..." status; re-announce public key on reconnect
- **Rapid Message Sending** - No artificial rate limiting but show sending state feedback
- **Multiple Typing Users** - Display up to 3 usernames, then "X others are typing..."
- **Stale Typing Indicators** - Automatically clear typing status after 3 seconds of inactivity
- **Decryption Failures** - Silently skip messages that can't be decrypted (wrong key or corrupted); log errors to console
- **Late Joiners** - Users joining after messages were sent won't see prior messages (no server-side history); only messages encrypted for them are visible
- **Missing Public Keys** - If sender's public key is unknown, attempt to import from message payload; skip messages that can't be decrypted
- **Key Generation Delays** - Show loading screen during keypair generation; prevent MQTT connection until keys are ready

## Design Direction

The design should evoke feelings of speed, modernity, security, and digital communication - think retro terminal aesthetics meets contemporary encrypted messaging. The interface should feel tech-forward with strong visual indicators for connection status, encryption status, and message flow. The addition of end-to-end encryption brings a sense of privacy and trustworthiness to the experience.

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
  - LockKey (encryption status and key generation)
  
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

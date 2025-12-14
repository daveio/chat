# MQTT Chat Room - Feature Implementation TODO

## Task 1: Custom MQTT Server Configuration

- [x] Add UI controls to configure MQTT broker settings
  - [x] Broker URL/host input field
  - [x] Port input field
  - [x] Topic prefix input field
  - [x] Validation for inputs
- [x] Store custom configuration in useKV for persistence
- [x] Update connection logic to use custom settings
- [x] Update all topic references to use configurable prefix
- [x] Add UI to show current server configuration
- [x] Add connect/disconnect controls for custom servers

## Task 2: Peer List with Public Key Status

- [x] Track all known peers (from any MQTT activity)
- [x] Visual indicator component for peer list
  - [x] Show nicknames of all peers
  - [x] Red indicator for peers without public key
  - [x] Green indicator for peers with public key
  - [x] Show total count of peers
- [x] Update peer tracking when messages/typing events received
- [x] Update peer tracking when public keys received

## Task 3: Manual Public Key Request

- [x] Add button to manually request public keys
- [x] Implement request handler (already exists, enhanced)
- [x] Add visual feedback when request is sent
- [x] Track when last request was made

## Task 4: Message Delivery Receipts

- [x] Define receipt message structure
  - [x] Message ID reference
  - [x] Recipient username
  - [x] Receipt type (received, decrypted)
  - [x] Timestamp
- [x] Add receipt topic to MQTT subscriptions
- [x] Send receipt after successful decryption
- [x] Track receipt status per message per recipient
- [x] Visual indicators on messages
  - [x] Show which recipients received message
  - [x] Show which recipients decrypted message
  - [x] Different icons/colors for different states
- [x] Update message UI to display receipt status

## Future: Shared Key Layer (Not Implemented Yet)

- [ ] Design shared key cryptography layer
- [ ] UI for key exchange/setup
- [ ] Integration with existing E2EE

import mqtt from 'mqtt'
import type { MqttClient } from 'mqtt'
import type {
  DeliveryReceipt,
  EncryptedMessage,
  Message,
  PublicKeyAnnouncement,
  PublicKeyRequest,
  ReceiptStatus,
  TypingEvent,
} from '~/types'
import {
  decryptMessage,
  importPublicKey,
} from '~/utils/crypto'
import {
  MESSAGE_ID_RANDOM_LENGTH,
  TYPING_THROTTLE_MS,
  TYPING_TIMEOUT_MS,
} from '~/utils/constants'
import {
  DeliveryReceiptSchema,
  EncryptedMessageSchema,
  PublicKeyAnnouncementSchema,
  PublicKeyRequestSchema,
  TypingEventSchema,
} from '~/utils/schemas'

export function useMqtt() {
  const store = useChatStore()
  const client = ref<MqttClient | null>(null)
  const lastTypingEmit = ref(0)
  const typingTimeout = ref<ReturnType<typeof setTimeout> | null>(null)
  const pendingKeyImports = new Set<string>()

  // Import public key with race condition prevention
  async function importAndStorePeerKey(serializedKey: string): Promise<CryptoKey | null> {
    // Check if already imported
    const existing = store.peerPublicKeys.get(serializedKey)
    if (existing) {
      return existing.key
    }

    // Check if import is already in progress
    if (pendingKeyImports.has(serializedKey)) {
      // Wait a bit and try again
      await new Promise(resolve => setTimeout(resolve, 50))
      return importAndStorePeerKey(serializedKey)
    }

    // Mark as pending
    pendingKeyImports.add(serializedKey)

    try {
      const pubKey = await importPublicKey(serializedKey)
      store.setPeerPublicKey(serializedKey, pubKey)
      return pubKey
    } finally {
      pendingKeyImports.delete(serializedKey)
    }
  }

  // Connect to MQTT broker
  async function connect() {
    if (!store.myKeyPair || !store.myPublicKeyString) return

    store.setConnectionStatus('connecting')

    const clientId = `mqtt-chat-${Math.random().toString(16).substring(2, 10)}`
    store.setClientId(clientId)

    const mqttClient = mqtt.connect(
      `${store.serverConfig.brokerUrl}:${store.serverConfig.port}`,
      {
        clientId,
        clean: true,
        reconnectPeriod: 5000,
      },
    )

    mqttClient.on('connect', () => {
      store.setConnectionStatus('connected')
      mqttClient.subscribe(
        [
          store.topics.messages,
          store.topics.typing,
          store.topics.pubkeys,
          store.topics.pubkeyRequest,
          store.topics.receipts,
        ],
        (err) => {
          if (err) {
            if (import.meta.dev) {
              console.error('Subscription error:', err)
            }
          } else {
            announcePublicKey()
            requestPublicKeys()
          }
        },
      )
    })

    mqttClient.on('message', async (topic, payload) => {
      await handleMessage(topic, payload)
    })

    mqttClient.on('error', (error) => {
      if (import.meta.dev) {
        console.error('MQTT Error:', error)
      }
      store.setConnectionStatus('error')
    })

    mqttClient.on('offline', () => {
      store.setConnectionStatus('disconnected')
    })

    mqttClient.on('reconnect', () => {
      store.setConnectionStatus('connecting')
    })

    client.value = mqttClient
  }

  // Handle incoming messages
  async function handleMessage(topic: string, payload: Buffer) {
    const { topics, displayUsername, myPublicKeyString, myKeyPair, peerPublicKeys } = store

    if (topic === topics.messages) {
      try {
        const parsed = EncryptedMessageSchema.safeParse(JSON.parse(payload.toString()))
        if (!parsed.success) {
          if (import.meta.dev) {
            console.error('Invalid encrypted message schema:', parsed.error)
          }
          return
        }
        const encryptedMsg: EncryptedMessage = parsed.data

        if (encryptedMsg.username === displayUsername) {
          return
        }

        // Update peer status
        const hasKey = peerPublicKeys.has(encryptedMsg.senderPublicKey)
        store.updatePeer({
          username: encryptedMsg.username,
          hasPublicKey: hasKey,
          lastSeen: Date.now(),
        })

        // Import sender's public key if needed
        let senderPublicKey = peerPublicKeys.get(encryptedMsg.senderPublicKey)?.key
        if (!senderPublicKey) {
          senderPublicKey = await importAndStorePeerKey(encryptedMsg.senderPublicKey)
          if (senderPublicKey) {
            store.updatePeer({
              username: encryptedMsg.username,
              hasPublicKey: true,
              lastSeen: Date.now(),
            })
          }
        }

        // Check if message is encrypted for us
        const encryptedForMe = encryptedMsg.encrypted[myPublicKeyString]
        if (!encryptedForMe) {
          sendReceipt(encryptedMsg.id, 'received')
          return
        }

        // Decrypt message
        const decryptedText = await decryptMessage(
          encryptedForMe,
          myKeyPair!.privateKey,
          senderPublicKey,
        )

        sendReceipt(encryptedMsg.id, 'decrypted')

        const message: Message = {
          id: encryptedMsg.id,
          username: encryptedMsg.username,
          text: decryptedText,
          timestamp: encryptedMsg.timestamp,
          receipts: new Map(),
        }

        store.addMessage(message)
      } catch (error) {
        if (import.meta.dev) {
          console.error('Failed to decrypt message:', error)
        }
      }
    } else if (topic === topics.typing) {
      try {
        const parsed = TypingEventSchema.safeParse(JSON.parse(payload.toString()))
        if (!parsed.success) {
          if (import.meta.dev) {
            console.error('Invalid typing event schema:', parsed.error)
          }
          return
        }
        const typingEvent: TypingEvent = parsed.data
        if (typingEvent.username !== displayUsername) {
          const hasKey = peerPublicKeys.has(typingEvent.publicKey)
          store.updatePeer({
            username: typingEvent.username,
            hasPublicKey: hasKey,
            lastSeen: Date.now(),
          })

          if (typingEvent.isTyping && !peerPublicKeys.has(typingEvent.publicKey)) {
            const pubKey = await importAndStorePeerKey(typingEvent.publicKey)
            if (pubKey) {
              store.updatePeer({
                username: typingEvent.username,
                hasPublicKey: true,
                lastSeen: Date.now(),
              })
            }
          }

          if (typingEvent.isTyping) {
            store.setTypingUser(typingEvent.username, typingEvent.timestamp)
          } else {
            store.removeTypingUser(typingEvent.username)
          }
        }
      } catch (error) {
        if (import.meta.dev) {
          console.error('Failed to parse typing event:', error)
        }
      }
    } else if (topic === topics.pubkeys) {
      try {
        const parsed = PublicKeyAnnouncementSchema.safeParse(JSON.parse(payload.toString()))
        if (!parsed.success) {
          if (import.meta.dev) {
            console.error('Invalid public key announcement schema:', parsed.error)
          }
          return
        }
        const announcement: PublicKeyAnnouncement = parsed.data
        if (announcement.username !== displayUsername) {
          if (!peerPublicKeys.has(announcement.publicKey)) {
            await importAndStorePeerKey(announcement.publicKey)
          }
          store.updatePeer({
            username: announcement.username,
            hasPublicKey: true,
            lastSeen: Date.now(),
          })
        }
      } catch (error) {
        if (import.meta.dev) {
          console.error('Failed to process public key announcement:', error)
        }
      }
    } else if (topic === topics.pubkeyRequest) {
      try {
        const parsed = PublicKeyRequestSchema.safeParse(JSON.parse(payload.toString()))
        if (!parsed.success) {
          if (import.meta.dev) {
            console.error('Invalid public key request schema:', parsed.error)
          }
          return
        }
        const request: PublicKeyRequest = parsed.data
        if (request.requesterId !== store.myClientId) {
          announcePublicKey()
        }
      } catch (error) {
        if (import.meta.dev) {
          console.error('Failed to process public key request:', error)
        }
      }
    } else if (topic === topics.receipts) {
      try {
        const parsed = DeliveryReceiptSchema.safeParse(JSON.parse(payload.toString()))
        if (!parsed.success) {
          if (import.meta.dev) {
            console.error('Invalid delivery receipt schema:', parsed.error)
          }
          return
        }
        const receipt: DeliveryReceipt = parsed.data
        if (receipt.username !== displayUsername) {
          store.updateMessageReceipt(receipt.messageId, {
            username: receipt.username,
            status: receipt.status,
            timestamp: receipt.timestamp,
          })
        }
      } catch (error) {
        if (import.meta.dev) {
          console.error('Failed to process delivery receipt:', error)
        }
      }
    }
  }

  // Announce public key
  function announcePublicKey() {
    if (!client.value || !store.myPublicKeyString) return

    const announcement: PublicKeyAnnouncement = {
      username: store.displayUsername,
      publicKey: store.myPublicKeyString,
      timestamp: Date.now(),
    }

    client.value.publish(store.topics.pubkeys, JSON.stringify(announcement), { qos: 0 })
  }

  // Request public keys from other clients
  function requestPublicKeys() {
    if (!client.value) return

    const request: PublicKeyRequest = {
      requesterId: store.myClientId,
      timestamp: Date.now(),
    }

    client.value.publish(store.topics.pubkeyRequest, JSON.stringify(request), { qos: 0 })
  }

  // Send delivery receipt
  function sendReceipt(messageId: string, status: ReceiptStatus) {
    if (!client.value) return

    const receipt: DeliveryReceipt = {
      messageId,
      username: store.displayUsername,
      status,
      timestamp: Date.now(),
    }

    client.value.publish(store.topics.receipts, JSON.stringify(receipt), { qos: 0 })
  }

  // Send message
  async function sendMessage(text: string) {
    if (
      !text.trim()
      || !client.value
      || store.connectionStatus !== 'connected'
      || !store.myKeyPair
      || !store.myPublicKeyString
    ) {
      return
    }

    const { encryptMessage } = await import('~/utils/crypto')

    // Stop typing indicator
    emitTypingStatus(false)
    if (typingTimeout.value) {
      clearTimeout(typingTimeout.value)
      typingTimeout.value = null
    }

    // Build recipient list
    const recipientKeys = Array.from(store.peerPublicKeys.values()).map(p => p.key)
    recipientKeys.push(store.myKeyPair.publicKey)

    const encrypted = await encryptMessage(
      text.trim(),
      store.myKeyPair.privateKey,
      recipientKeys,
    )

    const encryptedByPublicKey: { [key: string]: string } = {}
    Array.from(store.peerPublicKeys.values()).forEach((peer, idx) => {
      encryptedByPublicKey[peer.serialized] = encrypted[idx]
    })
    encryptedByPublicKey[store.myPublicKeyString] = encrypted[recipientKeys.length - 1]

    const encryptedMsg: EncryptedMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 2 + MESSAGE_ID_RANDOM_LENGTH)}`,
      username: store.displayUsername,
      encrypted: encryptedByPublicKey,
      timestamp: Date.now(),
      senderPublicKey: store.myPublicKeyString,
    }

    // Check if client is still connected (race condition prevention)
    if (!client.value) {
      if (import.meta.dev) {
        console.error('Client disconnected during message encryption')
      }
      return
    }

    client.value.publish(
      store.topics.messages,
      JSON.stringify(encryptedMsg),
      { qos: 0 },
      (err) => {
        if (err && import.meta.dev) {
          console.error('Publish error:', err)
        }
      },
    )

    // Add message to local state
    const message: Message = {
      id: encryptedMsg.id,
      username: store.displayUsername,
      text: text.trim(),
      timestamp: encryptedMsg.timestamp,
      receipts: new Map(),
    }
    store.addMessage(message)
  }

  // Emit typing status
  function emitTypingStatus(isTyping: boolean) {
    if (!client.value || store.connectionStatus !== 'connected' || !store.myPublicKeyString) {
      return
    }

    const typingEvent: TypingEvent = {
      username: store.displayUsername,
      isTyping,
      timestamp: Date.now(),
      publicKey: store.myPublicKeyString,
    }

    client.value.publish(store.topics.typing, JSON.stringify(typingEvent), { qos: 0 })
  }

  // Handle input change (for typing indicator)
  function handleTyping(hasContent: boolean) {
    if (hasContent && store.connectionStatus === 'connected') {
      const now = Date.now()
      if (now - lastTypingEmit.value > TYPING_THROTTLE_MS) {
        emitTypingStatus(true)
        lastTypingEmit.value = now
      }

      if (typingTimeout.value) {
        clearTimeout(typingTimeout.value)
      }

      typingTimeout.value = setTimeout(() => {
        emitTypingStatus(false)
      }, TYPING_TIMEOUT_MS)
    }
  }

  // Disconnect
  function disconnect() {
    // Clear typing timeout to prevent memory leak
    if (typingTimeout.value) {
      clearTimeout(typingTimeout.value)
      typingTimeout.value = null
    }

    if (client.value) {
      client.value.end(true)
      client.value = null
    }
  }

  // Reconnect
  function reconnect() {
    disconnect()
    store.resetForReconnection()
    connect()
  }

  // Handle server config change
  function handleServerConfigChange() {
    disconnect()
    store.resetForReconnection()
  }

  return {
    client,
    connect,
    disconnect,
    reconnect,
    sendMessage,
    handleTyping,
    requestPublicKeys,
    handleServerConfigChange,
  }
}

import { defineStore } from 'pinia'
import type {
  ConnectionStatus,
  KeyPair,
  Message,
  MessageReceipt,
  PeerPublicKey,
  PeerStatus,
  SerializedPublicKey,
  ServerConfig,
} from '~/types'

const DEFAULT_BROKER_URL = 'wss://test.mosquitto.org'
const DEFAULT_PORT = 8081
const DEFAULT_TOPIC_PREFIX = 'spark-chat-room'
const STORAGE_KEY_CONFIG = 'mqtt-server-config'
const STORAGE_KEY_USERNAME = 'mqtt-chat-username'

export const useChatStore = defineStore('chat', () => {
  // Persisted state (loaded from localStorage)
  const serverConfig = ref<ServerConfig>({
    brokerUrl: DEFAULT_BROKER_URL,
    port: DEFAULT_PORT,
    topicPrefix: DEFAULT_TOPIC_PREFIX,
  })

  const username = ref<string>('')

  // Crypto state
  const myKeyPair = ref<KeyPair | null>(null)
  const myPublicKeyString = ref<SerializedPublicKey>('')
  const isGeneratingKeys = ref(true)

  // Connection state
  const connectionStatus = ref<ConnectionStatus>('disconnected')
  const myClientId = ref<string>('')

  // Message state
  const messages = ref<Message[]>([])

  // Peer state
  const peers = ref<Map<string, PeerStatus>>(new Map())
  const peerPublicKeys = ref<Map<string, PeerPublicKey>>(new Map())

  // Typing state
  const typingUsers = ref<Map<string, number>>(new Map())

  // Computed
  const displayUsername = computed(() => {
    return username.value || `Anonymous-${Math.random().toString(36).substring(2, 7)}`
  })

  const topics = computed(() => ({
    messages: `${serverConfig.value.topicPrefix}/messages`,
    typing: `${serverConfig.value.topicPrefix}/typing`,
    pubkeys: `${serverConfig.value.topicPrefix}/pubkeys`,
    pubkeyRequest: `${serverConfig.value.topicPrefix}/pubkey-request`,
    receipts: `${serverConfig.value.topicPrefix}/receipts`,
  }))

  // Actions - Persistence
  function loadFromStorage() {
    if (import.meta.client) {
      const storedConfig = localStorage.getItem(STORAGE_KEY_CONFIG)
      if (storedConfig) {
        try {
          serverConfig.value = JSON.parse(storedConfig)
        } catch (e) {
          console.error('Failed to parse stored config:', e)
        }
      }

      const storedUsername = localStorage.getItem(STORAGE_KEY_USERNAME)
      if (storedUsername) {
        username.value = storedUsername
      }
    }
  }

  function saveConfig(config: ServerConfig) {
    serverConfig.value = config
    if (import.meta.client) {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config))
    }
  }

  function saveUsername(name: string) {
    username.value = name
    if (import.meta.client) {
      localStorage.setItem(STORAGE_KEY_USERNAME, name)
    }
  }

  // Actions - Crypto
  function setKeyPair(keyPair: KeyPair, publicKeyString: SerializedPublicKey) {
    myKeyPair.value = keyPair
    myPublicKeyString.value = publicKeyString
    isGeneratingKeys.value = false
  }

  // Actions - Connection
  function setConnectionStatus(status: ConnectionStatus) {
    connectionStatus.value = status
  }

  function setClientId(clientId: string) {
    myClientId.value = clientId
  }

  // Actions - Messages
  function addMessage(message: Message) {
    const exists = messages.value.some(m => m.id === message.id)
    if (!exists) {
      messages.value.push(message)
    }
  }

  function updateMessageReceipt(messageId: string, receipt: MessageReceipt) {
    const message = messages.value.find(m => m.id === messageId)
    if (message) {
      if (!message.receipts) {
        message.receipts = new Map()
      }
      const existing = message.receipts.get(receipt.username)
      if (!existing || receipt.status === 'decrypted') {
        message.receipts.set(receipt.username, receipt)
      }
    }
  }

  function clearMessages() {
    messages.value = []
  }

  // Actions - Peers
  function updatePeer(peerStatus: PeerStatus) {
    peers.value.set(peerStatus.username, peerStatus)
  }

  function setPeerPublicKey(serialized: SerializedPublicKey, key: CryptoKey) {
    peerPublicKeys.value.set(serialized, { key, serialized })
  }

  function clearPeers() {
    peers.value.clear()
    peerPublicKeys.value.clear()
  }

  // Actions - Typing
  function setTypingUser(username: string, timestamp: number) {
    typingUsers.value.set(username, timestamp)
  }

  function removeTypingUser(username: string) {
    typingUsers.value.delete(username)
  }

  function clearExpiredTypingUsers() {
    const now = Date.now()
    const TYPING_TIMEOUT = 3000
    for (const [user, timestamp] of typingUsers.value.entries()) {
      if (now - timestamp > TYPING_TIMEOUT) {
        typingUsers.value.delete(user)
      }
    }
  }

  function clearTypingUsers() {
    typingUsers.value.clear()
  }

  // Reset for reconnection
  function resetForReconnection() {
    clearMessages()
    clearPeers()
    clearTypingUsers()
  }

  return {
    // State
    serverConfig,
    username,
    myKeyPair,
    myPublicKeyString,
    isGeneratingKeys,
    connectionStatus,
    myClientId,
    messages,
    peers,
    peerPublicKeys,
    typingUsers,

    // Computed
    displayUsername,
    topics,

    // Actions
    loadFromStorage,
    saveConfig,
    saveUsername,
    setKeyPair,
    setConnectionStatus,
    setClientId,
    addMessage,
    updateMessageReceipt,
    clearMessages,
    updatePeer,
    setPeerPublicKey,
    clearPeers,
    setTypingUser,
    removeTypingUser,
    clearExpiredTypingUsers,
    clearTypingUsers,
    resetForReconnection,
  }
})

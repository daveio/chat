import { useState, useEffect, useRef } from 'react'
import mqtt from 'mqtt'
import type { MqttClient } from 'mqtt'
import { useKV } from '@github/spark/hooks'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { PaperPlaneRight, WifiHigh, WifiSlash, UserCircle, ArrowClockwise, LockKey } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { generateKeyPair, exportPublicKey, importPublicKey, encryptMessage, decryptMessage, type KeyPair, type SerializedPublicKey } from '@/lib/crypto'

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

type Message = {
  id: string
  username: string
  text: string
  timestamp: number
}

type EncryptedMessage = {
  id: string
  username: string
  encrypted: { [recipientKey: string]: string }
  timestamp: number
  senderPublicKey: SerializedPublicKey
}

type TypingEvent = {
  username: string
  isTyping: boolean
  timestamp: number
  publicKey: SerializedPublicKey
}

type PublicKeyAnnouncement = {
  username: string
  publicKey: SerializedPublicKey
  timestamp: number
}

const BROKER_URL = 'wss://test.mosquitto.org:8081'
const CHAT_TOPIC = 'spark-chat-room/messages'
const TYPING_TOPIC = 'spark-chat-room/typing'
const PUBKEY_TOPIC = 'spark-chat-room/pubkeys'
const TYPING_TIMEOUT = 3000

function App() {
  const [username, setUsername] = useKV('mqtt-chat-username', '')
  const [editingUsername, setEditingUsername] = useState(false)
  const [tempUsername, setTempUsername] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected')
  const [client, setClient] = useState<MqttClient | null>(null)
  const [typingUsers, setTypingUsers] = useState<Map<string, number>>(new Map())
  const [myKeyPair, setMyKeyPair] = useState<KeyPair | null>(null)
  const [myPublicKeyString, setMyPublicKeyString] = useState<SerializedPublicKey>('')
  const [peerPublicKeys, setPeerPublicKeys] = useState<Map<string, { key: CryptoKey; serialized: SerializedPublicKey }>>(new Map())
  const [isGeneratingKeys, setIsGeneratingKeys] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastTypingEmitRef = useRef<number>(0)

  const displayUsername = username || `Anonymous-${Math.random().toString(36).substring(2, 7)}`

  useEffect(() => {
    const initKeyPair = async () => {
      setIsGeneratingKeys(true)
      const keyPair = await generateKeyPair()
      const publicKeyString = await exportPublicKey(keyPair.publicKey)
      setMyKeyPair(keyPair)
      setMyPublicKeyString(publicKeyString)
      setIsGeneratingKeys(false)
    }
    initKeyPair()
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      setTypingUsers((current) => {
        const updated = new Map(current)
        let changed = false
        for (const [user, timestamp] of updated.entries()) {
          if (now - timestamp > TYPING_TIMEOUT) {
            updated.delete(user)
            changed = true
          }
        }
        return changed ? updated : current
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!username) {
      setUsername(`Anonymous-${Math.random().toString(36).substring(2, 7)}`)
    }
  }, [username, setUsername])

  useEffect(() => {
    if (!myKeyPair || !myPublicKeyString || isGeneratingKeys) return
    connectToMQTT()
    return () => {
      if (client) {
        client.end()
      }
    }
  }, [myKeyPair, myPublicKeyString, isGeneratingKeys])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const connectToMQTT = () => {
    if (!myKeyPair || !myPublicKeyString) return

    setConnectionStatus('connecting')
    
    const clientId = `mqtt-chat-${Math.random().toString(16).substring(2, 10)}`
    const mqttClient = mqtt.connect(BROKER_URL, {
      clientId,
      clean: true,
      reconnectPeriod: 5000,
    })

    mqttClient.on('connect', () => {
      setConnectionStatus('connected')
      mqttClient.subscribe([CHAT_TOPIC, TYPING_TOPIC, PUBKEY_TOPIC], (err) => {
        if (err) {
          console.error('Subscription error:', err)
        } else {
          announcePublicKey(mqttClient)
        }
      })
    })

    mqttClient.on('message', async (topic, payload) => {
      if (topic === CHAT_TOPIC) {
        try {
          const encryptedMsg: EncryptedMessage = JSON.parse(payload.toString())
          
          if (encryptedMsg.username === displayUsername) {
            return
          }

          let senderPublicKey = peerPublicKeys.get(encryptedMsg.senderPublicKey)?.key
          if (!senderPublicKey) {
            senderPublicKey = await importPublicKey(encryptedMsg.senderPublicKey)
            setPeerPublicKeys((current) => new Map(current).set(encryptedMsg.senderPublicKey, {
              key: senderPublicKey!,
              serialized: encryptedMsg.senderPublicKey,
            }))
          }

          const encryptedForMe = encryptedMsg.encrypted[myPublicKeyString]
          if (!encryptedForMe) {
            return
          }

          const decryptedText = await decryptMessage(encryptedForMe, myKeyPair!.privateKey, senderPublicKey)
          
          const message: Message = {
            id: encryptedMsg.id,
            username: encryptedMsg.username,
            text: decryptedText,
            timestamp: encryptedMsg.timestamp,
          }

          setMessages((current) => {
            const exists = current.some(m => m.id === message.id)
            if (exists) return current
            return [...current, message]
          })
        } catch (error) {
          console.error('Failed to decrypt message:', error)
        }
      } else if (topic === TYPING_TOPIC) {
        try {
          const typingEvent: TypingEvent = JSON.parse(payload.toString())
          if (typingEvent.username !== displayUsername) {
            if (typingEvent.isTyping && !peerPublicKeys.has(typingEvent.publicKey)) {
              const pubKey = await importPublicKey(typingEvent.publicKey)
              setPeerPublicKeys((current) => new Map(current).set(typingEvent.publicKey, {
                key: pubKey,
                serialized: typingEvent.publicKey,
              }))
            }

            setTypingUsers((current) => {
              const updated = new Map(current)
              if (typingEvent.isTyping) {
                updated.set(typingEvent.username, typingEvent.timestamp)
              } else {
                updated.delete(typingEvent.username)
              }
              return updated
            })
          }
        } catch (error) {
          console.error('Failed to parse typing event:', error)
        }
      } else if (topic === PUBKEY_TOPIC) {
        try {
          const announcement: PublicKeyAnnouncement = JSON.parse(payload.toString())
          if (announcement.username !== displayUsername && !peerPublicKeys.has(announcement.publicKey)) {
            const pubKey = await importPublicKey(announcement.publicKey)
            setPeerPublicKeys((current) => new Map(current).set(announcement.publicKey, {
              key: pubKey,
              serialized: announcement.publicKey,
            }))
          }
        } catch (error) {
          console.error('Failed to process public key announcement:', error)
        }
      }
    })

    mqttClient.on('error', (error) => {
      console.error('MQTT Error:', error)
      setConnectionStatus('error')
    })

    mqttClient.on('offline', () => {
      setConnectionStatus('disconnected')
    })

    mqttClient.on('reconnect', () => {
      setConnectionStatus('connecting')
    })

    setClient(mqttClient)
  }

  const announcePublicKey = (mqttClient: MqttClient) => {
    if (!myPublicKeyString) return

    const announcement: PublicKeyAnnouncement = {
      username: displayUsername,
      publicKey: myPublicKeyString,
      timestamp: Date.now(),
    }

    mqttClient.publish(PUBKEY_TOPIC, JSON.stringify(announcement), { qos: 0 })
  }

  const emitTypingStatus = (isTyping: boolean) => {
    if (!client || connectionStatus !== 'connected' || !myPublicKeyString) return

    const typingEvent: TypingEvent = {
      username: displayUsername,
      isTyping,
      timestamp: Date.now(),
      publicKey: myPublicKeyString,
    }

    client.publish(TYPING_TOPIC, JSON.stringify(typingEvent), { qos: 0 })
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMessage(e.target.value)

    if (e.target.value.trim() && connectionStatus === 'connected') {
      const now = Date.now()
      if (now - lastTypingEmitRef.current > 1000) {
        emitTypingStatus(true)
        lastTypingEmitRef.current = now
      }

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      typingTimeoutRef.current = setTimeout(() => {
        emitTypingStatus(false)
      }, TYPING_TIMEOUT)
    }
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !client || connectionStatus !== 'connected' || !myKeyPair || !myPublicKeyString) return

    emitTypingStatus(false)
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    const recipientKeys = Array.from(peerPublicKeys.values()).map(p => p.key)
    recipientKeys.push(myKeyPair.publicKey)

    const encrypted = await encryptMessage(inputMessage.trim(), myKeyPair.privateKey, recipientKeys)

    const encryptedByPublicKey: { [key: string]: string } = {}
    Array.from(peerPublicKeys.values()).forEach((peer, idx) => {
      encryptedByPublicKey[peer.serialized] = encrypted[idx]
    })
    encryptedByPublicKey[myPublicKeyString] = encrypted[recipientKeys.length - 1]

    const encryptedMsg: EncryptedMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      username: displayUsername,
      encrypted: encryptedByPublicKey,
      timestamp: Date.now(),
      senderPublicKey: myPublicKeyString,
    }

    client.publish(CHAT_TOPIC, JSON.stringify(encryptedMsg), { qos: 0 }, (err) => {
      if (err) {
        console.error('Publish error:', err)
      }
    })

    const message: Message = {
      id: encryptedMsg.id,
      username: displayUsername,
      text: inputMessage.trim(),
      timestamp: encryptedMsg.timestamp,
    }
    setMessages((current) => [...current, message])

    setInputMessage('')
    inputRef.current?.focus()
  }

  const handleReconnect = () => {
    if (client) {
      client.end(true)
    }
    setPeerPublicKeys(new Map())
    connectToMQTT()
  }

  const handleUsernameEdit = () => {
    setTempUsername(displayUsername)
    setEditingUsername(true)
  }

  const handleUsernameSave = () => {
    if (tempUsername.trim()) {
      setUsername(tempUsername.trim())
    }
    setEditingUsername(false)
  }

  const getStatusBadge = () => {
    switch (connectionStatus) {
      case 'connected':
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 font-mono uppercase text-xs tracking-wide">
            <WifiHigh className="mr-1.5" weight="bold" size={14} />
            Connected
          </Badge>
        )
      case 'connecting':
        return (
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 font-mono uppercase text-xs tracking-wide animate-pulse">
            <WifiHigh className="mr-1.5" weight="bold" size={14} />
            Connecting...
          </Badge>
        )
      case 'error':
      case 'disconnected':
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30 font-mono uppercase text-xs tracking-wide">
            <WifiSlash className="mr-1.5" weight="bold" size={14} />
            Disconnected
          </Badge>
        )
    }
  }

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  const getAvatarColor = (username: string) => {
    const colors = [
      'bg-purple-500',
      'bg-cyan-500',
      'bg-pink-500',
      'bg-orange-500',
      'bg-green-500',
      'bg-blue-500',
      'bg-yellow-500',
      'bg-red-500',
    ]
    const index = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length
    return colors[index]
  }

  const getTypingText = () => {
    const users = Array.from(typingUsers.keys())
    if (users.length === 0) return null
    if (users.length === 1) return `${users[0]} is typing...`
    if (users.length === 2) return `${users[0]} and ${users[1]} are typing...`
    return `${users[0]}, ${users[1]}, and ${users.length - 2} others are typing...`
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 flex items-center justify-center">
      {isGeneratingKeys ? (
        <Card className="w-full max-w-md p-8 bg-card border-border shadow-2xl">
          <div className="flex flex-col items-center gap-4 text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <LockKey size={48} className="text-accent" weight="fill" />
            </motion.div>
            <h2 className="text-xl font-bold font-mono text-primary">Generating Keys</h2>
            <p className="text-sm text-muted-foreground font-mono">
              Creating your encryption keypair using ECDH P-256...
            </p>
          </div>
        </Card>
      ) : (
        <Card className="w-full max-w-4xl h-[90vh] flex flex-col bg-card border-border shadow-2xl">
          <div className="p-6 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold font-mono tracking-tight text-primary">
                MQTT.CHAT
              </h1>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center gap-2">
                {editingUsername ? (
                  <Input
                    value={tempUsername}
                    onChange={(e) => setTempUsername(e.target.value)}
                    onBlur={handleUsernameSave}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleUsernameSave()
                      if (e.key === 'Escape') setEditingUsername(false)
                    }}
                    autoFocus
                    className="h-8 w-40 bg-background border-accent"
                  />
                ) : (
                  <button
                    onClick={handleUsernameEdit}
                    className="flex items-center gap-2 hover:text-accent transition-colors"
                  >
                    <UserCircle size={20} weight="fill" className="text-muted-foreground" />
                    <span className="text-sm font-medium font-mono">{displayUsername}</span>
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 font-mono uppercase text-xs tracking-wide">
                <LockKey className="mr-1.5" weight="fill" size={14} />
                E2EE
              </Badge>
              {getStatusBadge()}
              {connectionStatus !== 'connected' && (
                <Button
                  onClick={handleReconnect}
                  size="sm"
                  variant="outline"
                  className="font-mono text-xs"
                >
                  <ArrowClockwise size={14} className="mr-1.5" />
                  Reconnect
                </Button>
              )}
            </div>
          </div>

          <ScrollArea className="flex-1 p-6">
            <div ref={scrollRef} className="space-y-3">
              <AnimatePresence initial={false}>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex gap-3"
                  >
                    <div className={`w-8 h-8 rounded-full ${getAvatarColor(message.username)} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                      {message.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="font-medium font-mono text-sm text-foreground">
                          {message.username}
                        </span>
                        <span className="text-xs font-mono text-muted-foreground tracking-wide">
                          {formatTimestamp(message.timestamp)}
                        </span>
                      </div>
                      <p className="text-foreground text-[15px] leading-relaxed break-words">
                        {message.text}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {messages.length === 0 && (
                <div className="text-center text-muted-foreground py-12">
                  <p className="font-mono text-sm">No messages yet. Start the conversation!</p>
                  <p className="font-mono text-xs mt-2 text-accent">All messages are end-to-end encrypted</p>
                </div>
              )}
              {typingUsers.size > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="flex items-center gap-2 text-muted-foreground text-sm font-mono pl-11"
                >
                  <div className="flex gap-1">
                    <motion.span
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                      className="w-1.5 h-1.5 bg-accent rounded-full"
                    />
                    <motion.span
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                      className="w-1.5 h-1.5 bg-accent rounded-full"
                    />
                    <motion.span
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                      className="w-1.5 h-1.5 bg-accent rounded-full"
                    />
                  </div>
                  <span className="text-accent">{getTypingText()}</span>
                </motion.div>
              )}
            </div>
          </ScrollArea>

          <div className="p-6 border-t border-border space-y-4">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={inputMessage}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
                placeholder={connectionStatus === 'connected' ? 'Type a message...' : 'Connecting...'}
                disabled={connectionStatus !== 'connected'}
                className="flex-1 bg-background border-input focus:ring-accent text-base md:text-[15px]"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || connectionStatus !== 'connected'}
                className="bg-accent hover:bg-accent/90 text-accent-foreground font-medium px-6 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100"
              >
                <PaperPlaneRight size={18} weight="fill" />
              </Button>
            </div>
            
            <div className="bg-muted/30 rounded-lg p-3 border border-border/50 space-y-3">
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-wide">Monitor Traffic (MQTT CLI)</p>
              
              <div>
                <p className="text-[10px] font-mono text-muted-foreground/80 mb-1 uppercase tracking-wider">Mosquitto CLI</p>
                <code className="text-xs font-mono text-accent bg-background/50 px-2 py-1 rounded block overflow-x-auto whitespace-nowrap">
                  mosquitto_sub -h test.mosquitto.org -p 8081 -t "spark-chat-room/#" -v
                </code>
              </div>
              
              <div>
                <p className="text-[10px] font-mono text-muted-foreground/80 mb-1 uppercase tracking-wider">MQTTX CLI</p>
                <code className="text-xs font-mono text-accent bg-background/50 px-2 py-1 rounded block overflow-x-auto whitespace-nowrap">
                  mqttx sub -h test.mosquitto.org -p 8081 -l wss --path /mqtt -t "spark-chat-room/#" -v
                </code>
              </div>
              
              <div>
                <p className="text-[10px] font-mono text-muted-foreground/80 mb-1 uppercase tracking-wider">HiveMQ MQTT CLI</p>
                <code className="text-xs font-mono text-accent bg-background/50 px-2 py-1 rounded block overflow-x-auto whitespace-nowrap">
                  mqtt sub -h test.mosquitto.org -p 8081 -ws -ws:path /mqtt -s -t "spark-chat-room/#" -T -v
                </code>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

export default App
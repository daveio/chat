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
import { PaperPlaneRight, WifiHigh, WifiSlash, UserCircle, ArrowClockwise } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

type Message = {
  id: string
  username: string
  text: string
  timestamp: number
}

const BROKER_URL = 'wss://test.mosquitto.org:8081'
const CHAT_TOPIC = 'spark-chat-room/messages'

function App() {
  const [username, setUsername] = useKV('mqtt-chat-username', '')
  const [editingUsername, setEditingUsername] = useState(false)
  const [tempUsername, setTempUsername] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected')
  const [client, setClient] = useState<MqttClient | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const displayUsername = username || `Anonymous-${Math.random().toString(36).substring(2, 7)}`

  useEffect(() => {
    if (!username) {
      setUsername(`Anonymous-${Math.random().toString(36).substring(2, 7)}`)
    }
  }, [username, setUsername])

  useEffect(() => {
    connectToMQTT()
    return () => {
      if (client) {
        client.end()
      }
    }
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const connectToMQTT = () => {
    setConnectionStatus('connecting')
    
    const clientId = `mqtt-chat-${Math.random().toString(16).substring(2, 10)}`
    const mqttClient = mqtt.connect(BROKER_URL, {
      clientId,
      clean: true,
      reconnectPeriod: 5000,
    })

    mqttClient.on('connect', () => {
      setConnectionStatus('connected')
      mqttClient.subscribe(CHAT_TOPIC, (err) => {
        if (err) {
          console.error('Subscription error:', err)
        }
      })
    })

    mqttClient.on('message', (topic, payload) => {
      if (topic === CHAT_TOPIC) {
        try {
          const message: Message = JSON.parse(payload.toString())
          setMessages((current) => {
            const exists = current.some(m => m.id === message.id)
            if (exists) return current
            return [...current, message]
          })
        } catch (error) {
          console.error('Failed to parse message:', error)
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

  const handleSendMessage = () => {
    if (!inputMessage.trim() || !client || connectionStatus !== 'connected') return

    const message: Message = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      username: displayUsername,
      text: inputMessage.trim(),
      timestamp: Date.now(),
    }

    client.publish(CHAT_TOPIC, JSON.stringify(message), { qos: 0 }, (err) => {
      if (err) {
        console.error('Publish error:', err)
      }
    })

    setInputMessage('')
    inputRef.current?.focus()
  }

  const handleReconnect = () => {
    if (client) {
      client.end(true)
    }
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

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 flex items-center justify-center">
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
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-6 border-t border-border">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
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
        </div>
      </Card>
    </div>
  )
}

export default App
<script setup lang="ts">
const { store, mqtt, initialize, cleanup, handleServerConfigSave, handleReconnect, handleUsernameChange, handleManualKeyRequest, formatTimestamp, getAvatarColor, getTypingText } = useChat()

// Local state for username editing
const editingUsername = ref(false)
const tempUsername = ref('')
const inputMessage = ref('')
const scrollRef = ref<HTMLDivElement>()
const inputRef = ref<InstanceType<typeof import('~/components/ui/Input.vue').default>>()

// Initialize on mount
onMounted(async () => {
  await initialize()
})

// Cleanup on unmount
onUnmounted(() => {
  cleanup()
})

// Auto-scroll on new messages
watch(
  () => store.messages.length,
  () => {
    nextTick(() => {
      if (scrollRef.value) {
        scrollRef.value.scrollTop = scrollRef.value.scrollHeight
      }
    })
  },
)

// Username editing handlers
function handleUsernameEdit() {
  tempUsername.value = store.displayUsername
  editingUsername.value = true
}

function handleUsernameSave() {
  if (tempUsername.value.trim()) {
    handleUsernameChange(tempUsername.value)
  }
  editingUsername.value = false
}

// Message handlers
function handleInputChange(value: string) {
  inputMessage.value = value
  mqtt.handleTyping(!!value.trim())
}

async function handleSendMessage() {
  if (!inputMessage.value.trim()) return
  await mqtt.sendMessage(inputMessage.value)
  inputMessage.value = ''
  inputRef.value?.focus()
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    handleSendMessage()
  }
}
</script>

<template>
  <div class="min-h-screen bg-background p-4 md:p-6 flex items-center justify-center">
    <!-- Key Generation Loading -->
    <UiCard v-if="store.isGeneratingKeys" class="w-full max-w-md p-8 bg-card border-border shadow-2xl">
      <div class="flex flex-col items-center gap-4 text-center">
        <div class="animate-spin-slow">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 256 256"
            fill="currentColor"
            class="text-accent"
          >
            <path d="M216.57,39.43A80,80,0,0,0,83.91,120.78L28.69,176A15.86,15.86,0,0,0,24,187.31V216a16,16,0,0,0,16,16H72a8,8,0,0,0,8-8V208H96a8,8,0,0,0,8-8V184h16a8,8,0,0,0,5.66-2.34l9.56-9.57A79.73,79.73,0,0,0,160,176h.1A80,80,0,0,0,216.57,39.43ZM180,92a16,16,0,1,1,16-16A16,16,0,0,1,180,92Z" />
          </svg>
        </div>
        <h2 class="text-xl font-bold font-mono text-primary">
          Generating Keys
        </h2>
        <p class="text-sm text-muted-foreground font-mono">
          Creating your encryption keypair using ECDH P-256...
        </p>
      </div>
    </UiCard>

    <!-- Main Chat Interface -->
    <div v-else class="w-full max-w-6xl h-[90vh] flex gap-4">
      <UiCard class="flex-1 flex flex-col bg-card border-border shadow-2xl">
        <!-- Header -->
        <div class="p-6 border-b border-border flex items-center justify-between">
          <div class="flex items-center gap-4">
            <h1 class="text-2xl font-bold font-mono tracking-tight text-primary">
              MQTT.CHAT
            </h1>
            <UiSeparator orientation="vertical" class="h-6" />
            <div class="flex items-center gap-2">
              <UiInput
                v-if="editingUsername"
                v-model="tempUsername"
                autofocus
                class="h-8 w-40 bg-background border-accent"
                @blur="handleUsernameSave"
                @keydown.enter="handleUsernameSave"
                @keydown.escape="editingUsername = false"
              />
              <button
                v-else
                class="flex items-center gap-2 hover:text-accent transition-colors"
                @click="handleUsernameEdit"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 256 256"
                  fill="currentColor"
                  class="text-muted-foreground"
                >
                  <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,16a88,88,0,1,1-88,88A88.1,88.1,0,0,1,128,40Zm0,176a88,88,0,0,1-53.85-18.42,63.58,63.58,0,0,1,107.7,0A87.87,87.87,0,0,1,128,216Zm64.36-19.52A79.61,79.61,0,0,0,160,169.94a48,48,0,1,0-64,0,79.61,79.61,0,0,0-32.36,26.54,88,88,0,1,1,128.72,0ZM128,152a32,32,0,1,1,32-32A32,32,0,0,1,128,152Z" />
                </svg>
                <span class="text-sm font-medium font-mono">
                  {{ store.displayUsername }}
                </span>
              </button>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <!-- E2EE Badge -->
            <UiBadge class="bg-green-500/20 text-green-400 border-green-500/30 font-mono uppercase text-xs tracking-wide">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 256 256"
                fill="currentColor"
                class="mr-1.5"
              >
                <path d="M216.57,39.43A80,80,0,0,0,83.91,120.78L28.69,176A15.86,15.86,0,0,0,24,187.31V216a16,16,0,0,0,16,16H72a8,8,0,0,0,8-8V208H96a8,8,0,0,0,8-8V184h16a8,8,0,0,0,5.66-2.34l9.56-9.57A79.73,79.73,0,0,0,160,176h.1A80,80,0,0,0,216.57,39.43ZM180,92a16,16,0,1,1,16-16A16,16,0,0,1,180,92Z" />
              </svg>
              E2EE
            </UiBadge>

            <!-- Connection Status Badge -->
            <UiBadge
              v-if="store.connectionStatus === 'connected'"
              class="bg-green-500/20 text-green-400 border-green-500/30 font-mono uppercase text-xs tracking-wide"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 256 256" fill="currentColor" class="mr-1.5">
                <path d="M140,204a12,12,0,1,1-12-12A12,12,0,0,1,140,204ZM237.08,87A172,172,0,0,0,18.92,87,8,8,0,0,0,29.08,99.37a156,156,0,0,1,197.84,0A8,8,0,0,0,237.08,87ZM205,122.77a124,124,0,0,0-153.94,0A8,8,0,0,0,61,135.31a108,108,0,0,1,134.06,0A8,8,0,0,0,205,122.77Zm-32.26,35.76a76.05,76.05,0,0,0-89.42,0,8,8,0,0,0,9.42,12.94,60,60,0,0,1,70.58,0,8,8,0,1,0,9.42-12.94Z" />
              </svg>
              Connected
            </UiBadge>
            <UiBadge
              v-else-if="store.connectionStatus === 'connecting'"
              class="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 font-mono uppercase text-xs tracking-wide animate-pulse"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 256 256" fill="currentColor" class="mr-1.5">
                <path d="M140,204a12,12,0,1,1-12-12A12,12,0,0,1,140,204ZM237.08,87A172,172,0,0,0,18.92,87,8,8,0,0,0,29.08,99.37a156,156,0,0,1,197.84,0A8,8,0,0,0,237.08,87ZM205,122.77a124,124,0,0,0-153.94,0A8,8,0,0,0,61,135.31a108,108,0,0,1,134.06,0A8,8,0,0,0,205,122.77Zm-32.26,35.76a76.05,76.05,0,0,0-89.42,0,8,8,0,0,0,9.42,12.94,60,60,0,0,1,70.58,0,8,8,0,1,0,9.42-12.94Z" />
              </svg>
              Connecting...
            </UiBadge>
            <UiBadge
              v-else
              class="bg-red-500/20 text-red-400 border-red-500/30 font-mono uppercase text-xs tracking-wide"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 256 256" fill="currentColor" class="mr-1.5">
                <path d="M140,204a12,12,0,1,1-12-12A12,12,0,0,1,140,204Zm-12-36a8,8,0,0,0,8-8V64a8,8,0,0,0-16,0v96A8,8,0,0,0,128,168Z" />
              </svg>
              Disconnected
            </UiBadge>

            <!-- Server Settings -->
            <ServerSettings
              :config="store.serverConfig"
              :disabled="store.connectionStatus === 'connecting'"
              @save="handleServerConfigSave"
            />

            <!-- Reconnect Button -->
            <UiButton
              v-if="store.connectionStatus !== 'connected'"
              size="sm"
              variant="outline"
              class="font-mono text-xs"
              @click="handleReconnect"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 256 256" fill="currentColor" class="mr-1.5">
                <path d="M240,56v48a8,8,0,0,1-8,8H184a8,8,0,0,1,0-16H211.4L184.81,71.64a88,88,0,1,0,1.83,126.21,8,8,0,0,1,11,11.63A104,104,0,1,1,224,56Z" />
              </svg>
              Reconnect
            </UiButton>
          </div>
        </div>

        <!-- Message Area -->
        <UiScrollArea class="flex-1 p-6">
          <div ref="scrollRef" class="space-y-3">
            <TransitionGroup name="slide-fade">
              <div
                v-for="message in store.messages"
                :key="message.id"
                class="flex gap-3"
              >
                <div
                  :class="[
                    'w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0',
                    getAvatarColor(message.username),
                  ]"
                >
                  {{ message.username.charAt(0).toUpperCase() }}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-baseline gap-2 mb-1">
                    <span class="font-medium font-mono text-sm text-foreground">
                      {{ message.username }}
                    </span>
                    <span class="text-xs font-mono text-muted-foreground tracking-wide">
                      {{ formatTimestamp(message.timestamp) }}
                    </span>
                    <MessageReceipts
                      v-if="message.username === store.displayUsername"
                      :receipts="Array.from(message.receipts?.values() || [])"
                      :total-peers="store.peers.size"
                    />
                  </div>
                  <p class="text-foreground text-[15px] leading-relaxed break-words">
                    {{ message.text }}
                  </p>
                </div>
              </div>
            </TransitionGroup>

            <!-- Empty State -->
            <div v-if="store.messages.length === 0" class="text-center text-muted-foreground py-12">
              <p class="font-mono text-sm">
                No messages yet. Start the conversation!
              </p>
              <p class="font-mono text-xs mt-2 text-accent">
                All messages are end-to-end encrypted
              </p>
            </div>

            <!-- Typing Indicator -->
            <Transition name="fade">
              <div
                v-if="store.typingUsers.size > 0"
                class="flex items-center gap-2 text-muted-foreground text-sm font-mono pl-11"
              >
                <div class="flex gap-1">
                  <span class="w-1.5 h-1.5 bg-accent rounded-full typing-dot" />
                  <span class="w-1.5 h-1.5 bg-accent rounded-full typing-dot" />
                  <span class="w-1.5 h-1.5 bg-accent rounded-full typing-dot" />
                </div>
                <span class="text-accent">{{ getTypingText() }}</span>
              </div>
            </Transition>
          </div>
        </UiScrollArea>

        <!-- Message Composer -->
        <div class="p-6 border-t border-border space-y-4">
          <div class="flex gap-2">
            <UiInput
              ref="inputRef"
              :model-value="inputMessage"
              :placeholder="store.connectionStatus === 'connected' ? 'Type a message...' : 'Connecting...'"
              :disabled="store.connectionStatus !== 'connected'"
              class="flex-1 bg-background border-input focus:ring-accent text-base md:text-[15px]"
              @update:model-value="handleInputChange"
              @keydown="handleKeydown"
            />
            <UiButton
              :disabled="!inputMessage.trim() || store.connectionStatus !== 'connected'"
              class="bg-accent hover:bg-accent/90 text-accent-foreground font-medium px-6 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100"
              @click="handleSendMessage"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 256 256" fill="currentColor">
                <path d="M231.87,114l-168-95.89A16,16,0,0,0,40.92,37.34L71.55,128,40.92,218.67A16,16,0,0,0,56,240a16.15,16.15,0,0,0,7.93-2.1l167.92-96.05a16,16,0,0,0,.05-27.89ZM56,215.73V40.27L196.19,120H88v16H196.19Z" />
              </svg>
            </UiButton>
          </div>

          <!-- Server Info -->
          <div class="bg-muted/30 rounded-lg p-3 border border-border/50 space-y-3">
            <div class="flex items-center justify-between">
              <p class="text-xs font-mono text-muted-foreground uppercase tracking-wide">
                Current Server
              </p>
            </div>
            <div class="text-xs font-mono text-accent">
              <p>{{ store.serverConfig.brokerUrl }}:{{ store.serverConfig.port }}</p>
              <p class="text-muted-foreground">
                Topic: {{ store.serverConfig.topicPrefix }}/*
              </p>
            </div>

            <UiSeparator class="my-2" />

            <p class="text-xs font-mono text-muted-foreground uppercase tracking-wide">
              Monitor Traffic (MQTT CLI)
            </p>

            <div>
              <p class="text-[10px] font-mono text-muted-foreground/80 mb-1 uppercase tracking-wider">
                Mosquitto CLI
              </p>
              <code class="text-xs font-mono text-accent bg-background/50 px-2 py-1 rounded block overflow-x-auto whitespace-nowrap">
                mosquitto_sub -h test.mosquitto.org -p 8081 -t "{{ store.serverConfig.topicPrefix }}/#" -v
              </code>
            </div>

            <div>
              <p class="text-[10px] font-mono text-muted-foreground/80 mb-1 uppercase tracking-wider">
                MQTTX CLI
              </p>
              <code class="text-xs font-mono text-accent bg-background/50 px-2 py-1 rounded block overflow-x-auto whitespace-nowrap">
                mqttx sub -h test.mosquitto.org -p 8081 -l wss --path /mqtt -t '{{ store.serverConfig.topicPrefix }}/#' -v
              </code>
            </div>

            <div>
              <p class="text-[10px] font-mono text-muted-foreground/80 mb-1 uppercase tracking-wider">
                HiveMQ MQTT CLI
              </p>
              <code class="text-xs font-mono text-accent bg-background/50 px-2 py-1 rounded block overflow-x-auto whitespace-nowrap">
                mqtt sub -h test.mosquitto.org -p 8081 -ws -ws:path /mqtt -s -t '{{ store.serverConfig.topicPrefix }}/#' -T -v
              </code>
            </div>
          </div>
        </div>
      </UiCard>

      <!-- Peer List Sidebar -->
      <div class="w-80 flex flex-col gap-4">
        <PeerList
          :peers="store.peers"
          :disabled="store.connectionStatus !== 'connected'"
          @request-keys="handleManualKeyRequest"
        />
      </div>
    </div>
  </div>
</template>

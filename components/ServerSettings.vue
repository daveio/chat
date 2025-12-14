<script setup lang="ts">
import type { ServerConfig } from '~/types'

interface Props {
  config: ServerConfig
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
})

const emit = defineEmits<{
  save: [config: ServerConfig]
}>()

const open = ref(false)
const brokerUrl = ref(props.config.brokerUrl)
const port = ref(props.config.port.toString())
const topicPrefix = ref(props.config.topicPrefix)

function handleSave() {
  const portNum = parseInt(port.value, 10)
  if (
    !brokerUrl.value.trim()
    || isNaN(portNum)
    || portNum <= 0
    || !topicPrefix.value.trim()
  ) {
    return
  }

  emit('save', {
    brokerUrl: brokerUrl.value.trim(),
    port: portNum,
    topicPrefix: topicPrefix.value.trim(),
  })
  open.value = false
}

function handleOpenChange(newOpen: boolean) {
  if (newOpen) {
    // Reset form values when opening
    brokerUrl.value = props.config.brokerUrl
    port.value = props.config.port.toString()
    topicPrefix.value = props.config.topicPrefix
  }
  open.value = newOpen
}
</script>

<template>
  <div>
    <UiButton
      variant="outline"
      size="sm"
      class="font-mono text-xs"
      :disabled="disabled"
      @click="handleOpenChange(true)"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 256 256"
        fill="currentColor"
        class="mr-1.5"
      >
        <path d="M128,80a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Zm88-29.84q.06-2.16,0-4.32l14.92-18.64a8,8,0,0,0,1.48-7.06,107.21,107.21,0,0,0-10.88-26.25,8,8,0,0,0-6-3.93l-23.72-2.64q-1.48-1.56-3-3L186,40.54a8,8,0,0,0-3.94-6,107.71,107.71,0,0,0-26.25-10.87,8,8,0,0,0-7.06,1.49L130.16,40Q128,40,125.84,40L107.2,25.11a8,8,0,0,0-7.06-1.48A107.6,107.6,0,0,0,73.89,34.51a8,8,0,0,0-3.93,6L67.32,64.27q-1.56,1.49-3,3L40.54,70a8,8,0,0,0-6,3.94,107.71,107.71,0,0,0-10.87,26.25,8,8,0,0,0,1.49,7.06L40,125.84Q40,128,40,130.16L25.11,148.8a8,8,0,0,0-1.48,7.06,107.21,107.21,0,0,0,10.88,26.25,8,8,0,0,0,6,3.93l23.72,2.64q1.49,1.56,3,3L70,215.46a8,8,0,0,0,3.94,6,107.71,107.71,0,0,0,26.25,10.87,8,8,0,0,0,7.06-1.49L125.84,216q2.16.06,4.32,0l18.64,14.92a8,8,0,0,0,7.06,1.48,107.21,107.21,0,0,0,26.25-10.88,8,8,0,0,0,3.93-6l2.64-23.72q1.56-1.48,3-3L215.46,186a8,8,0,0,0,6-3.94,107.71,107.71,0,0,0,10.87-26.25,8,8,0,0,0-1.49-7.06Zm-16.1-6.5a73.93,73.93,0,0,1,0,8.68,8,8,0,0,0,1.74,5.48l14.19,17.73a91.57,91.57,0,0,1-6.23,15L187,173.11a8,8,0,0,0-5.1,2.64,74.11,74.11,0,0,1-6.14,6.14,8,8,0,0,0-2.64,5.1l-2.51,22.58a91.32,91.32,0,0,1-15,6.23l-17.74-14.19a8,8,0,0,0-5-1.75h-.48a73.93,73.93,0,0,1-8.68,0,8,8,0,0,0-5.48,1.74L100.45,215.8a91.57,91.57,0,0,1-15-6.23L82.89,187a8,8,0,0,0-2.64-5.1,74.11,74.11,0,0,1-6.14-6.14,8,8,0,0,0-5.1-2.64L46.43,170.6a91.32,91.32,0,0,1-6.23-15l14.19-17.74a8,8,0,0,0,1.74-5.48,73.93,73.93,0,0,1,0-8.68,8,8,0,0,0-1.74-5.48L40.2,100.45a91.57,91.57,0,0,1,6.23-15L69,82.89a8,8,0,0,0,5.1-2.64,74.11,74.11,0,0,1,6.14-6.14A8,8,0,0,0,82.89,69L85.4,46.43a91.32,91.32,0,0,1,15-6.23l17.74,14.19a8,8,0,0,0,5.48,1.74,73.93,73.93,0,0,1,8.68,0,8,8,0,0,0,5.48-1.74L155.55,40.2a91.57,91.57,0,0,1,15,6.23L173.11,69a8,8,0,0,0,2.64,5.1,74.11,74.11,0,0,1,6.14,6.14,8,8,0,0,0,5.1,2.64l22.58,2.51a91.32,91.32,0,0,1,6.23,15l-14.19,17.74A8,8,0,0,0,199.87,123.66Z" />
      </svg>
      Settings
    </UiButton>

    <UiDialog v-model:open="open" class="bg-card border-border">
      <UiDialogHeader>
        <UiDialogTitle class="font-mono text-primary">
          MQTT Server Settings
        </UiDialogTitle>
        <UiDialogDescription class="font-mono text-sm text-muted-foreground">
          Configure your MQTT broker connection. Changes will reconnect the client.
        </UiDialogDescription>
      </UiDialogHeader>
      <div class="space-y-4 py-4">
        <div class="space-y-2">
          <UiLabel for="broker-url" class="font-mono text-sm">
            Broker URL
          </UiLabel>
          <UiInput
            id="broker-url"
            v-model="brokerUrl"
            placeholder="wss://test.mosquitto.org"
            class="font-mono text-sm"
          />
          <p class="text-xs text-muted-foreground font-mono">
            WebSocket URL (wss:// or ws://)
          </p>
        </div>
        <div class="space-y-2">
          <UiLabel for="port" class="font-mono text-sm">
            Port
          </UiLabel>
          <UiInput
            id="port"
            v-model="port"
            type="number"
            placeholder="8081"
            class="font-mono text-sm"
          />
        </div>
        <div class="space-y-2">
          <UiLabel for="topic-prefix" class="font-mono text-sm">
            Topic Prefix
          </UiLabel>
          <UiInput
            id="topic-prefix"
            v-model="topicPrefix"
            placeholder="spark-chat-room"
            class="font-mono text-sm"
          />
          <p class="text-xs text-muted-foreground font-mono">
            Used for private channels (e.g., "my-private-room")
          </p>
        </div>
      </div>
      <div class="flex justify-end gap-2">
        <UiButton
          variant="outline"
          class="font-mono text-xs"
          @click="open = false"
        >
          Cancel
        </UiButton>
        <UiButton
          class="bg-accent hover:bg-accent/90 text-accent-foreground font-mono text-xs"
          @click="handleSave"
        >
          Save & Reconnect
        </UiButton>
      </div>
    </UiDialog>
  </div>
</template>

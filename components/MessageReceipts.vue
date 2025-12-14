<script setup lang="ts">
import type { MessageReceipt } from '~/types'

interface Props {
  receipts: MessageReceipt[]
  totalPeers: number
}

const props = defineProps<Props>()

const decryptedCount = computed(() =>
  props.receipts.filter(r => r.status === 'decrypted').length,
)

const receivedCount = computed(() =>
  props.receipts.filter(r => r.status === 'received').length,
)

const decrypted = computed(() =>
  props.receipts.filter(r => r.status === 'decrypted'),
)

const received = computed(() =>
  props.receipts.filter(r => r.status === 'received'),
)

const iconType = computed(() => {
  if (decryptedCount.value === props.totalPeers) {
    return 'success'
  } else if (decryptedCount.value > 0 || receivedCount.value > 0) {
    return 'partial'
  }
  return 'waiting'
})
</script>

<template>
  <UiTooltip v-if="totalPeers > 0" side="top">
    <template #trigger>
      <button class="ml-2 inline-flex items-center gap-1">
        <!-- Success icon (green check) -->
        <svg
          v-if="iconType === 'success'"
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 256 256"
          fill="currentColor"
          class="text-green-400"
        >
          <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm45.66,85.66-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35a8,8,0,0,1,11.32,11.32Z" />
        </svg>
        <!-- Partial icon (yellow check) -->
        <svg
          v-else-if="iconType === 'partial'"
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 256 256"
          fill="currentColor"
          class="text-yellow-400"
        >
          <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm45.66,85.66-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35a8,8,0,0,1,11.32,11.32Z" />
        </svg>
        <!-- Waiting icon (gray clock) -->
        <svg
          v-else
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 256 256"
          fill="currentColor"
          class="text-muted-foreground"
        >
          <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm64-88a8,8,0,0,1-8,8H128a8,8,0,0,1-8-8V72a8,8,0,0,1,16,0v48h48A8,8,0,0,1,192,128Z" />
        </svg>
        <span v-if="totalPeers > 0" class="text-xs font-mono text-muted-foreground">
          {{ decryptedCount }}/{{ totalPeers }}
        </span>
      </button>
    </template>
    <div class="space-y-2 max-w-xs">
      <p v-if="receipts.length === 0" class="text-xs">
        Waiting for delivery confirmations...
      </p>
      <template v-else>
        <div v-if="decrypted.length > 0">
          <p class="text-xs font-bold text-green-400 mb-1">
            Decrypted by {{ decrypted.length }}:
          </p>
          <p class="text-xs text-muted-foreground">
            {{ decrypted.map(r => r.username).join(', ') }}
          </p>
        </div>
        <div v-if="received.length > 0">
          <p class="text-xs font-bold text-yellow-400 mb-1">
            Received by {{ received.length }}:
          </p>
          <p class="text-xs text-muted-foreground">
            {{ received.map(r => r.username).join(', ') }}
          </p>
        </div>
        <p
          v-if="decrypted.length + received.length < totalPeers"
          class="text-xs text-muted-foreground"
        >
          Waiting for {{ totalPeers - decrypted.length - received.length }} peer(s)
        </p>
      </template>
    </div>
  </UiTooltip>
</template>

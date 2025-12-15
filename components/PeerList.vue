<script setup lang="ts">
import type { PeerStatus } from '~/types'
import { cn } from '~/utils/cn'

interface Props {
  peers: Map<string, PeerStatus>
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
})

const emit = defineEmits<{
  requestKeys: []
}>()

const peerArray = computed(() =>
  Array.from(props.peers.values()).sort((a, b) => {
    if (a.hasPublicKey !== b.hasPublicKey) {
      return a.hasPublicKey ? -1 : 1
    }
    return a.username.localeCompare(b.username)
  }),
)

const peersWithKeys = computed(() => peerArray.value.filter(p => p.hasPublicKey).length)
const peersWithoutKeys = computed(() => peerArray.value.filter(p => !p.hasPublicKey).length)

function handleRequestKeys() {
  emit('requestKeys')
}
</script>

<template>
  <UiCard class="bg-card border-border p-4 space-y-3">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <h3 class="font-mono text-sm font-bold text-primary uppercase tracking-wide">
          Peers
        </h3>
        <UiBadge variant="outline" class="font-mono text-xs">
          {{ peerArray.length }} total
        </UiBadge>
      </div>
      <UiButton
        :disabled="disabled"
        size="sm"
        variant="outline"
        class="font-mono text-xs"
        @click="handleRequestKeys"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 256 256"
          fill="currentColor"
          class="mr-1.5"
        >
          <path d="M240,56v48a8,8,0,0,1-8,8H184a8,8,0,0,1,0-16H211.4L184.81,71.64a88,88,0,1,0,1.83,126.21,8,8,0,0,1,11,11.63A104,104,0,1,1,224,56Z" />
        </svg>
        Request Keys
      </UiButton>
    </div>

    <div class="flex gap-2 text-xs font-mono">
      <UiBadge class="bg-green-500/20 text-green-400 border-green-500/30">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 256 256"
          fill="currentColor"
          class="mr-1"
        >
          <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm45.66,85.66-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35a8,8,0,0,1,11.32,11.32Z" />
        </svg>
        {{ peersWithKeys }} secured
      </UiBadge>
      <UiBadge class="bg-red-500/20 text-red-400 border-red-500/30">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 256 256"
          fill="currentColor"
          class="mr-1"
        >
          <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm37.66,130.34a8,8,0,0,1-11.32,11.32L128,139.31l-26.34,26.35a8,8,0,0,1-11.32-11.32L116.69,128,90.34,101.66a8,8,0,0,1,11.32-11.32L128,116.69l26.34-26.35a8,8,0,0,1,11.32,11.32L139.31,128Z" />
        </svg>
        {{ peersWithoutKeys }} unsecured
      </UiBadge>
    </div>

    <UiScrollArea class="h-32">
      <div class="space-y-1.5">
        <p
          v-if="peerArray.length === 0"
          class="text-xs text-muted-foreground font-mono text-center py-4"
        >
          No peers detected yet
        </p>
        <TransitionGroup v-else name="slide-x">
          <div
            v-for="peer in peerArray"
            :key="peer.username"
            class="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50 transition-colors"
          >
            <span class="text-sm font-mono text-foreground truncate">
              {{ peer.username }}
            </span>
            <svg
              v-if="peer.hasPublicKey"
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 256 256"
              fill="currentColor"
              class="text-green-400 flex-shrink-0"
            >
              <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm45.66,85.66-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35a8,8,0,0,1,11.32,11.32Z" />
            </svg>
            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 256 256"
              fill="currentColor"
              class="text-red-400 flex-shrink-0"
            >
              <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm37.66,130.34a8,8,0,0,1-11.32,11.32L128,139.31l-26.34,26.35a8,8,0,0,1-11.32-11.32L116.69,128,90.34,101.66a8,8,0,0,1,11.32-11.32L128,116.69l26.34-26.35a8,8,0,0,1,11.32,11.32L139.31,128Z" />
            </svg>
          </div>
        </TransitionGroup>
      </div>
    </UiScrollArea>
  </UiCard>
</template>

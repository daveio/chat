<script setup lang="ts">
import { cn } from '~/utils/cn'

interface Props {
  class?: string
  side?: 'top' | 'right' | 'bottom' | 'left'
  sideOffset?: number
}

const props = withDefaults(defineProps<Props>(), {
  side: 'top',
  sideOffset: 4,
})

const isVisible = ref(false)
const triggerRef = ref<HTMLElement>()
const contentRef = ref<HTMLElement>()
const position = ref({ top: 0, left: 0 })

function show() {
  isVisible.value = true
  nextTick(() => {
    updatePosition()
  })
}

function hide() {
  isVisible.value = false
}

function updatePosition() {
  if (!triggerRef.value || !contentRef.value) return

  const triggerRect = triggerRef.value.getBoundingClientRect()
  const contentRect = contentRef.value.getBoundingClientRect()

  let top = 0
  let left = 0

  switch (props.side) {
    case 'top':
      top = triggerRect.top - contentRect.height - props.sideOffset
      left = triggerRect.left + (triggerRect.width - contentRect.width) / 2
      break
    case 'bottom':
      top = triggerRect.bottom + props.sideOffset
      left = triggerRect.left + (triggerRect.width - contentRect.width) / 2
      break
    case 'left':
      top = triggerRect.top + (triggerRect.height - contentRect.height) / 2
      left = triggerRect.left - contentRect.width - props.sideOffset
      break
    case 'right':
      top = triggerRect.top + (triggerRect.height - contentRect.height) / 2
      left = triggerRect.right + props.sideOffset
      break
  }

  // Keep tooltip within viewport
  const padding = 8
  left = Math.max(padding, Math.min(left, window.innerWidth - contentRect.width - padding))
  top = Math.max(padding, Math.min(top, window.innerHeight - contentRect.height - padding))

  position.value = { top, left }
}

const contentClass = computed(() =>
  cn(
    'bg-primary text-primary-foreground z-50 w-fit rounded-md px-3 py-1.5 text-xs text-balance',
    props.class,
  ),
)
</script>

<template>
  <div class="inline-block">
    <div
      ref="triggerRef"
      @mouseenter="show"
      @mouseleave="hide"
      @focus="show"
      @blur="hide"
    >
      <slot name="trigger" />
    </div>
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="isVisible"
          ref="contentRef"
          :class="contentClass"
          :style="{ position: 'fixed', top: `${position.top}px`, left: `${position.left}px` }"
          data-slot="tooltip-content"
        >
          <slot />
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

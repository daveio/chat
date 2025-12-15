<script setup lang="ts">
import { cn } from '~/utils/cn'

interface Props {
  class?: string
}

const props = defineProps<Props>()

const viewportRef = ref<HTMLDivElement>()

const computedClass = computed(() => cn('relative overflow-hidden', props.class))

defineExpose({ viewportRef })
</script>

<template>
  <div :class="computedClass" data-slot="scroll-area">
    <div
      ref="viewportRef"
      class="size-full overflow-auto rounded-[inherit] focus-visible:ring-ring/50 transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:outline-1"
      data-slot="scroll-area-viewport"
    >
      <slot />
    </div>
  </div>
</template>

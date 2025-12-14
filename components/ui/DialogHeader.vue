<script setup lang="ts">
import { cn } from '~/utils/cn'

interface Props {
  class?: string
}

const props = defineProps<Props>()

const computedClass = computed(() =>
  cn('flex flex-col gap-2 text-center sm:text-left', props.class),
)
</script>

<template>
  <div :class="computedClass" data-slot="dialog-header">
    <slot />
  </div>
</template>

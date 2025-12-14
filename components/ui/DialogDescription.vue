<script setup lang="ts">
import { cn } from '~/utils/cn'

interface Props {
  class?: string
}

const props = defineProps<Props>()

const computedClass = computed(() =>
  cn('text-muted-foreground text-sm', props.class),
)
</script>

<template>
  <p :class="computedClass" data-slot="dialog-description">
    <slot />
  </p>
</template>

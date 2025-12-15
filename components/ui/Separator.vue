<script setup lang="ts">
import { cn } from '~/utils/cn'

interface Props {
  orientation?: 'horizontal' | 'vertical'
  decorative?: boolean
  class?: string
}

const props = withDefaults(defineProps<Props>(), {
  orientation: 'horizontal',
  decorative: true,
})

const computedClass = computed(() =>
  cn(
    'bg-border shrink-0',
    props.orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
    props.class,
  ),
)
</script>

<template>
  <div
    :role="decorative ? 'none' : 'separator'"
    :aria-orientation="decorative ? undefined : orientation"
    :data-orientation="orientation"
    :class="computedClass"
    data-slot="separator-root"
  />
</template>

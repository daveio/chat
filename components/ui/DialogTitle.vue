<script setup lang="ts">
import { cn } from '~/utils/cn'

interface Props {
  class?: string
}

const props = defineProps<Props>()

const computedClass = computed(() =>
  cn('text-lg leading-none font-semibold', props.class),
)
</script>

<template>
  <h2 :class="computedClass" data-slot="dialog-title">
    <slot />
  </h2>
</template>

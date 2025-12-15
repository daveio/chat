<script setup lang="ts">
import { cn } from '~/utils/cn'

interface Props {
  for?: string
  class?: string
}

const props = defineProps<Props>()

const computedClass = computed(() =>
  cn(
    'flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
    props.class,
  ),
)
</script>

<template>
  <label :for="for" :class="computedClass" data-slot="label">
    <slot />
  </label>
</template>

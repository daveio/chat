<script setup lang="ts">
import { cn } from '~/utils/cn'

interface Props {
  class?: string
}

const props = defineProps<Props>()

const computedClass = computed(() =>
  cn(
    'bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm',
    props.class,
  ),
)
</script>

<template>
  <div :class="computedClass" data-slot="card">
    <slot />
  </div>
</template>

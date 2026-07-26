<script setup lang="ts">
defineProps<{
  eyebrow: string;
  title: string;
  description?: string;
}>();
</script>

<template>
  <header class="page-intro">
    <div class="page-intro-copy">
      <p class="eyebrow">{{ eyebrow }}</p>
      <h2>{{ title }}</h2>
      <p v-if="description" class="page-intro-description">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="page-intro-actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<template>
  <div class="page-header">
    <div>
      <p class="eyebrow">{{ eyebrow }}</p>
      <h1>{{ title }}</h1>
      <p class="muted">{{ desc }}</p>
    </div>
    <slot />
  </div>
</template>

<script setup>
defineProps({
  eyebrow: String,
  title: String,
  desc: String,
})
</script>

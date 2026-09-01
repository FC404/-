<template>
  <div class="panel-header">
    <h2>{{ title }}</h2>
    <slot />
  </div>
</template>

<script setup>
defineProps({
  title: String,
})
</script>

<template>
  <aside v-if="assistantFeedback" class="assistant-toast" role="status" aria-live="polite">
    <div>
      <strong>{{ assistantFeedback.title }}</strong>
      <p>{{ assistantFeedback.message }}</p>
    </div>
    <button type="button" aria-label="关闭提示" @click="dismissAssistantFeedback">×</button>
  </aside>
</template>

<script setup>
import { assistantFeedback, dismissAssistantFeedback } from '../services/assistantFeedback'
</script>

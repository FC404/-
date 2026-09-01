<template>
  <div class="user-dialog-mask app-confirm-mask" @click.self="$emit('cancel')">
    <section class="app-confirm-dialog" aria-modal="true" role="alertdialog" aria-labelledby="confirm-dialog-title">
      <div class="dialog-head modal-title-row">
        <div>
          <h3 id="confirm-dialog-title">{{ title }}</h3>
        </div>
        <button class="dialog-close" type="button" aria-label="关闭确认弹窗" @click="$emit('cancel')">×</button>
      </div>
      <p class="app-confirm-message">{{ message }}</p>
      <div class="dialog-actions app-confirm-actions">
        <button
          class="primary-btn"
          :class="{ 'danger-confirm-btn': confirmText.includes('删除') }"
          type="button"
          @click="$emit('confirm')"
        >
          {{ confirmText }}
        </button>
      </div>
    </section>
  </div>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  confirmText: {
    type: String,
    default: '确认',
  },
})

defineEmits(['cancel', 'confirm'])
</script>

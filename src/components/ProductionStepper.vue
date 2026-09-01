<template>
  <el-steps class="production-stepper element-production-stepper" :active="stages.length" align-center>
    <el-step
      v-for="(stage, index) in stages"
      :key="stage.label"
      :class="[{ 'is-interactive': interactive }, `tone-${stage.tone}`]"
      :status="stepStatus(stage)"
      :title="stage.fullLabel"
      @click="selectStage(stage)"
    >
      <template #icon>{{ index + 1 }}</template>
    </el-step>
  </el-steps>
</template>

<script setup>
const props = defineProps({
  stages: {
    type: Array,
    default: () => [],
  },
  interactive: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['stage-select'])

function stepStatus(stage) {
  if (stage.tone === 'complete') return 'success'
  if (stage.tone === 'danger') return 'error'
  if (stage.tone === 'progress') return 'process'
  if (stage.value === '异常') return 'error'
  return 'wait'
}

function selectStage(stage) {
  if (!props.interactive) return
  emit('stage-select', stage)
}
</script>

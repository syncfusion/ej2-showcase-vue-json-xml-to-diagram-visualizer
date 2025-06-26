<template>
  <div 
    ref="spinnerRef" 
    :id="target"
    class="e-spinner-overlay"
    :style="{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      zIndex: 1000,
      display: isVisible ? 'block' : 'none'
    }"
  />
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { createSpinner, showSpinner, hideSpinner } from '@syncfusion/ej2-popups'

// Props interface
interface SpinnerProps {
  isVisible: boolean
  target?: string
}

// Define props with defaults
const props = withDefaults(defineProps<SpinnerProps>(), {
  target: 'spinner-container'
})

// Template refs
const spinnerRef = ref<HTMLDivElement>()
const isInitialized = ref(false)

// Initialize spinner on component mount
onMounted(() => {
  if (spinnerRef.value && !isInitialized.value) {
    // Initialize spinner only once
    createSpinner({
      target: spinnerRef.value,
    })
    isInitialized.value = true
  }
})

// Watch for visibility changes
watch(() => props.isVisible, (newVisible) => {
  if (spinnerRef.value && isInitialized.value) {
    if (newVisible) {
      showSpinner(spinnerRef.value)
    } else {
      hideSpinner(spinnerRef.value)
    }
  }
})
</script>
<template>
  <div
    ref="splitterRef"
    class="splitter"
    @mousedown="handleMouseDown"
    @keydown="handleKeyDown"
    role="separator"
    aria-orientation="vertical"
    aria-label="Resize panels"
    tabindex="0"
  />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

// Props interface
interface ResizerProps {
  onResize?: (leftWidth: number) => void
}

// Define props
const props = defineProps<ResizerProps>()

// Constants for better maintainability
const RESIZER_CONFIG = {
  RIGHT_PANEL_MIN_PERCENTAGE: 0.5, // 50% minimum width for right panel
  THROTTLE_DELAY: 16, // ~60fps for smooth resizing
  CURSOR_RESIZE: 'col-resize',
  CURSOR_DEFAULT: ''
} as const

const DOM_SELECTORS = {
  MAIN_GRID: '.main-grid',
  LEFT_PANEL: '.left-panel',
  SPLITTER: 'splitter'
} as const

// Template refs and reactive state
const splitterRef = ref<HTMLDivElement>()
const isDragging = ref(false)
const throttleTimeout = ref<number | null>(null)

// Get main grid element with error handling
const getMainGridElement = (): HTMLElement | null => {
  const element = document.querySelector(DOM_SELECTORS.MAIN_GRID) as HTMLElement
  if (!element) {
    console.warn('Main grid element not found')
    return null
  }
  return element
}

// Get left panel element with error handling
const getLeftPanelElement = (): HTMLElement | null => {
  const element = document.querySelector(DOM_SELECTORS.LEFT_PANEL) as HTMLElement
  if (!element) {
    console.warn('Left panel element not found')
    return null
  }
  return element
}

// Calculate optimal left panel width based on mouse position
const calculateLeftPanelWidth = (mouseX: number, containerWidth: number): number => {
  const rightPanelMinWidth = containerWidth * RESIZER_CONFIG.RIGHT_PANEL_MIN_PERCENTAGE
  const maxLeftWidth = containerWidth - rightPanelMinWidth
  
  // Ensure left panel doesn't exceed maximum allowed width
  return Math.min(Math.max(mouseX, 0), maxLeftWidth)
}

// Update left panel width in DOM
const updateLeftPanelWidth = (width: number): void => {
  const leftPanel = getLeftPanelElement()
  if (leftPanel) {
    leftPanel.style.width = `${width}px`
  }
}

// Set cursor style for resize operation
const setCursorStyle = (cursorType: string): void => {
  document.body.style.cursor = cursorType
}

// Handle mouse down event to start dragging
const handleMouseDown = (event: MouseEvent) => {
  isDragging.value = true
  setCursorStyle(RESIZER_CONFIG.CURSOR_RESIZE)
  event.preventDefault()
}

// Handle mouse move event with throttling for performance
const handleMouseMove = (event: MouseEvent) => {
  if (!isDragging.value) return

  // Throttle mouse move events for better performance
  if (throttleTimeout.value) return

  throttleTimeout.value = setTimeout(() => {
    const mainGrid = getMainGridElement()
    if (!mainGrid) return

    const containerWidth = mainGrid.offsetWidth
    const calculatedLeftWidth = calculateLeftPanelWidth(event.clientX, containerWidth)
    
    // Update DOM and notify parent component
    updateLeftPanelWidth(calculatedLeftWidth)
    
    if (props.onResize) {
      props.onResize(calculatedLeftWidth)
    }

    throttleTimeout.value = null
  }, RESIZER_CONFIG.THROTTLE_DELAY)
}

// Handle mouse up event to stop dragging
const handleMouseUp = () => {
  if (isDragging.value) {
    isDragging.value = false
    setCursorStyle(RESIZER_CONFIG.CURSOR_DEFAULT)
    
    // Clear any pending throttled updates
    if (throttleTimeout.value) {
      clearTimeout(throttleTimeout.value)
      throttleTimeout.value = null
    }
  }
}

// Handle keyboard events for accessibility
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    // Could implement keyboard-based resizing here
  }
}

// Setup global event listeners on mount
onMounted(() => {
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
})

// Cleanup on unmount
onUnmounted(() => {
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
  
  // Cleanup throttle timeout on unmount
  if (throttleTimeout.value) {
    clearTimeout(throttleTimeout.value)
  }
  
  // Reset cursor style on cleanup
  setCursorStyle(RESIZER_CONFIG.CURSOR_DEFAULT)
})
</script>
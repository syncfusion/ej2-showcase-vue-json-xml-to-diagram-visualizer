<template>
  <ejs-dialog
    :width="DIALOG_CONFIG.WIDTH"
    :header="DIALOG_CONFIG.HEADER"
    :showCloseIcon="true"
    :isModal="true"
    :visible="isVisible"
    :animationSettings="{ effect: DIALOG_CONFIG.ANIMATION_EFFECT }"
    :closeOnEscape="true"
    :cssClass="DIALOG_CONFIG.CSS_CLASS"
    target="body"
    @close="handleClose"
    @overlayClick="handleClose"
  >
    <div :style="DIALOG_STYLES.container">
      <!-- Content Section -->
      <div :style="DIALOG_STYLES.section">
        <label :style="DIALOG_STYLES.label">Content</label>
        <div class="dialog-box" :style="DIALOG_STYLES.dialogBox">
          <div :style="DIALOG_STYLES.codeContent">
            <!-- JSON Content with Syntax Highlighting -->
            <template v-if="jsonLines.length === 0">
              <span :style="{ color: themeSettings.popupValueColor }">
                "{{ nodeContent.trim() }}"
              </span>
            </template>
            <template v-else>
              <div>{</div>
              <div
                v-for="({ key, value, hasComma }, index) in jsonLines"
                :key="`${key}-${index}`"
                :style="DIALOG_STYLES.jsonLine"
              >
                <span :style="{ 
                  color: themeSettings.popupKeyColor, 
                  ...DIALOG_STYLES.jsonKey
                }">
                  {{ key }}
                </span>
                <span :style="{ marginRight: '3px' }">:</span>
                <span :style="{ color: themeSettings.popupValueColor }">
                  {{ value }}
                </span>
                <span v-if="hasComma">,</span>
              </div>
              <div>}</div>
            </template>
          </div>
          <!-- Copy Button for Content -->
          <button
            :class="COPY_BUTTON_CLASSES.CONTENT"
            type="button"
            @click="handleCopyContent"
            :style="DIALOG_STYLES.copyButton"
            :title="copyStates.content ? 'Copied!' : 'Copy'"
          >
            <span
              :class="copyStates.content ? ICON_CLASSES.CHECK : ICON_CLASSES.COPY"
              :style="DIALOG_STYLES.copyIcon"
            />
          </button>
        </div>
      </div>

      <!-- Path Section -->
      <div>
        <label :style="DIALOG_STYLES.label">JSON Path</label>
        <div class="dialog-box" :style="DIALOG_STYLES.dialogBox">
          <div :style="DIALOG_STYLES.codeContent">
            {{ formattedPath }}
          </div>
          <!-- Copy Button for Path -->
          <button
            :class="COPY_BUTTON_CLASSES.PATH"
            type="button"
            @click="handleCopyPath"
            :style="DIALOG_STYLES.copyButton"
            :title="copyStates.path ? 'Copied!' : 'Copy'"
          >
            <span
              :class="copyStates.path ? ICON_CLASSES.CHECK : ICON_CLASSES.COPY"
              :style="DIALOG_STYLES.copyIcon"
            />
          </button>
        </div>
      </div>
    </div>
  </ejs-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted, nextTick } from 'vue'
import { DialogComponent as EjsDialog } from '@syncfusion/ej2-vue-popups'
import { useTheme } from '../../composables/useTheme'

// Type definitions for better type safety
interface NodeDetailsDialogProps {
  isVisible: boolean
  nodeContent: string
  nodePath: string
}

interface JsonLine {
  key: string
  value: string
  hasComma: boolean
}

interface CopyStates {
  content: boolean
  path: boolean
}

// Define emits
const emit = defineEmits<{
  close: []
}>()

// Define props
const props = defineProps<NodeDetailsDialogProps>()

// Use theme composable
const { themeSettings } = useTheme()

// Constants for better maintainability
const DIALOG_CONFIG = {
  WIDTH: '400px',
  HEADER: 'Node Details',
  CSS_CLASS: 'node-details-dialog',
  ANIMATION_EFFECT: 'Zoom' as const,
  COPY_FEEDBACK_DURATION: 1500
} as const

const COPY_BUTTON_CLASSES = {
  CONTENT: 'copy-content-btn',
  PATH: 'copy-path-btn'
} as const

const ICON_CLASSES = {
  COPY: 'e-icons e-copy',
  CHECK: 'e-icons e-check'
} as const

const DIALOG_STYLES = {
  container: { fontFamily: 'Segoe UI, sans-serif', fontSize: '14px' },
  section: { marginBottom: '15px' },
  label: { fontWeight: 500, display: 'block', marginBottom: '5px' },
  dialogBox: { borderRadius: '5px', position: 'relative' as const },
  codeContent: { 
    padding: '10px', 
    overflowX: 'auto' as const, 
    fontFamily: 'Consolas', 
    fontSize: '14px' 
  },
  jsonLine: { lineHeight: '16px' },
  jsonKey: { fontWeight: 550, marginLeft: '14px' },
  copyButton: {
    position: 'absolute' as const,
    top: '5px',
    right: '5px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '4px'
  },
  copyIcon: { color: '#6C757D' }
} as const

// Reactive state
const copyStates = ref<CopyStates>({ content: false, path: false })
const timeoutRefs = ref<{ content?: number; path?: number }>({})

// Parse content lines into formatted JSON key-value pairs
const formatJsonLines = (inputContent: string): JsonLine[] => {
  if (!inputContent?.trim()) return []

  return inputContent.split('\n').reduce<JsonLine[]>((acc, currentLine, lineIndex, arr) => {
    const colonIndex = currentLine.indexOf(':')
    if (colonIndex === -1) return acc

    const extractedKey = currentLine.slice(0, colonIndex).trim()
    let extractedValue = currentLine.slice(colonIndex + 1).trim()
    let processedValue: string

    // Format value based on type (boolean, number, or string)
    if (/^(true|false)$/i.test(extractedValue)) {
      processedValue = extractedValue.toLowerCase()
    } else if (!isNaN(parseFloat(extractedValue))) {
      processedValue = extractedValue
    } else {
      processedValue = `"${extractedValue.replace(/^"(.*)"$/, '$1')}"`
    }

    acc.push({
      key: `"${extractedKey}"`,
      value: processedValue,
      hasComma: lineIndex !== arr.length - 1,
    })
    return acc
  }, [])
}

// Add curly braces around root path for better display
const formatRootPath = (pathInput: string): string => {
  return pathInput.startsWith('Root') ? `{Root}${pathInput.slice(4)}` : pathInput
}

// Computed values
const jsonLines = computed(() => formatJsonLines(props.nodeContent))
const formattedPath = computed(() => formatRootPath(props.nodePath.trim()))

// Handle copy operations with visual feedback
const handleCopy = async (text: string, type: keyof CopyStates) => {
  try {
    await navigator.clipboard.writeText(text)
    
    // Clear existing timeout for this type
    if (timeoutRefs.value[type]) {
      clearTimeout(timeoutRefs.value[type])
    }
    
    // Set copy success state
    copyStates.value = { ...copyStates.value, [type]: true }

    // Reset state after delay
    timeoutRefs.value[type] = setTimeout(() => {
      copyStates.value = { ...copyStates.value, [type]: false }
      delete timeoutRefs.value[type]
    }, DIALOG_CONFIG.COPY_FEEDBACK_DURATION)
    
  } catch (error) {
    console.error('Failed to copy text to clipboard:', error)
  }
}

// Copy formatted JSON content to clipboard
const handleCopyContent = () => {
  if (!jsonLines.value.length) {
    handleCopy(`"${props.nodeContent.trim()}"`, 'content')
    return
  }

  const formattedJson = '{\n' +
    jsonLines.value.map(({ key, value, hasComma }) => 
      `    ${key}: ${value}${hasComma ? ',' : ''}`
    ).join('\n') +
    '\n}'
  
  handleCopy(formattedJson, 'content')
}

// Copy formatted path to clipboard
const handleCopyPath = () => {
  handleCopy(formattedPath.value, 'path')
}

// Handle dialog close
const handleClose = () => {
  emit('close')
}

// Reset copy states when dialog visibility changes
watch(() => props.isVisible, (newVisible) => {
  if (!newVisible) {
    nextTick(() => {
      copyStates.value = { content: false, path: false }
      Object.values(timeoutRefs.value).forEach(timeout => {
        if (timeout) clearTimeout(timeout)
      })
      timeoutRefs.value = {}
    })
  }
})

// Cleanup timeouts on unmount
onUnmounted(() => {
  Object.values(timeoutRefs.value).forEach(timeout => {
    if (timeout) clearTimeout(timeout)
  })
})
</script>
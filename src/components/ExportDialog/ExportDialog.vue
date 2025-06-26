<template>
  <ejs-dialog
    ref="dialogRef"
    header="Export Options"
    :showCloseIcon="true"
    :isModal="true"
    :visible="isVisible"
    :width="DIALOG_WIDTH"
    :buttons="dialogButtons"
    :closeOnEscape="true"
    @overlayClick="handleOverlayClick"
  >
    <div :style="DIALOG_STYLES.container">
      <!-- File Name Section -->
      <div>
        <p>File Name</p>
        <ejs-textbox
          placeholder="Enter file name"
          :value="fileName"
          :floatLabelType="'Never'"
          @input="handleFileNameChange"
        />
      </div>

      <!-- Format Selection Section -->
      <div :style="DIALOG_STYLES.formatSection">
        <p>Format</p>
        <div>
          <div
            v-for="(format, index) in EXPORT_FORMATS"
            :key="format"
            :style="DIALOG_STYLES.radioButton"
          >
            <ejs-radiobutton
              :label="format"
              name="exportMode"
              :checked="selectedFormat === format"
              @change="() => handleFormatChange(format)"
            />
          </div>
        </div>
      </div>
    </div>
  </ejs-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { DialogComponent as EjsDialog } from '@syncfusion/ej2-vue-popups'
import { TextBoxComponent as EjsTextbox } from '@syncfusion/ej2-vue-inputs'
import { RadioButtonComponent as EjsRadiobutton } from '@syncfusion/ej2-vue-buttons'

// Type definitions for better type safety
interface ExportDialogProps {
  isVisible: boolean
}

// Define emits
const emit = defineEmits<{
  close: []
  export: [fileName: string, format: string]
}>()

// Define props
const props = defineProps<ExportDialogProps>()

// Constants for better maintainability
const EXPORT_FORMATS = ['PNG', 'JPG', 'SVG'] as const
const DEFAULT_FILE_NAME = 'Diagram'
const DIALOG_WIDTH = '300px'

const DIALOG_STYLES = {
  container: { marginTop: '-20px' },
  formatSection: { marginTop: '20px' },
  radioButton: { marginRight: '16px', display: 'inline-block' }
}

// Reactive state for dialog inputs
const fileName = ref<string>(DEFAULT_FILE_NAME)
const selectedFormat = ref<string>('PNG')
const dialogRef = ref<InstanceType<typeof EjsDialog>>()

// Handle export button click with validation
const handleExport = () => {
  // Sanitize and validate file name input
  const sanitizedFileName = fileName.value.trim() || 'diagram'
  const finalFileName = sanitizedFileName.replace(/[^a-zA-Z0-9_-]/g, '_')
  
  emit('export', finalFileName, selectedFormat.value)
  emit('close')
}

// Handle dialog overlay click to close dialog
const handleOverlayClick = () => {
  emit('close')
}

// Handle file name input changes
const handleFileNameChange = (args: any) => {
  fileName.value = args.value
}

// Handle format selection changes
const handleFormatChange = (format: string) => {
  selectedFormat.value = format
}

// Configure dialog action buttons
const dialogButtons = computed(() => [
  {
    click: handleExport,
    buttonModel: { content: 'Export', isPrimary: true },
  },
])
</script>
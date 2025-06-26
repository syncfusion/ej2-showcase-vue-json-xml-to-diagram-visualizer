<template>
  <div class="toolbar-container">
    <!-- Toolbar with zoom control buttons -->
    <div class="toolbar-wrapper">
      <ejs-toolbar
        overflowMode="Extended"
        @clicked="handleToolbarClick"
      >
        <e-items>
          <e-item
            v-for="(item, index) in ZOOM_TOOLBAR_ITEMS"
            :key="index"
            :prefixIcon="item.prefixIcon"
            :tooltipText="item.tooltipText"
            :id="item.id"
            :cssClass="item.cssClass"
          />
        </e-items>
      </ejs-toolbar>
    </div>

    <!-- Search functionality container -->
    <div class="search-bar-container">
      <ejs-textbox
        ref="searchRef"
        placeholder="Search Node"
        cssClass="toolbar-search"
        @input="handleSearchInput"
        @created="handleSearchCreated"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { 
  ToolbarComponent as EjsToolbar, 
  ItemsDirective as EItems, 
  ItemDirective as EItem 
} from '@syncfusion/ej2-vue-navigations'
import { TextBoxComponent as EjsTextbox } from '@syncfusion/ej2-vue-inputs'
import type { ClickEventArgs } from '@syncfusion/ej2-navigations'

// Type definitions for better type safety
interface ToolbarProps {}

interface SearchCounter {
  current: number
  total: number
}

// Define emits
const emit = defineEmits<{
  toolClick: [action: string]
  search: [query: string]
}>()

// Define props
const props = defineProps<ToolbarProps>()

// Constants for better maintainability
const ZOOM_TOOLBAR_ITEMS = [
  {
    prefixIcon: "e-icons e-reset",
    tooltipText: "Reset Zoom",
    id: "reset",
    cssClass: "e-flat toolbar-btn",
  },
  {
    prefixIcon: "e-icons e-zoom-to-fit",
    tooltipText: "Fit To Page",
    id: "fitToPage",
    cssClass: "e-flat toolbar-btn",
  },
  {
    prefixIcon: "e-icons e-zoom-in",
    tooltipText: "Zoom In",
    id: "zoomIn",
    cssClass: "e-flat toolbar-btn",
  },
  {
    prefixIcon: "e-icons e-zoom-out",
    tooltipText: "Zoom Out",
    id: "zoomOut",
    cssClass: "e-flat toolbar-btn",
  },
] as const

// Template refs and reactive state
const searchRef = ref<InstanceType<typeof EjsTextbox>>()
const searchCounter = ref<SearchCounter>({ current: 0, total: 0 })
const showCounter = ref<boolean>(false)

// Handle toolbar button clicks and route to appropriate action
const handleToolbarClick = (args: ClickEventArgs) => {
  if (args.item && args.item.id) {
    emit('toolClick', args.item.id)
  }
}

// Handle search input changes and update counter visibility
const handleSearchInput = (args: any) => {
  const searchQuery = args.value?.trim() || ''
  showCounter.value = searchQuery.length > 0
  emit('search', searchQuery)
}

// Clear search input and reset all search-related state
const clearSearchInput = () => {
  if (searchRef.value) {
    searchRef.value.ej2Instances.value = ''
    showCounter.value = false
    searchCounter.value = { current: 0, total: 0 }
    emit('search', '') // Trigger search with empty string to reset highlights
  }
}

// Configure search textbox after creation with icon and counter
const handleSearchCreated = () => {
  setTimeout(() => {
    const searchContainer = document.querySelector('.search-bar-container .e-input-group')
    
    if (searchContainer) {
      // Add search icon if not already present
      if (!searchContainer.querySelector('.e-search')) {
        // Method 1: Using addIcon (similar to JS version)
        if (searchRef.value) {
          searchRef.value.addIcon('prepend', 'e-icons e-search search-icon')
        }
      }

      // Add counter element if not already present
      if (!searchContainer.querySelector('.search-counter')) {
        const searchResultCounter = document.createElement('span')
        searchResultCounter.className = 'e-input-group-icon counter-icon search-counter'
        searchResultCounter.style.fontSize = '.75rem'
        searchResultCounter.style.display = showCounter.value ? 'flex' : 'none'
        searchContainer.appendChild(searchResultCounter)
      }
    }
  }, 100)
}

// Update search counter display when counter values or visibility changes
watch([searchCounter, showCounter], () => {
  const counterElement = document.querySelector('.search-counter') as HTMLElement
  if (counterElement) {
    counterElement.textContent = `${searchCounter.value.current} / ${searchCounter.value.total}`
    counterElement.style.display = showCounter.value ? 'flex' : 'none'
  }
}, { deep: true })

// Function to update search counter from external components
const updateSearchCounter = (current: number, total: number) => {
  searchCounter.value = { current, total }
}

// Expose methods to parent component via window object for global access
onMounted(() => {
  // Attach methods to window for global access
  ;(window as any).updateSearchCounter = updateSearchCounter
  ;(window as any).clearSearchInput = clearSearchInput
})

// Cleanup methods on component unmount
onUnmounted(() => {
  delete (window as any).updateSearchCounter
  delete (window as any).clearSearchInput
})
</script>
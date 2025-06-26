<template>
  <div class="hamburger-menu">
    <ejs-dropdownbutton
      :iconCss="MENU_ICONS.HAMBURGER"
      :cssClass="MENU_STYLES.HIDE_CARET"
      :items="menuItems"
      @select="handleMenuSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { DropDownButtonComponent as EjsDropdownbutton } from '@syncfusion/ej2-vue-splitbuttons'
import type { MenuEventArgs } from '@syncfusion/ej2-splitbuttons'

// Type definitions
interface HamburgerMenuProps {
  isGraphCollapsed: boolean
}

// Define emits
const emit = defineEmits<{
  exportImage: []
  rotateLayout: []
  collapseGraph: []
}>()

// Define props
const props = defineProps<HamburgerMenuProps>()

// Menu item identifiers
const MENU_IDS = {
  EXPORT_IMAGE: 'exportImage',
  ROTATE_LAYOUT: 'rotateLayout',
  COLLAPSE_GRAPH: 'collapseGraph'
} as const

// Icon CSS classes for menu items
const MENU_ICONS = {
  EXPORT: 'e-icons e-export',
  REFRESH: 'e-icons e-refresh',
  COLLAPSE: 'e-icons e-collapse-2',
  EXPAND: 'e-icons e-expand',
  HAMBURGER: 'e-icons e-menu'
} as const

// CSS classes for styling
const MENU_STYLES = {
  HIDE_CARET: 'e-caret-hide'
} as const

// Base menu items configuration
const baseMenuItems = [
  { 
    text: 'Export as Image', 
    id: MENU_IDS.EXPORT_IMAGE, 
    iconCss: MENU_ICONS.EXPORT 
  },
  { 
    text: 'Rotate Layout', 
    id: MENU_IDS.ROTATE_LAYOUT, 
    iconCss: MENU_ICONS.REFRESH 
  },
  { 
    text: 'Collapse Graph', 
    id: MENU_IDS.COLLAPSE_GRAPH, 
    iconCss: MENU_ICONS.COLLAPSE 
  }
]

// Computed menu items that update based on collapse state
const menuItems = computed(() => {
  return baseMenuItems.map(item => 
    item.id === MENU_IDS.COLLAPSE_GRAPH 
      ? {
          ...item,
          text: props.isGraphCollapsed ? 'Expand Graph' : 'Collapse Graph',
          iconCss: props.isGraphCollapsed ? MENU_ICONS.EXPAND : MENU_ICONS.COLLAPSE
        }
      : item
  )
})

// Handle menu item selection
const handleMenuSelect = (args: MenuEventArgs) => {
  const menuId = args.item.id
  
  switch (menuId) {
    case MENU_IDS.EXPORT_IMAGE:
      emit('exportImage')
      break
    case MENU_IDS.ROTATE_LAYOUT:
      emit('rotateLayout')
      break
    case MENU_IDS.COLLAPSE_GRAPH:
      emit('collapseGraph')
      break
    default:
      console.warn(`Unknown menu item selected: ${menuId}`)
  }
}
</script>
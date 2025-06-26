<template>
  <div :class="NAV_STYLES.NAVBAR">
    <!-- Left side of navbar with logo and main menu buttons -->
    <div :class="NAV_STYLES.NAVBAR_LEFT">
      <!-- Logo and Title Section -->
      <img :src="logoSvg" alt="Logo" :class="NAV_STYLES.NAV_LOGO" />
      <span :class="NAV_STYLES.NAV_TITLE">{{ getNavTitle() }}</span>

      <!-- Main Menu Buttons -->
      <ejs-dropdownbutton
        :items="fileMenuItems"
        @select="handleFileMenuSelect"
      >File</ejs-dropdownbutton>

      <ejs-dropdownbutton
        :items="viewMenuItems"
        @select="handleViewMenuSelect"
      >View</ejs-dropdownbutton>

      <ejs-dropdownbutton
        :items="themeMenuItems"
        @select="handleThemeMenuSelect"
      >Theme</ejs-dropdownbutton>
    </div>

    <!-- Right side of navbar with editor type toggle -->
    <div :class="NAV_STYLES.NAVBAR_RIGHT">
      <ejs-dropdownlist
        width="90px"
        :dataSource="editorTypeData"
        :fields="{ text: 'text', value: 'value' }"
        :value="currentEditorType"
        @change="handleEditorTypeChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { DropDownButtonComponent as EjsDropdownbutton } from '@syncfusion/ej2-vue-splitbuttons'
import { DropDownListComponent as EjsDropdownlist } from '@syncfusion/ej2-vue-dropdowns'
import type { MenuEventArgs } from '@syncfusion/ej2-splitbuttons'
import type { ChangeEventArgs } from '@syncfusion/ej2-dropdowns'
import { useTheme } from '../../composables/useTheme'
import logoSvg from '../../assets/logo.svg'

// Type definitions
export type EditorType = 'json' | 'xml'
export type ThemeType = 'light' | 'dark'

interface NavMenuProps {
  currentEditorType: EditorType
}

// Define emits
const emit = defineEmits<{
  editorTypeChange: [type: EditorType]
  fileAction: [action: string]
  viewOptionToggle: [optionId: string]
  themeChange: [theme: ThemeType]
}>()

// Define props
const props = defineProps<NavMenuProps>()

// Use theme composable
const { theme } = useTheme()

// Menu item identifiers as constants
const MENU_IDS = {
  FILE: {
    IMPORT: 'import',
    EXPORT: 'export'
  },
  VIEW: {
    GRID: 'view-grid',
    COUNT: 'view-count',
    EXPAND_COLLAPSE: 'expand-collapse'
  },
  THEME: {
    LIGHT: 'light',
    DARK: 'dark'
  }
} as const

// Icon CSS classes for menu items
const MENU_ICONS = {
  IMPORT: 'e-icons e-import',
  EXPORT: 'e-icons e-export',
  CHECK: 'e-icons e-check'
} as const

// CSS classes for styling
const NAV_STYLES = {
  NAVBAR: 'navbar',
  NAVBAR_LEFT: 'navbar-left',
  NAVBAR_RIGHT: 'navbar-right',
  NAV_LOGO: 'nav-logo',
  NAV_TITLE: 'nav-title'
} as const

// Default active view options
const DEFAULT_ACTIVE_VIEW_OPTIONS = new Set([
  MENU_IDS.VIEW.GRID,
  MENU_IDS.VIEW.COUNT,
  MENU_IDS.VIEW.EXPAND_COLLAPSE
])

// State management for active view options
const activeViewOptions = ref<Set<string>>(DEFAULT_ACTIVE_VIEW_OPTIONS)

// Create editor type dropdown data configuration
const editorTypeData = computed(() => [
  { text: 'JSON', value: 'json' },
  { text: 'XML', value: 'xml' }
])

// Create file operations menu items configuration
const fileMenuItems = computed(() => [
  { text: 'Import', id: MENU_IDS.FILE.IMPORT, iconCss: MENU_ICONS.IMPORT },
  { text: 'Export', id: MENU_IDS.FILE.EXPORT, iconCss: MENU_ICONS.EXPORT }
])

// Create view options menu items with dynamic check icons
const viewMenuItems = computed(() => [
  { 
    text: 'Show Grid', 
    id: MENU_IDS.VIEW.GRID, 
    iconCss: activeViewOptions.value.has(MENU_IDS.VIEW.GRID) ? MENU_ICONS.CHECK : '' 
  },
  { 
    text: 'Item Count', 
    id: MENU_IDS.VIEW.COUNT, 
    iconCss: activeViewOptions.value.has(MENU_IDS.VIEW.COUNT) ? MENU_ICONS.CHECK : '' 
  },
  { 
    text: 'Show Expand/Collapse', 
    id: MENU_IDS.VIEW.EXPAND_COLLAPSE, 
    iconCss: activeViewOptions.value.has(MENU_IDS.VIEW.EXPAND_COLLAPSE) ? MENU_ICONS.CHECK : '' 
  }
])

// Create theme selector menu items with dynamic check icons
const themeMenuItems = computed(() => [
  { 
    text: 'Light', 
    id: MENU_IDS.THEME.LIGHT, 
    iconCss: theme.value === MENU_IDS.THEME.LIGHT ? MENU_ICONS.CHECK : '' 
  },
  { 
    text: 'Dark', 
    id: MENU_IDS.THEME.DARK, 
    iconCss: theme.value === MENU_IDS.THEME.DARK ? MENU_ICONS.CHECK : '' 
  }
])

// Handle editor type dropdown selection change
const handleEditorTypeChange = (args: ChangeEventArgs) => {
  try {
    if (args?.value) {
      emit('editorTypeChange', args.value as EditorType)
    }
  } catch (error) {
    console.error('Error in handleEditorTypeChange:', error)
  }
}

// Handle file menu item selection
const handleFileMenuSelect = (args: MenuEventArgs) => {
  try {
    const actionId = args?.item?.id
    if (actionId) {
      emit('fileAction', actionId)
    }
  } catch (error) {
    console.error('Error in handleFileMenuSelect:', error)
  }
}

// Toggle view option active state and update UI
const handleViewMenuSelect = (args: MenuEventArgs) => {
  try {
    const optionId = args?.item?.id
    if (!optionId) return

    // Create new Set to trigger re-render with updated state
    const newOptions = new Set(activeViewOptions.value)
    if (newOptions.has(optionId)) {
      newOptions.delete(optionId)
    } else {
      newOptions.add(optionId)
    }
    activeViewOptions.value = newOptions

    emit('viewOptionToggle', optionId)
  } catch (error) {
    console.error('Error in handleViewMenuSelect:', error)
  }
}

// Handle theme selection and update theme state
const handleThemeMenuSelect = (args: MenuEventArgs) => {
  try {
    const selectedTheme = args?.item?.id as ThemeType
    if (selectedTheme && (selectedTheme === 'light' || selectedTheme === 'dark')) {
      emit('themeChange', selectedTheme)
    }
  } catch (error) {
    console.error('Error in handleThemeMenuSelect:', error)
  }
}

// Generate navigation title based on current editor type
const getNavTitle = (): string => {
  return `${props.currentEditorType.toUpperCase()} To Diagram`
}
</script>
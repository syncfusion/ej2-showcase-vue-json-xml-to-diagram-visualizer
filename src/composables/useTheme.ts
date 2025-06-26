import { ref, reactive, computed } from 'vue'
import themeService, { type ThemeType } from '../utils/themeService'

// Global reactive theme state
const currentTheme = ref<ThemeType>(themeService.getCurrentTheme())
const currentThemeSettings = reactive(themeService.getCurrentThemeSettings())

export function useTheme() {
  // Computed property for theme
  const theme = computed(() => currentTheme.value)
  
  // Computed property for theme settings
  const themeSettings = computed(() => currentThemeSettings)

  // Function to update theme
  const setTheme = (newTheme: ThemeType) => {
    if (currentTheme.value === newTheme) return
    
    // Update theme service
    themeService.setTheme(newTheme)
    
    // Update reactive state
    currentTheme.value = newTheme
    const newSettings = themeService.getCurrentThemeSettings()
    
    // Update all properties of reactive object
    Object.assign(currentThemeSettings, newSettings)
  }

  return {
    theme,
    themeSettings,
    setTheme
  }
}
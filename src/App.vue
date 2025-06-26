<template>
  <div class="app-layout">
    <!-- Navigation Bar -->
    <NavMenu
      :currentEditorType="selectedEditorType"
      @editorTypeChange="handleEditorTypeSwitch"
      @fileAction="handleFileOperations"
      @viewOptionToggle="handleViewOptionsToggle"
      @themeChange="handleThemeChange"
    />

    <!-- Main Content -->
    <div class="main-grid">
      <!-- Left Panel - Editor -->
      <div class="left-panel">
        <div class="monaco-editor-container">
          <vue-monaco-editor
            v-model:value="editorTextContent"
            :language="selectedEditorType"
            :theme="theme === 'dark' ? 'vs-dark' : 'vs'"
            :options="editorOptions"
            @change="handleEditorContentChange"
          />
        </div>
      </div>

      <!-- Resizer -->
      <Resizer />

      <!-- Right Panel - Diagram -->
      <div class="right-panel scroll-hide">
        <HamburgerMenu
          @exportImage="handleExportImageDialogOpen"
          @rotateLayout="handleDiagramLayoutRotation"
          @collapseGraph="handleGraphCollapseToggle"
          :isGraphCollapsed="isEntireGraphCollapsed"
        />

        <ejs-diagram
          ref="diagramComponentRef"
          width="100%"
          height="100%"
          :backgroundColor="themeSettings.backgroundColor"
          :scrollSettings="{ scrollLimit: 'Infinity' }"
          :layout="diagramLayout"
          :snapSettings="snapSettings"
          :tool="diagramTool"
          :getNodeDefaults="getDefaultNodeConfiguration"
          :getConnectorDefaults="getDefaultConnectorConfiguration"
          @click="handleDiagramNodeClick"
        />

        <Toolbar
          @toolClick="handleDiagramToolbarActions"
          @search="handleDiagramSearch"
        />

        <Spinner :isVisible="isLoadingSpinnerVisible" />
      </div>
    </div>

    <!-- Bottom Status Bar -->
    <div class="bottom-bar">
      <div class="bottom-bar-content">
        <span class="status-message">
          <div :style="{ display: isEditorContentValid ? 'flex' : 'none' }">
            <span class="e-icons e-check"></span>
            <span>Valid {{ selectedEditorType.toUpperCase() }}</span>
          </div>
          <div
            class="invalid-json"
            :style="{ display: isEditorContentValid ? 'none' : 'flex' }"
          >
            <span class="e-icons e-close"></span>
            <span>Invalid {{ selectedEditorType.toUpperCase() }}</span>
          </div>
        </span>
        <span class="bottom-right">Nodes: {{ totalNodeCount }}</span>
      </div>
    </div>

    <!-- Dialogs -->
    <ExportDialog
      :isVisible="isExportDialogOpen"
      @close="isExportDialogOpen = false"
      @export="handleDiagramExport"
    />

    <NodeDetailsDialog
      :isVisible="isNodeDetailsDialogOpen"
      :nodeContent="selectedNodeDetailsData.content"
      :nodePath="selectedNodeDetailsData.path"
      @close="isNodeDetailsDialogOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick, provide } from 'vue'
import {
  DiagramComponent as EjsDiagram,
  DataBinding,
  HierarchicalTree,
  PrintAndExport,
  LineDistribution,
  DiagramTools,
  NodeConstraints,
  ConnectorConstraints,
  ConnectionPointOrigin,
  SnapConstraints,
  type NodeModel,
  type ConnectorModel,
} from '@syncfusion/ej2-vue-diagrams'
import { XMLBuilder, XMLParser } from 'fast-xml-parser'

// Monaco Editor
import { VueMonacoEditor } from '@guolao/vue-monaco-editor'

// Components
import NavMenu from './components/NavMenu/NavMenu.vue'
import Toolbar from './components/Toolbar/Toolbar.vue'
import HamburgerMenu from './components/HamburgerMenu/HamburgerMenu.vue'
import ExportDialog from './components/ExportDialog/ExportDialog.vue'
import NodeDetailsDialog from './components/NodeDetailsDialog/NodeDetailsDialog.vue'
import Resizer from './components/Resizer/Resizer.vue'
import Spinner from './components/Spinner/Spinner.vue'

// Services and Composables
import { useTheme } from './composables/useTheme'
import JsonDiagramParser from './utils/jsonDiagramParser'

// Sample data
import sampleData from './assets/sample.json'

// =============================================================================
// SYNCFUSION MODULE INJECTION
// =============================================================================

// Provide the required services for the diagram component
provide('diagram', [DataBinding, HierarchicalTree, PrintAndExport, LineDistribution])

// =============================================================================
// TYPES AND CONSTANTS
// =============================================================================

export type EditorType = 'json' | 'xml'
export type ThemeType = 'light' | 'dark'

const DIAGRAM_CONSTANTS = {
  ZOOM_STEP_FACTOR: 0.2,
  FONT_SPECIFICATION: "12px Consolas",
  TEXT_LINE_HEIGHT: 16,
  ANNOTATIONS_PADDING: 10,
  EXPAND_COLLAPSE_ICON_WIDTH: 36,
  NODE_CORNER_RADIUS: 3,
  MAIN_ROOT_SIZE: 40,
  MIN_NODE_WIDTH: 50,
  MIN_NODE_HEIGHT: 40,
  DEFAULT_NODE_WIDTH: 150,
} as const

const LAYOUT_ORIENTATIONS = ["LeftToRight", "TopToBottom", "RightToLeft", "BottomToTop"] as const

// =============================================================================
// COMPOSABLES AND SERVICES
// =============================================================================

const { theme, themeSettings, setTheme } = useTheme()

// =============================================================================
// TEMPLATE REFS
// =============================================================================

const diagramComponentRef = ref<InstanceType<typeof EjsDiagram>>()

// =============================================================================
// REACTIVE STATE
// =============================================================================

// Editor state management
const editorTextContent = ref("")
const selectedEditorType = ref<EditorType>("json")
const isEditorContentValid = ref(true)

// UI state management
const isLoadingSpinnerVisible = ref(false)
const isExportDialogOpen = ref(false)
const isNodeDetailsDialogOpen = ref(false)
const selectedNodeDetailsData = ref({
  content: "",
  path: "",
})

// Diagram state management
const totalNodeCount = ref(0)

// View options state
const isEntireGraphCollapsed = ref(false)
const shouldDisplayExpandCollapseIcons = ref(true)
const shouldShowChildItemsCount = ref(true)
const shouldShowGridLines = ref(true)

// Search functionality state
const searchResultMatches = ref<string[]>([])
const currentSearchMatchIndex = ref(0)

// Layout orientation management
const currentLayoutOrientationIndex = ref(0)

// =============================================================================
// COMPUTED PROPERTIES
// =============================================================================

const editorOptions = computed(() => ({
  automaticLayout: true,
  scrollBeyondLastLine: false,
  minimap: { enabled: false },
  scrollbar: {
    verticalScrollbarSize: 5,
    horizontalScrollbarSize: 5,
  },
  stickyScroll: { enabled: false },
  placeholder: "Start Typing..."
}))

const snapSettings = computed(() => ({
  constraints: shouldShowGridLines.value
    ? SnapConstraints.ShowLines
    : SnapConstraints.None,
  horizontalGridlines: {
    lineColor: themeSettings.value.gridlinesColor,
  },
  verticalGridlines: {
    lineColor: themeSettings.value.gridlinesColor,
  },
}))

const diagramTool = computed(() => DiagramTools.SingleSelect | DiagramTools.ZoomPan)

const diagramLayout = computed(() => ({
  type: 'HierarchicalTree',
  enableAnimation: false,
  connectionPointOrigin: 'DifferentPoint',
  orientation: LAYOUT_ORIENTATIONS[currentLayoutOrientationIndex.value],
  horizontalSpacing: 30,
  verticalSpacing: 100,
}))

// =============================================================================
// XML PARSER CONFIGURATION
// =============================================================================

const xmlToJsonParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  allowBooleanAttributes: true,
  parseTagValue: true,
  parseAttributeValue: true,
  isArray: () => false,
})

// =============================================================================
// INITIALIZATION
// =============================================================================

onMounted(() => {
  // Convert the sample data to a formatted JSON string and assign it to editorTextContent
  const initialJsonContent = JSON.stringify(sampleData, null, 2)
  editorTextContent.value = initialJsonContent

  // Process the JSON content and update the diagram component accordingly
  parseAndProcessEditorContent(initialJsonContent, "json")

  // Refresh the diagram component
  nextTick(() => {
    refreshDiagramLayout()
  })

  // Set global functions to clear search input and update search counter if they don't exist
  if (!(window as any).clearSearchInput) {
    ;(window as any).clearSearchInput = clearToolbarSearchInput
  }
  if (!(window as any).updateSearchCounter) {
    ;(window as any).updateSearchCounter = updateSearchCounter
  }
})

onUnmounted(() => {
  // Clean up global functions by removing them when the component is unmounted
  delete (window as any).clearSearchInput
  delete (window as any).updateSearchCounter
})

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

// Clear the search input in the toolbar component
const clearToolbarSearchInput = () => {
  const globalClearFunction = (window as any).clearSearchInput
  if (globalClearFunction && globalClearFunction !== clearToolbarSearchInput) {
    try {
      globalClearFunction()
    } catch (error) {
    }
  }
}

// Update search result counter in the toolbar
const updateSearchCounter = (current: number, total: number) => {
  const globalUpdateFunction = (window as any).updateSearchCounter
  if (globalUpdateFunction && globalUpdateFunction !== updateSearchCounter) {
    try {
      globalUpdateFunction(current, total)
    } catch (error) {
    }
  }
}

// =============================================================================
// EDITOR CONTENT PROCESSING
// =============================================================================

// Parse and process editor content to diagram layout
const parseAndProcessEditorContent = (textContent: string, editorType: EditorType) => {
  isLoadingSpinnerVisible.value = true
  try {
    const parsedDiagramData = processEditorContent(textContent, editorType)
    if (parsedDiagramData && diagramComponentRef.value) {
      if (parsedDiagramData.nodes.length || parsedDiagramData.connectors.length) {
        // Clear the diagram
        diagramComponentRef.value.clear()
        // Update Nodes and Connectors
        diagramComponentRef.value.addElements([...parsedDiagramData.nodes, ...parsedDiagramData.connectors])
        // Update node count in the status bar
        totalNodeCount.value = parsedDiagramData.nodes?.length || 0
        nextTick(() => {
        // Update data valid/invalid status
          isEditorContentValid.value = true
          isLoadingSpinnerVisible.value = false
          clearToolbarSearchInput()
        });
        nextTick(() => {
          refreshDiagramLayout()
        })
      }
    }
  } catch (error) {
    isEditorContentValid.value = false
  }
}

// Process editor content based on type (JSON or XML) and convert to diagram data
const processEditorContent = (textContent: string, editorType: EditorType) => {
  if (editorType === "json") {
    const parsedJsonObject = JSON.parse(textContent)
    return JsonDiagramParser.processData(parsedJsonObject)
  } else if (editorType === "xml") {
    if (!textContent.trim().startsWith("<")) {
      throw new Error("Invalid XML format")
    }
    // Wrap XML content in root element for proper parsing
    const wrappedXmlContent = `<root>${textContent}</root>`
    const convertedJsonObject = xmlToJsonParser.parse(wrappedXmlContent)
    const extractedRootData = convertedJsonObject.root || {}
    return JsonDiagramParser.processData(extractedRootData)
  }
  return null
}

// Refresh diagram layout and fit to page
const refreshDiagramLayout = () => {
  if (diagramComponentRef.value) {
    diagramComponentRef.value.ej2Instances.refresh();
    diagramComponentRef.value.ej2Instances.fitToPage({ canZoomIn: true })
  }
}

// =============================================================================
// EVENT HANDLERS
// =============================================================================

// Handle changes in the Monaco editor content
const handleEditorContentChange = (newEditorValue: string | undefined) => {
  const updatedContent = newEditorValue || ""
  editorTextContent.value = updatedContent
  parseAndProcessEditorContent(updatedContent, selectedEditorType.value)
}

// Handle switching between JSON and XML editor types with content conversion
const handleEditorTypeSwitch = (newEditorType: EditorType) => {
  try {
    const convertedContent = convertEditorContent(editorTextContent.value, selectedEditorType.value, newEditorType)
    selectedEditorType.value = newEditorType
    editorTextContent.value = convertedContent
    parseAndProcessEditorContent(convertedContent, newEditorType)
  } catch (error) {
    console.error("Conversion error:", error)
    isEditorContentValid.value = false
  }
}

// Convert content between different editor types (JSON <-> XML)
const convertEditorContent = (content: string, fromType: EditorType, toType: EditorType): string => {
  if (toType === "json" && fromType === "xml") {
    const convertedJsonObject = xmlToJsonParser.parse(content)
    return JSON.stringify(convertedJsonObject, null, 2)
  } else if (toType === "xml" && fromType === "json") {
    const parsedJsonData = JSON.parse(content)
    const xmlBuilder = new XMLBuilder({
      format: true,
      indentBy: "  ",
      suppressEmptyNode: true,
    })
    return xmlBuilder.build(parsedJsonData)
  }
  return content
}

// Handle file import and export operations
const handleFileOperations = (fileAction: string) => {
  if (fileAction === "import") {
    importFile()
  } else if (fileAction === "export") {
    exportFile()
  }
}

// Import file functionality with file reader
const importFile = () => {
  const fileInputElement = document.createElement("input")
  fileInputElement.type = "file"
  fileInputElement.accept = selectedEditorType.value === "json" ? ".json" : ".xml"
  fileInputElement.onchange = (event) => {
    const selectedFile = (event.target as HTMLInputElement).files?.[0]
    if (selectedFile) {
      const fileReader = new FileReader()
      fileReader.onload = (loadEvent) => {
        const fileTextContent = loadEvent.target?.result as string
        editorTextContent.value = fileTextContent
        parseAndProcessEditorContent(fileTextContent, selectedEditorType.value)
      }
      fileReader.readAsText(selectedFile)
    }
  }
  fileInputElement.click()
}

// Export file functionality with blob download
const exportFile = () => {
  const contentBlob = new Blob([editorTextContent.value], { type: "text/plain" })
  const downloadLink = document.createElement("a")
  downloadLink.href = URL.createObjectURL(contentBlob)
  downloadLink.download = `Diagram.${selectedEditorType.value}`
  downloadLink.click()
}

// Handle toggling of various view options (grid, count, expand/collapse icons)
const handleViewOptionsToggle = (viewOptionId: string) => {
  if (!diagramComponentRef.value) return

  switch (viewOptionId) {
    case "view-grid":
      shouldShowGridLines.value = !shouldShowGridLines.value
      break
    case "view-count":
      shouldShowChildItemsCount.value = !shouldShowChildItemsCount.value
      nextTick(() => { refreshDiagramLayout() })
      break
    case "expand-collapse":
      shouldDisplayExpandCollapseIcons.value = !shouldDisplayExpandCollapseIcons.value
      nextTick(() => { refreshDiagramLayout() })
      break
  }
}

// Handle theme changes and update document styling
const handleThemeChange = (newThemeType: ThemeType) => {
  if (theme.value === newThemeType) return
  
  setTheme(newThemeType)
  // Update document body classes for theme
  document.body.classList.toggle("dark-theme", newThemeType === "dark")
  
  // Update theme stylesheet link for Syncfusion components
  const themeStylesheetLink = document.getElementById("theme-link") as HTMLLinkElement
  if (themeStylesheetLink) {
    let stylesheetHref = themeStylesheetLink.href
    if (newThemeType === "dark") {
      stylesheetHref = stylesheetHref.replace(/tailwind(\.css)/g, "tailwind-dark$1")
    } else {
      stylesheetHref = stylesheetHref.replace(/tailwind-dark(\.css)/g, "tailwind$1")
    }
    themeStylesheetLink.href = stylesheetHref
  }
  
  // Refresh diagram to apply new theme colors
  nextTick(()=> {
    refreshDiagramLayout();
  })
  clearToolbarSearchInput()
}

// Handle various diagram toolbar actions (zoom, reset, fit to page)
const handleDiagramToolbarActions = (toolbarAction: string) => {
  if (!diagramComponentRef.value) return
  
  const zoomStepFactor = DIAGRAM_CONSTANTS.ZOOM_STEP_FACTOR
  const actions = {
    reset: () => diagramComponentRef.value!.reset(),
    fitToPage: () => diagramComponentRef.value!.fitToPage({ canZoomIn: true }),
    zoomIn: () => diagramComponentRef.value!.zoomTo({ type: "ZoomIn", zoomFactor: zoomStepFactor }),
    zoomOut: () => diagramComponentRef.value!.zoomTo({ type: "ZoomOut", zoomFactor: zoomStepFactor })
  }
  
  const action = actions[toolbarAction as keyof typeof actions]
  if (action) action()
}

// Handle diagram search functionality with highlighting and navigation
const handleDiagramSearch = (searchQuery: string) => {
  if (!diagramComponentRef.value) return
  
  resetSearchHighlights()
  
  if (!searchQuery) {
    updateSearchCounter(0, 0)
    return
  }
  
  const foundMatches = findSearchMatches(searchQuery)
  searchResultMatches.value = foundMatches
  currentSearchMatchIndex.value = 0
  
  if (foundMatches.length > 0) {
    focusOnSearchMatch(foundMatches, 0)
    updateSearchCounter(1, foundMatches.length)
  } else {
    updateSearchCounter(0, 0)
  }
}

// Reset all search highlights and restore original node styling
const resetSearchHighlights = () => {
  if (!diagramComponentRef.value) return
  
  diagramComponentRef.value.reset()
  diagramComponentRef.value.ej2Instances.nodes.forEach((diagramNode: any) => {
    const nodeElement = document.getElementById(diagramNode.id + "_content")
    if (nodeElement) {
      nodeElement.style.fill = themeSettings.value.nodeFillColor
      nodeElement.style.stroke = themeSettings.value.nodeStrokeColor
      nodeElement.style.strokeWidth = "1.5"
    }
  })
}

// Find all nodes that match the search query
const findSearchMatches = (searchQuery: string): string[] => {
  const foundMatches: string[] = []
  if (diagramComponentRef.value) {
    diagramComponentRef.value.ej2Instances.nodes.forEach((diagramNode: any) => {
      const nodeDataString = ("" + (diagramNode.data?.actualdata || "")).toLowerCase()
      if (nodeDataString.includes(searchQuery.toLowerCase())) {
        foundMatches.push(diagramNode.id)
      }
    })
  }
  return foundMatches
}

// Focus on search match and apply appropriate highlighting
const focusOnSearchMatch = (matchedNodeIds: string[], targetMatchIndex: number) => {
  if (!diagramComponentRef.value || matchedNodeIds.length === 0) return
  
  matchedNodeIds.forEach((nodeId, matchIndex) => {
    const nodeContentElement = document.getElementById(nodeId + "_content")
    if (nodeContentElement) {
      if (matchIndex === targetMatchIndex) {
        nodeContentElement.style.fill = themeSettings.value.highlightFocusColor
        nodeContentElement.style.stroke = themeSettings.value.highlightStrokeColor
        nodeContentElement.style.strokeWidth = "2"
        diagramComponentRef.value!.bringToCenter(
          (diagramComponentRef.value!.getObject(nodeId) as any).wrapper.bounds
        )
      } else {
        nodeContentElement.style.fill = themeSettings.value.highlightFillColor
        nodeContentElement.style.stroke = themeSettings.value.highlightStrokeColor
        nodeContentElement.style.strokeWidth = "1.5"
      }
    }
  })
}

// Open the export image dialog
const handleExportImageDialogOpen = () => {
  isExportDialogOpen.value = true
}

// Handle diagram export with specified filename and format
const handleDiagramExport = (exportFileName: string, exportFormat: string) => {
  if (diagramComponentRef.value) {
    diagramComponentRef.value.exportDiagram({
      format: exportFormat as any,
      fileName: exportFileName,
    })
  }
}

// Handle diagram layout rotation through available orientations
const handleDiagramLayoutRotation = () => {
  if (!diagramComponentRef.value) return
  
  const nextOrientationIndex = (currentLayoutOrientationIndex.value + 1) % LAYOUT_ORIENTATIONS.length
  const newLayoutOrientation = LAYOUT_ORIENTATIONS[nextOrientationIndex]
  currentLayoutOrientationIndex.value = nextOrientationIndex
  
  diagramComponentRef.value.layout.orientation = newLayoutOrientation as any
  
  diagramComponentRef.value.ej2Instances.nodes.forEach((diagramNode: any) => {
    updateExpandCollapseIconPosition(diagramNode, newLayoutOrientation)
  })
  nextTick(()=> refreshDiagramLayout())
}

// Handle toggling between collapsed and expanded state for entire graph
const handleGraphCollapseToggle = () => {
  if (!diagramComponentRef.value) return

  const allDiagramNodes = diagramComponentRef.value.ej2Instances.nodes

  if (isEntireGraphCollapsed.value) {
    // Expand all nodes in the graph
    allDiagramNodes.forEach((diagramNode: NodeModel) => {
      if (diagramNode.isExpanded === false) {
        diagramNode.isExpanded = true
      }
    })
  } else {
    // Collapse all root-level nodes in the graph
    const rootLevelNodes = allDiagramNodes.filter((diagramNode: any) => 
      !diagramNode.inEdges || diagramNode.inEdges.length === 0
    )
    
    rootLevelNodes.forEach((rootNode: NodeModel) => {
      if (!(rootNode as any).expandIcon || (rootNode as any).expandIcon.shape === "None") {
        // Collapse children of root node
        (rootNode as any).outEdges?.forEach((connectorId: string) => {
          const relatedConnector = diagramComponentRef.value.ej2Instances.connectors.find((connector: any) => 
            connector.id === connectorId
          )
          if (relatedConnector) {
            const targetNode = allDiagramNodes.find((node: NodeModel) => 
              node.id === relatedConnector.targetID
            )
            if (targetNode) {
              targetNode.isExpanded = false
            }
          }
        })
      } else {
        rootNode.isExpanded = false
      }
    })
  }

  isEntireGraphCollapsed.value = !isEntireGraphCollapsed.value
  diagramComponentRef.value.dataBind()
  diagramComponentRef.value.doLayout()
}

// Handle node click events and show node details dialog
const handleDiagramNodeClick = (clickEventArgs: any) => {
  if (clickEventArgs?.actualObject?.data) {
    const clickedNodeData = clickEventArgs.actualObject.data.actualdata
    const clickedNodePath = clickEventArgs.actualObject.data.path

    if (clickedNodeData && clickedNodePath) {
      selectedNodeDetailsData.value = {
        content: clickedNodeData,
        path: clickedNodePath,
      }
      isNodeDetailsDialogOpen.value = true
    }
  }
}

// =============================================================================
// UTILITY FUNCTIONS FOR NODE CONFIGURATION
// =============================================================================

// Calculate the width of text using canvas measurement
const calculateTextWidth = (textContent: string, fontStyle: string): number => {
  const measurementCanvas = document.createElement("canvas")
  const canvasContext = measurementCanvas.getContext("2d")
  if (canvasContext) {
    canvasContext.font = fontStyle
    return canvasContext.measureText(textContent).width
  }
  return 0
}

// Calculate optimal node dimensions based on content and display settings
const calculateNodeDimensions = (
  nodeData: any, 
  fontSpecification: string = DIAGRAM_CONSTANTS.FONT_SPECIFICATION, 
  paddingSize: number, 
  lineHeight: number = DIAGRAM_CONSTANTS.TEXT_LINE_HEIGHT, 
  expandIconWidth: number = DIAGRAM_CONSTANTS.EXPAND_COLLAPSE_ICON_WIDTH
) => {
  let maximumTextWidth = 0
  let totalLinesCount = 0

  const isLeafNode = nodeData.additionalInfo?.isLeaf === true
  const nodeAnnotations = nodeData.annotations || []

  if (isLeafNode) {
    const keyAnnotations = nodeAnnotations.filter((annotation: any) => annotation.id?.startsWith("Key"))
    const valueAnnotations = nodeAnnotations.filter((annotation: any) => annotation.id?.startsWith("Value"))
    totalLinesCount = keyAnnotations.length

    // Calculate width for each key-value pair line
    for (let lineIndex = 0; lineIndex < totalLinesCount; lineIndex++) {
      const keyText = keyAnnotations[lineIndex]?.content || ""
      const valueText = valueAnnotations[lineIndex]?.content || ""
      const combinedTextWidth = calculateTextWidth(keyText + "   " + valueText, fontSpecification)
      maximumTextWidth = Math.max(maximumTextWidth, combinedTextWidth)
    }
    
    if (keyAnnotations.length === 0 && valueAnnotations.length === 0) {
      maximumTextWidth = Math.max(maximumTextWidth, calculateTextWidth(nodeAnnotations[0]?.content || " ", fontSpecification))
    }
  } else if (nodeAnnotations.length === 2 && !isLeafNode) {
    const keyText = nodeAnnotations[0].content
    const countText = nodeAnnotations[1].content
    maximumTextWidth = calculateTextWidth(keyText + countText, fontSpecification)
    totalLinesCount = 1
  }

  const calculatedWidth = Math.max(maximumTextWidth + paddingSize + (!isLeafNode ? expandIconWidth * 2 : 0), DIAGRAM_CONSTANTS.MIN_NODE_WIDTH)
  const calculatedHeight = Math.max(totalLinesCount * lineHeight + paddingSize * 2, DIAGRAM_CONSTANTS.MIN_NODE_HEIGHT)

  return { width: calculatedWidth, height: calculatedHeight, linesCount: totalLinesCount }
}

// Determine appropriate color for value text based on data type
const determineValueTextColor = (rawValueText: string) => {
  if (!isNaN(parseFloat(rawValueText))) {
    return themeSettings.value.numericColor
  } else if (rawValueText.toLowerCase() === "true" || rawValueText.toLowerCase() === "false") {
    return rawValueText.toLowerCase() === "true" ? themeSettings.value.booleanColor : "red"
  }
  return themeSettings.value.textValueColor
}

// Format value for display with appropriate quotes for strings
const formatValueForDisplay = (rawValueText: string): string => {
  const isStringValue = isNaN(Number(rawValueText)) && 
    rawValueText.toLowerCase() !== "true" && 
    rawValueText.toLowerCase() !== "false"
  
  if (!isStringValue) {
    return rawValueText.toLowerCase() === "true" || rawValueText.toLowerCase() === "false"
      ? rawValueText.toLowerCase()
      : rawValueText
  }
  
  if (isStringValue && rawValueText.trim() !== "") {
    return rawValueText.startsWith('"') && rawValueText.endsWith('"') ? rawValueText : `"${rawValueText}"`
  }
  
  return rawValueText
}

// Update expand/collapse icon position based on layout orientation
const updateExpandCollapseIconPosition = (nodeModel: any, layoutOrientation: string) => {
  if (nodeModel.expandIcon && nodeModel.collapseIcon) {
    if (layoutOrientation === "LeftToRight" || layoutOrientation === "RightToLeft") {
      nodeModel.expandIcon.offset = nodeModel.collapseIcon.offset = {
        x: 0.5,
        y: layoutOrientation === "RightToLeft" ? 0 : 1,
      }
    } else if (layoutOrientation === "TopToBottom" || layoutOrientation === "BottomToTop") {
      nodeModel.expandIcon.offset = nodeModel.collapseIcon.offset = {
        x: 1,
        y: 0.5,
      }
    }
  }
}

// Configure key annotation with proper styling and positioning
const configureKeyAnnotation = (annotation: any, nodeModel: NodeModel, fontSpecification: string, padding: number, yOffset: number) => {
  annotation.style = {
    fontSize: 12,
    fontFamily: "Consolas",
    color: themeSettings.value.textKeyColor,
  }
  const keyTextWidth = calculateTextWidth(annotation.content, fontSpecification)
  const keyHorizontalOffset = keyTextWidth / 2 / (nodeModel.width || DIAGRAM_CONSTANTS.DEFAULT_NODE_WIDTH) + padding / (nodeModel.width || DIAGRAM_CONSTANTS.DEFAULT_NODE_WIDTH)
  annotation.offset = { x: keyHorizontalOffset, y: yOffset }
}

// Configure value annotation with proper styling and positioning
const configureValueAnnotation = (annotation: any, previousAnnotation: any, nodeModel: NodeModel, fontSpecification: string, padding: number, yOffset: number) => {
  annotation.style = {
    fontSize: 12,
    fontFamily: "Consolas",
    color: annotation.id?.startsWith("Value")
      ? determineValueTextColor(annotation.content)
      : themeSettings.value.textValueColor,
  }
  
  if (previousAnnotation) {
    const keyTextWidth = calculateTextWidth(previousAnnotation.content ?? "", fontSpecification)
    const valueTextWidth = calculateTextWidth(annotation.content, fontSpecification)
    const keyHorizontalOffset = keyTextWidth / 2 / (nodeModel.width || DIAGRAM_CONSTANTS.DEFAULT_NODE_WIDTH)
    const valueHorizontalOffset = keyHorizontalOffset * 2 + valueTextWidth / 2 / (nodeModel.width || DIAGRAM_CONSTANTS.DEFAULT_NODE_WIDTH) + (padding + 8) / (nodeModel.width || DIAGRAM_CONSTANTS.DEFAULT_NODE_WIDTH)
    
    annotation.offset = { x: valueHorizontalOffset, y: yOffset }
    annotation.content = formatValueForDisplay(annotation.content)
  }
}


// Configure annotations for leaf nodes with key-value pairs
const configureLeafNodeAnnotations = (nodeModel: NodeModel, fontSpecification: string, annotationsPadding: number) => {
  const nodeAnnotationsList = nodeModel.annotations || []
  const keyAnnotations = nodeAnnotationsList.filter((annotation: any) => annotation.id?.startsWith("Key"))
  const textLinesCount = keyAnnotations.length
  let verticalSpacing = textLinesCount > 0 ? 1.0 / (textLinesCount + 1) : 0.5
  let currentLineNumber = 1

  for (let annotationIndex = 0; annotationIndex < nodeAnnotationsList.length; annotationIndex++) {
    const currentAnnotation = nodeAnnotationsList[annotationIndex] as any
    if (!currentAnnotation.id) continue

    let verticalOffset = currentLineNumber * verticalSpacing

    if (currentAnnotation.id.startsWith("Key")) {
      configureKeyAnnotation(currentAnnotation, nodeModel, fontSpecification, annotationsPadding, verticalOffset)
    } else {
      const previousAnnotation = nodeAnnotationsList[annotationIndex - 1]
      configureValueAnnotation(currentAnnotation, previousAnnotation, nodeModel, fontSpecification, annotationsPadding, verticalOffset)
      currentLineNumber++
    }
  }
}

// Configure annotations for non-leaf nodes with key and count
const configureNonLeafNodeAnnotations = (nodeModel: NodeModel, padding: number, expandIconWidth: number) => {
  const keyTextAnnotation = nodeModel.annotations![0] as any
  const countTextAnnotation = nodeModel.annotations![1] as any

  // Configure key annotation
  keyTextAnnotation.style = {
    fontSize: 12,
    fontFamily: "Consolas",
    color: themeSettings.value.textKeyColor,
  }
  keyTextAnnotation.offset = { x: shouldShowChildItemsCount.value ? 0 : 0.5, y: 0.5 }
  keyTextAnnotation.margin = {
    left: shouldShowChildItemsCount.value ? padding : shouldDisplayExpandCollapseIcons.value ? -padding : 0,
  }
  keyTextAnnotation.horizontalAlignment = shouldShowChildItemsCount.value ? "Left" : "Center"

  // Configure count annotation
  if (shouldShowChildItemsCount.value) {
    countTextAnnotation.visibility = true
    countTextAnnotation.style = {
      fontSize: 12,
      fontFamily: "Consolas",
      color: themeSettings.value.textValueColor,
    }
    countTextAnnotation.offset = { x: 1, y: 0.5 }
    countTextAnnotation.horizontalAlignment = "Right"
    countTextAnnotation.margin = {
      right: padding + (shouldDisplayExpandCollapseIcons.value ? expandIconWidth : 0),
    }
  } else {
    countTextAnnotation.visibility = false
  }
}

// Configure expand and collapse icons for non-leaf nodes
const configureExpandCollapseIcons = (nodeModel: NodeModel, iconWidth: number, cornerRadius: number) => {
  const expandIconConfiguration = {
    shape: "Minus",
    width: iconWidth,
    height: nodeModel.height,
    cornerRadius: cornerRadius,
    margin: { right: iconWidth / 2 },
    fill: themeSettings.value.expandIconFillColor,
    borderColor: themeSettings.value.expandIconBorder,
    iconColor: themeSettings.value.expandIconColor,
  }
  
  const collapseIconConfiguration = {
    shape: "Plus",
    width: iconWidth,
    height: nodeModel.height,
    cornerRadius: cornerRadius,
    margin: { right: iconWidth / 2 },
    fill: themeSettings.value.expandIconFillColor,
    borderColor: themeSettings.value.expandIconBorder,
    iconColor: themeSettings.value.expandIconColor,
  }

  const currentDiagramOrientation = diagramComponentRef.value?.layout?.orientation || 
    LAYOUT_ORIENTATIONS[currentLayoutOrientationIndex.value]
  
  updateExpandCollapseIconPosition(nodeModel, currentDiagramOrientation)

  ;(nodeModel as any).expandIcon = expandIconConfiguration
  ;(nodeModel as any).collapseIcon = collapseIconConfiguration
}

// Configure individual node based on its type and properties
const configureNode = (nodeModel: NodeModel, isLeafNode: boolean, isMainRootNode: boolean): NodeModel => {
  const fontSpecification = DIAGRAM_CONSTANTS.FONT_SPECIFICATION
  const textLineHeight = DIAGRAM_CONSTANTS.TEXT_LINE_HEIGHT
  const annotationsPadding = DIAGRAM_CONSTANTS.ANNOTATIONS_PADDING
  const expandCollapseIconWidth = DIAGRAM_CONSTANTS.EXPAND_COLLAPSE_ICON_WIDTH
  const nodeCornerRadius = DIAGRAM_CONSTANTS.NODE_CORNER_RADIUS

  // Set constraints to disable certain interactions
  nodeModel.constraints = NodeConstraints.Default & 
    ~(NodeConstraints.Rotate | NodeConstraints.Select | NodeConstraints.Resize | 
      NodeConstraints.Delete | NodeConstraints.Drag)

  // Configure shape and style
  nodeModel.shape = {
    type: "Basic",
    shape: isMainRootNode ? "Ellipse" : "Rectangle",
    cornerRadius: nodeCornerRadius,
  }

  nodeModel.style = {
    fill: themeSettings.value.nodeFillColor,
    strokeColor: themeSettings.value.nodeStrokeColor,
    strokeWidth: 1.5,
  }

  // Set dimensions
  if (isMainRootNode) {
    nodeModel.width = DIAGRAM_CONSTANTS.MAIN_ROOT_SIZE
    nodeModel.height = DIAGRAM_CONSTANTS.MAIN_ROOT_SIZE
  } else {
    const { width, height } = calculateNodeDimensions(
      nodeModel, fontSpecification, annotationsPadding, textLineHeight, expandCollapseIconWidth
    )
    nodeModel.width = width
    nodeModel.height = height
  }

  // Configure annotations
  if (nodeModel.annotations && !isMainRootNode) {
    if (isLeafNode) {
      configureLeafNodeAnnotations(nodeModel, fontSpecification, annotationsPadding)
    } else if (nodeModel.annotations.length === 2) {
      configureNonLeafNodeAnnotations(nodeModel, annotationsPadding, expandCollapseIconWidth)
    }
  }

  // Configure expand/collapse icons
  if (!isLeafNode && !isMainRootNode && shouldDisplayExpandCollapseIcons.value) {
    configureExpandCollapseIcons(nodeModel, expandCollapseIconWidth, nodeCornerRadius)
  } else {
    ;(nodeModel as any).expandIcon = { shape: "None", visibility: false }
    ;(nodeModel as any).collapseIcon = { shape: "None", visibility: false }
  }

  return nodeModel
}

// =============================================================================
// DIAGRAM COMPONENT CONFIGURATION
// =============================================================================

// Get default node configuration for diagram component
const getDefaultNodeConfiguration = (nodeModel: NodeModel): NodeModel => {
  const isLeafNode = (nodeModel as any).additionalInfo?.isLeaf === true
  const isMainRootNode = nodeModel.id === "main-root"
  
  return configureNode(nodeModel, isLeafNode, isMainRootNode)
}

// Get default connector configuration for diagram component
const getDefaultConnectorConfiguration = (connectorModel: ConnectorModel): ConnectorModel => {
  connectorModel.type = "Orthogonal"
  connectorModel.cornerRadius = 15
  connectorModel.targetDecorator = { shape: "None" }
  connectorModel.style = {
    strokeColor: themeSettings.value.connectorStrokeColor,
    strokeWidth: 2,
  }
  connectorModel.constraints = ConnectorConstraints.Default & ConnectorConstraints.Select

  return connectorModel
}

// =============================================================================
// WATCHERS
// =============================================================================

// Handle Enter key navigation through search results
onMounted(() => {
  const handleEnterKeyNavigation = (keyboardEvent: KeyboardEvent) => {
    if (keyboardEvent.key === "Enter" && searchResultMatches.value.length > 0) {
      const nextMatchIndex = (currentSearchMatchIndex.value + 1) % searchResultMatches.value.length
      currentSearchMatchIndex.value = nextMatchIndex
      focusOnSearchMatch(searchResultMatches.value, nextMatchIndex)
      updateSearchCounter(nextMatchIndex + 1, searchResultMatches.value.length)
    }
  }

  document.addEventListener("keydown", handleEnterKeyNavigation)
  
  onUnmounted(() => {
    document.removeEventListener("keydown", handleEnterKeyNavigation)
  })
})
</script>
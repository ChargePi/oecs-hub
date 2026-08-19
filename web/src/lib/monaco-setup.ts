// Bundles Monaco locally (via Vite's native `?worker` import) instead of
// @monaco-editor/react's default CDN loader, matching this project's fully
// self-contained nginx static-file deploy - see web/nginx.conf.template. Imported once,
// for its side effects, before any <Editor/> mounts (see submit-charger-page.tsx).
import * as monaco from 'monaco-editor'
import { loader } from '@monaco-editor/react'
import editorWorker from 'monaco-editor/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/language/json/json.worker?worker'

self.MonacoEnvironment = {
  getWorker(_workerId: string, label: string) {
    if (label === 'json') return new jsonWorker()
    return new editorWorker()
  },
}

loader.config({ monaco })

/**
 * Matches this app's dark palette (index.css :root) - Monaco's theming API takes literal
 * hex colors, not CSS custom properties, so these are copied from there rather than read at
 * runtime. Base 'vs-dark' keeps Monaco's own (already dark-appropriate) JSON token colors;
 * only chrome (background/gutter/cursor/selection/widgets) is overridden.
 */
monaco.editor.defineTheme('oecs-dark', {
  base: 'vs-dark',
  inherit: true,
  rules: [],
  colors: {
    'editor.background': '#0f172a', // --card
    'editor.foreground': '#f1f5f9', // --foreground
    'editor.lineHighlightBackground': '#1e293b', // --accent
    'editorLineNumber.foreground': '#64748b',
    'editorLineNumber.activeForeground': '#f1f5f9', // --foreground
    'editorCursor.foreground': '#ef4444', // --primary
    'editor.selectionBackground': '#334155',
    'editorGutter.background': '#0f172a', // --card
    'editorWidget.background': '#0f172a', // --popover
    'editorWidget.border': '#334155',
    'editorSuggestWidget.background': '#0f172a',
    'editorSuggestWidget.border': '#334155',
    'editorError.foreground': '#ef4444', // --destructive
    'editorWarning.foreground': '#f59e0b',
    'scrollbarSlider.background': '#33415580',
    'scrollbarSlider.hoverBackground': '#475569a0',
  },
})

export { monaco }

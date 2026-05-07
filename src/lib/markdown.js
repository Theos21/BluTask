export function renderMarkdown(text) {
  if (!text) return ''
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  html = html.replace(/`(.+?)`/g, '<code class="font-mono text-[11px] bg-gray-100 dark:bg-gray-700/60 px-1 py-0.5 rounded text-rose-600 dark:text-rose-400">$1</code>')
  html = html.replace(/^### (.+)$/gm, '<strong class="block text-xs mt-2">$1</strong>')
  html = html.replace(/^## (.+)$/gm, '<strong class="block text-sm mt-2">$1</strong>')
  html = html.replace(/^# (.+)$/gm, '<strong class="block text-base mt-2">$1</strong>')
  html = html.replace(/^[-*] (.+)$/gm, '<span class="block pl-3 before:content-[\'·\'] before:pr-1.5">$1</span>')
  html = html.replace(/^\d+\. (.+)$/gm, '<span class="block pl-3">$1</span>')
  html = html.replace(/\n/g, '<br>')

  return html
}

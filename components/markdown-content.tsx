import React from 'react'

interface MarkdownContentProps {
  content: string
  className?: string
}

export const MarkdownContent: React.FC<MarkdownContentProps> = ({ content, className = '' }) => {
  if (!content || typeof content !== 'string') {
    return <p className="text-muted-foreground">No content available</p>
  }

  const formatMarkdown = (text: string): string => {
    let formatted = text

    // Headers (h1-h6)
    formatted = formatted.replace(/^######\s+(.+)$/gm, '<h6 class="text-base font-semibold mt-4 mb-2">$1</h6>')
    formatted = formatted.replace(/^#####\s+(.+)$/gm, '<h5 class="text-lg font-semibold mt-4 mb-2">$1</h5>')
    formatted = formatted.replace(/^####\s+(.+)$/gm, '<h4 class="text-xl font-semibold mt-6 mb-3">$1</h4>')
    formatted = formatted.replace(/^###\s+(.+)$/gm, '<h3 class="text-2xl font-bold mt-6 mb-3">$1</h3>')
    formatted = formatted.replace(/^##\s+(.+)$/gm, '<h2 class="text-3xl font-bold mt-8 mb-4">$1</h2>')
    formatted = formatted.replace(/^#\s+(.+)$/gm, '<h1 class="text-4xl font-bold mt-8 mb-4">$1</h1>')

    // Bold and italic
    formatted = formatted.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    formatted = formatted.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>')
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    formatted = formatted.replace(/__(.+?)__/g, '<strong>$1</strong>')
    formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>')
    formatted = formatted.replace(/_(.+?)_/g, '<em>$1</em>')

    // Links
    formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary hover:underline" target="_blank" rel="noopener noreferrer">$1</a>')

    // Code blocks (triple backticks)
    formatted = formatted.replace(/```([a-z]*)\n([\s\S]+?)```/g, '<pre class="bg-muted p-4 rounded-lg my-4 overflow-x-auto"><code>$2</code></pre>')

    // Inline code
    formatted = formatted.replace(/`([^`]+)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')

    // Unordered lists
    formatted = formatted.replace(/^\* (.+)$/gm, '<li class="ml-4">$1</li>')
    formatted = formatted.replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>')
    formatted = formatted.replace(/(<li class="ml-4">.*<\/li>\n?)+/g, '<ul class="list-disc list-inside my-4 space-y-1">$&</ul>')

    // Ordered lists
    formatted = formatted.replace(/^\d+\.\s+(.+)$/gm, '<li class="ml-4">$1</li>')
    formatted = formatted.replace(/(<li class="ml-4">.*<\/li>\n?)+/g, (match) => {
      // Only wrap in ol if it's a numbered list
      if (match.includes('1.')) {
        return `<ol class="list-decimal list-inside my-4 space-y-1">${match}</ol>`
      }
      return match
    })

    // Blockquotes
    formatted = formatted.replace(/^>\s+(.+)$/gm, '<blockquote class="border-l-4 border-primary pl-4 italic my-4">$1</blockquote>')

    // Horizontal rules
    formatted = formatted.replace(/^---$/gm, '<hr class="my-6 border-t border-border" />')
    formatted = formatted.replace(/^\*\*\*$/gm, '<hr class="my-6 border-t border-border" />')

    // Paragraphs (double line break creates new paragraph)
    formatted = formatted.replace(/\n\n/g, '</p><p class="mb-4 leading-relaxed">')

    // Single line breaks
    formatted = formatted.replace(/\n/g, '<br />')

    // Wrap in paragraph if doesn't start with a block element
    const startsWithBlockElement = /^<(h[1-6]|ul|ol|blockquote|pre|hr)/.test(formatted.trim())
    if (!startsWithBlockElement) {
      formatted = `<p class="mb-4 leading-relaxed">${formatted}</p>`
    }

    return formatted
  }

  const formattedHtml = formatMarkdown(content)

  return (
    <div 
      className={`prose prose-sm max-w-none dark:prose-invert ${className}`}
      dangerouslySetInnerHTML={{ __html: formattedHtml }}
    />
  )
}


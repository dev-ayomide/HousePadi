'use client'

import React, { useState, useEffect } from 'react'
import { Check, Copy } from 'lucide-react'
import { ApiDoc } from '@/app/actions/api-doc-actions'

interface ApiDocsClientProps {
  docs: ApiDoc[]
}

// Check if content is HTML
function isHtml(text: string): boolean {
  const trimmed = text.trim()
  return (
    trimmed.startsWith('<') &&
    (trimmed.includes('<p>') ||
      trimmed.includes('</div>') ||
      trimmed.includes('</span>') ||
      trimmed.includes('<br') ||
      trimmed.includes('<h1>') ||
      trimmed.includes('<h2>') ||
      trimmed.includes('<h3>') ||
      trimmed.includes('<ul>') ||
      trimmed.includes('<ol>') ||
      trimmed.includes('<strong>') ||
      trimmed.includes('<em>') ||
      trimmed.includes('<table>'))
  )
}

// Inline Markdown formatter
function parseInlineMarkdown(text: string): string {
  // Escapes HTML tags in text to avoid them being rendered as elements
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Bold-italic: ***text***
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
  
  // Bold: **text**
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Italic: *text*
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Inline code: `code`
  html = html.replace(/`(.*?)`/g, '<code class="px-1.5 py-0.5 rounded bg-emerald-950/30 border border-emerald-900/30 text-emerald-400 font-mono text-[11px] font-semibold">$1</code>');

  return html;
}

// Code Terminal Component for parsed Markdown code blocks
function CodeTerminal({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy: ', err)
    }
  }

  return (
    <div className="my-6 border border-neutral-850 rounded-lg overflow-hidden bg-[#070707] transition-all hover:border-neutral-700/60 shadow-xl group">
      {/* Title Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#0d0d0d] border-b border-neutral-850">
        <div className="flex items-center gap-2">
          {/* Mac-style traffic lights */}
          <div className="w-2.5 h-2.5 rounded-full bg-neutral-800 group-hover:bg-red-500/60 transition-colors" />
          <div className="w-2.5 h-2.5 rounded-full bg-neutral-800 group-hover:bg-yellow-500/60 transition-colors" />
          <div className="w-2.5 h-2.5 rounded-full bg-neutral-800 group-hover:bg-green-500/60 transition-colors" />
          <span className="ml-3 text-[10px] font-mono text-neutral-500 uppercase tracking-widest font-bold">
            {language || 'code'}
          </span>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-neutral-400 hover:text-white rounded bg-neutral-900 border border-neutral-800/80 hover:border-neutral-700 transition-all font-mono active:scale-95 cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-bold">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Editor Content */}
      <div className="p-5 overflow-x-auto font-mono text-sm leading-relaxed text-neutral-300 bg-[#070707] select-text">
        <pre className="m-0 p-0 whitespace-pre">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  )
}

// Markdown Parser Helper
interface Block {
  type: 'heading' | 'paragraph' | 'list' | 'code' | 'table'
  level?: number
  text?: string
  ordered?: boolean
  items?: string[]
  language?: string
  code?: string
  headers?: string[]
  rows?: string[][]
}

function parseMarkdownToBlocks(text: string): Block[] {
  const lines = text.split('\n')
  const blocks: Block[] = []
  let currentBlock: Block | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // 1. Code Block parsing
    if (line.trim().startsWith('```')) {
      if (currentBlock && currentBlock.type === 'code') {
        blocks.push(currentBlock)
        currentBlock = null
      } else {
        if (currentBlock) {
          blocks.push(currentBlock)
        }
        const language = line.trim().slice(3).trim()
        currentBlock = { type: 'code', language, code: '' }
      }
      continue
    }

    if (currentBlock && currentBlock.type === 'code') {
      currentBlock.code += (currentBlock.code ? '\n' : '') + line
      continue
    }

    // 2. Table parsing
    if (line.trim().startsWith('|')) {
      if (line.includes(':---') || line.includes('---:')) {
        continue
      }

      const cells = line
        .split('|')
        .slice(1, -1)
        .map(cell => cell.trim())

      if (currentBlock && currentBlock.type === 'table') {
        currentBlock.rows?.push(cells)
      } else {
        if (currentBlock) {
          blocks.push(currentBlock)
        }
        currentBlock = { type: 'table', headers: cells, rows: [] }
      }
      continue
    } else {
      if (currentBlock && currentBlock.type === 'table') {
        blocks.push(currentBlock)
        currentBlock = null
      }
    }

    // 3. Heading parsing
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/)
    if (headingMatch) {
      if (currentBlock) {
        blocks.push(currentBlock)
      }
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        text: headingMatch[2].trim()
      })
      currentBlock = null
      continue
    }

    // 4. List parsing
    const olMatch = line.match(/^(\d+)\.\s+(.*)$/)
    const ulMatch = line.match(/^([-\*])\s+(.*)$/)

    if (olMatch || ulMatch) {
      const isOrdered = !!olMatch
      const itemText = isOrdered ? olMatch![2].trim() : ulMatch![2].trim()

      if (currentBlock && currentBlock.type === 'list' && currentBlock.ordered === isOrdered) {
        currentBlock.items?.push(itemText)
      } else {
        if (currentBlock) {
          blocks.push(currentBlock)
        }
        currentBlock = { type: 'list', ordered: isOrdered, items: [itemText] }
      }
      continue
    } else {
      if (currentBlock && currentBlock.type === 'list') {
        blocks.push(currentBlock)
        currentBlock = null
      }
    }

    // 5. Empty line handling
    if (line.trim() === '') {
      if (currentBlock) {
        blocks.push(currentBlock)
        currentBlock = null
      }
      continue
    }

    // 6. Paragraph parsing
    if (currentBlock && currentBlock.type === 'paragraph') {
      currentBlock.text += '\n' + line
    } else {
      if (currentBlock) {
        blocks.push(currentBlock)
      }
      currentBlock = { type: 'paragraph', text: line }
    }
  }

  if (currentBlock) {
    blocks.push(currentBlock)
  }

  return blocks
}

export function ApiDocsClient({ docs }: ApiDocsClientProps) {
  // Effect to handle raw HTML code blocks styling and copy button injection
  useEffect(() => {
    const container = document.getElementById('api-docs-container')
    if (!container) return

    const preElements = container.querySelectorAll('pre')
    preElements.forEach((pre) => {
      if (pre.getAttribute('data-has-copy') === 'true') return
      pre.setAttribute('data-has-copy', 'true')

      // Set class styling for code terminal look
      pre.className = "my-6 relative border border-neutral-850 rounded-lg overflow-hidden bg-[#070707] transition-all hover:border-neutral-700/60 shadow-xl p-5 pr-16 font-mono text-sm leading-relaxed text-neutral-300 select-text"

      // Add Copy Button
      const button = document.createElement('button')
      button.className = "absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-neutral-400 hover:text-white rounded bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-all font-mono cursor-pointer active:scale-95"
      button.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
        <span class="copy-text">Copy</span>
      `

      button.addEventListener('click', async () => {
        try {
          const codeElement = pre.querySelector('code')
          const textToCopy = codeElement ? codeElement.innerText : (pre.innerText || pre.textContent || '').replace(/Copy\s*$/, '').trim()
          
          await navigator.clipboard.writeText(textToCopy)
          
          button.classList.add('text-emerald-400')
          const textSpan = button.querySelector('.copy-text')
          if (textSpan) textSpan.textContent = 'Copied'
          const svg = button.querySelector('svg')
          if (svg) {
            svg.outerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-emerald-400"><path d="M20 6 9 17l-5-5"/></svg>`
          }

          setTimeout(() => {
            button.classList.remove('text-emerald-400')
            if (textSpan) textSpan.textContent = 'Copy'
            button.innerHTML = `
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
              <span class="copy-text">Copy</span>
            `
          }, 2000)
        } catch (err) {
          console.error('Failed to copy text: ', err)
        }
      })

      pre.appendChild(button)
    })
  }, [docs])

  return (
    <div id="api-docs-container" className="space-y-16">
      {docs.map((doc, idx) => {
        const isContentHtml = isHtml(doc.content)

        return (
          <section key={doc.id} id={`section-${doc.id}`} className="space-y-6 scroll-mt-32">
            <div className="flex items-center gap-4 border-b border-neutral-800 pb-4">
              <span className="text-sm font-mono text-neutral-600">
                {(idx + 1).toString().padStart(2, '0')}
              </span>
              <h2 className="text-2xl font-medium text-white tracking-tight">
                {doc.title}
              </h2>
            </div>

            {isContentHtml ? (
              // HTML Render Fallback (CMS Rich Editor Output)
              <div 
                className="prose prose-invert prose-neutral max-w-none break-words prose-p:whitespace-pre-wrap prose-p:text-neutral-400 prose-headings:text-neutral-200 prose-a:text-white hover:prose-a:text-neutral-300 prose-code:text-emerald-400 prose-code:bg-emerald-950/30 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-none prose-code:before:content-none prose-code:after:content-none"
                dangerouslySetInnerHTML={{ __html: doc.content.replace(/&nbsp;/g, ' ') }}
              />
            ) : (
              // Markdown Parser & Modern UI Render
              <div className="space-y-4">
                {parseMarkdownToBlocks(doc.content).map((block, bIdx) => {
                  switch (block.type) {
                    case 'heading': {
                      const level = block.level || 3
                      const baseClass = "font-medium text-white tracking-tight"
                      const html = parseInlineMarkdown(block.text || '')
                      if (level === 1) {
                        return <h1 key={bIdx} className={`${baseClass} text-3xl sm:text-4xl mt-8 mb-4`} dangerouslySetInnerHTML={{ __html: html }} />
                      }
                      if (level === 2) {
                        return <h2 key={bIdx} className={`${baseClass} text-2xl sm:text-3xl mt-7 mb-3.5`} dangerouslySetInnerHTML={{ __html: html }} />
                      }
                      if (level === 3) {
                        return <h3 key={bIdx} className={`${baseClass} text-xl mt-6 mb-3`} dangerouslySetInnerHTML={{ __html: html }} />
                      }
                      return <h4 key={bIdx} className={`${baseClass} text-lg mt-5 mb-2.5`} dangerouslySetInnerHTML={{ __html: html }} />
                    }

                    case 'paragraph': {
                      const html = parseInlineMarkdown(block.text || '')
                      return (
                        <p
                          key={bIdx}
                          className="text-neutral-400 font-light leading-relaxed my-3"
                          dangerouslySetInnerHTML={{ __html: html }}
                        />
                      )
                    }

                    case 'list': {
                      const Tag = block.ordered ? 'ol' : 'ul'
                      const listClass = block.ordered
                        ? "list-decimal list-inside text-neutral-400 font-light leading-relaxed space-y-2.5 my-4 ml-2"
                        : "list-disc list-inside text-neutral-400 font-light leading-relaxed space-y-2.5 my-4 ml-2"
                      return (
                        <Tag key={bIdx} className={listClass}>
                          {block.items?.map((item, iIdx) => (
                            <li
                              key={iIdx}
                              className="[&>strong]:text-neutral-200 [&>strong]:font-medium"
                              dangerouslySetInnerHTML={{ __html: parseInlineMarkdown(item) }}
                            />
                          ))}
                        </Tag>
                      )
                    }

                    case 'code': {
                      return (
                        <CodeTerminal
                          key={bIdx}
                          code={block.code || ''}
                          language={block.language || 'code'}
                        />
                      )
                    }

                    case 'table': {
                      return (
                        <div key={bIdx} className="overflow-x-auto my-6 border border-neutral-850 bg-[#070707] rounded-lg">
                          <table className="w-full text-left border-collapse font-sans">
                            <thead>
                              <tr className="border-b border-neutral-850 bg-neutral-900/40">
                                {block.headers?.map((header, hIdx) => (
                                  <th
                                    key={hIdx}
                                    className="px-5 py-4 text-[10px] uppercase tracking-widest font-bold text-neutral-500 font-mono"
                                  >
                                    {header}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-900/50">
                              {block.rows?.map((row, rIdx) => (
                                <tr key={rIdx} className="hover:bg-neutral-900/20 transition-colors">
                                  {row.map((cell, cIdx) => (
                                    <td
                                      key={cIdx}
                                      className="px-5 py-4 text-sm text-neutral-300 align-top leading-relaxed"
                                    >
                                      <span
                                        className="[&>strong]:text-neutral-200 [&>strong]:font-medium font-light"
                                        dangerouslySetInnerHTML={{ __html: parseInlineMarkdown(cell) }}
                                      />
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )
                    }

                    default:
                      return null
                  }
                })}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}

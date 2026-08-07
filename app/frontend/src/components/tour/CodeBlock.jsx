import { useState } from 'react'
import { Copy, Check } from '@phosphor-icons/react'

// Renders a static command example with a copy-to-clipboard button.
// Deliberately does nothing else: no execution, no network calls, no
// fetching anything from the code shown. It's text the visitor can copy
// and run themselves, on their own machine, on purpose.
const CodeBlock = ({ label, code }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (error) {
      console.error('Copy failed:', error)
    }
  }

  return (
    <div className="overflow-hidden rounded-md border border-primary-100 dark:border-primary-600">
      {label && (
        <div className="border-b border-primary-100 bg-primary-50 px-4 py-2 text-xs font-medium text-primary-500 dark:border-primary-600 dark:bg-primary-900 dark:text-primary-300">
          {label}
        </div>
      )}
      <div className="relative bg-primary-900 dark:bg-primary-900">
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy command to clipboard"
          className="absolute right-2 top-2 flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-primary-200 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-300"
        >
          {copied ? (
            <>
              <Check size={14} weight="bold" />
              Copied
            </>
          ) : (
            <>
              <Copy size={14} />
              Copy
            </>
          )}
        </button>
        <pre className="overflow-x-auto px-4 py-3 pr-20 text-sm leading-relaxed">
          <code className="font-mono text-primary-100">{code}</code>
        </pre>
      </div>
    </div>
  )
}

export default CodeBlock

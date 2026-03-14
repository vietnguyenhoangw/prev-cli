import React from 'react'
import { Link } from '@tanstack/react-router'
import { Preview } from './Preview'
import { pages } from 'virtual:prev-pages'

// Get valid routes from pages
const validRoutes = new Set(pages.map((p: { route: string }) => p.route))

// Also add /previews routes
validRoutes.add('/previews')

// Check if a path is an internal link
function isInternalLink(href: string): boolean {
  if (!href) return false
  // External links start with http://, https://, mailto:, tel:, etc.
  if (/^(https?:|mailto:|tel:|#)/.test(href)) return false
  // Relative or absolute internal paths
  return href.startsWith('/') || !href.includes(':')
}

// Convert a relative markdown file path to a route
function filePathToRoute(href: string): string {
  // Remove .md/.mdx extension
  let path = href.replace(/\.mdx?$/, '')
  // Handle relative paths - just extract the meaningful part
  // e.g., "../../blue-whale/.c3/c3-1-modules/c3-101-auth" -> "/blue-whale/c3-1-modules/c3-101-auth"
  const parts = path.split('/')
  const meaningfulParts = parts.filter(p => p !== '.' && p !== '..')
  // Remove leading dot from directory names (e.g., .c3 -> c3)
  const cleanedParts = meaningfulParts.map(p => p.startsWith('.') ? p.slice(1) : p)

  // Handle index/README files - they resolve to parent directory
  const lastPart = cleanedParts[cleanedParts.length - 1]?.toLowerCase()
  if (lastPart === 'readme' || lastPart === 'index') {
    cleanedParts.pop()
  }

  return '/' + cleanedParts.join('/')
}

// Check if an internal route exists
function routeExists(href: string): boolean {
  if (!href) return true
  // Remove hash and query string
  let path = href.split(/[?#]/)[0]

  // If it's a relative file path (contains .md), convert to route
  if (path.includes('.md') || path.startsWith('.') || path.includes('/..')) {
    path = filePathToRoute(path)
  }

  // Check exact match or if it's a valid preview route
  if (validRoutes.has(path)) return true
  // Check if it starts with /previews/ (dynamic preview routes)
  if (path.startsWith('/previews/')) return true
  // Check with and without trailing slash
  if (validRoutes.has(path + '/') || validRoutes.has(path.replace(/\/$/, ''))) return true
  return false
}

// Custom link component that validates internal links and uses router
function MdxLink({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const isInternal = isInternalLink(href || '')
  const isDev = import.meta.env.DEV ?? false

  // For internal links, use TanStack Router's Link
  if (isInternal && href) {
    // Convert relative file paths to routes
    let routePath = href
    if (href.includes('.md') || href.startsWith('.') || href.includes('/..')) {
      routePath = filePathToRoute(href)
    }

    const exists = routeExists(routePath)

    // Debug logging in dev mode
    if (isDev && href !== routePath) {
      console.log('[MdxLink]', href, '->', routePath, exists ? '✓' : '✗', 'Valid routes:', Array.from(validRoutes).filter(r => r.includes('blue-whale')).slice(0, 5))
    }

    // In dev mode, show warning for dead links
    if (isDev && !exists) {
      return (
        <span
          className="dead-link"
          title={`Dead link: "${href}" -> "${routePath}" does not match any known route`}
          {...props}
        >
          {children}
          <span className="dead-link-icon" aria-label="Dead link">⚠️</span>
        </span>
      )
    }

    return (
      <Link to={routePath} {...props}>
        {children}
      </Link>
    )
  }

  // External links open in new tab
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    >
      {children}
    </a>
  )
}

// Responsive table wrapper for horizontal scrolling on mobile
function MdxTable({ children, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  const wrapperRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return

    // Check if table overflows and add class for scroll indicator
    const checkOverflow = () => {
      const hasOverflow = wrapper.scrollWidth > wrapper.clientWidth
      wrapper.classList.toggle('has-scroll', hasOverflow && wrapper.scrollLeft < wrapper.scrollWidth - wrapper.clientWidth - 1)
    }

    checkOverflow()
    wrapper.addEventListener('scroll', checkOverflow)
    window.addEventListener('resize', checkOverflow)

    return () => {
      wrapper.removeEventListener('scroll', checkOverflow)
      window.removeEventListener('resize', checkOverflow)
    }
  }, [])

  return (
    <div ref={wrapperRef} className="table-wrapper">
      <table {...props}>{children}</table>
    </div>
  )
}

export const mdxComponents = {
  Preview,
  a: MdxLink,
  table: MdxTable,
}

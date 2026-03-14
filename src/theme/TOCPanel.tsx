import React, { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import type { PageTree } from 'fumadocs-core/server'
import { Icon } from './icons'

interface TOCPanelProps {
  tree: PageTree.Root
  isOpen: boolean
  onClose: () => void
}

type TreeItem = PageTree.Item | PageTree.Folder

function getItemId(item: TreeItem): string {
  return item.type === 'folder' ? `folder:${item.name}` : item.url
}

export function TOCPanel({ tree, isOpen, onClose }: TOCPanelProps) {
  const location = useLocation()
  const panelRef = useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth <= 768 : false)
  const [orderedItems, setOrderedItems] = useState<TreeItem[]>(tree.children)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // On mobile, handle escape key and click outside to close
  useEffect(() => {
    if (!isMobile || !isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isMobile, isOpen, onClose])

  const handleDragStart = (index: number) => {
    setDragIndex(index)
  }

  const handleDragOver = (index: number) => {
    if (dragIndex !== null && dragIndex !== index) {
      setDragOverIndex(index)
    }
  }

  const handleDragEnd = async () => {
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      const newItems = [...orderedItems]
      const [removed] = newItems.splice(dragIndex, 1)
      newItems.splice(dragOverIndex, 0, removed)
      setOrderedItems(newItems)

      // Auto-save to config
      const order = newItems.map(item =>
        item.type === 'folder' ? `${item.name}/` : item.url.replace(/^\//, '') + '.md'
      )

      await fetch('/__prev/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: '/', order })
      })
    }
    setDragIndex(null)
    setDragOverIndex(null)
  }

  // Mobile: show as overlay/bottom sheet
  if (isMobile) {
    if (!isOpen) return null

    return (
      <div className="toc-overlay">
        <div className="toc-overlay-content" ref={panelRef}>
          <div className="toc-overlay-header">
            <span>Navigation</span>
            <button className="toc-close-btn" onClick={onClose}><Icon name="x" size={16} /></button>
          </div>
          <nav className="toc-nav">
            {orderedItems.map((item) => (
              <TOCItem
                key={getItemId(item)}
                item={item}
                location={location}
                onNavigate={onClose}
              />
            ))}
          </nav>
        </div>
      </div>
    )
  }

  // Desktop: show as sidebar
  return (
    <aside className={`toc-sidebar ${isOpen ? 'open' : ''}`} ref={panelRef}>
      <div className="toc-sidebar-header">
        <span>Navigation</span>
        <button className="toc-close-btn" onClick={onClose} title="Close sidebar">
          <Icon name="chevron-left" size={16} />
        </button>
      </div>
      <nav className="toc-nav">
        {orderedItems.map((item, i) => (
          <div
            key={getItemId(item)}
            draggable
            onDragStart={() => handleDragStart(i)}
            onDragOver={(e) => { e.preventDefault(); handleDragOver(i) }}
            onDragEnd={handleDragEnd}
            className={dragOverIndex === i ? 'drop-target' : ''}
          >
            <TOCItem
              item={item}
              location={location}
              onNavigate={() => {}}
            />
          </div>
        ))}
      </nav>
    </aside>
  )
}

interface TOCItemProps {
  item: TreeItem
  location: { pathname: string }
  onNavigate: () => void
  depth?: number
}

function TOCItem({ item, location, onNavigate, depth = 0 }: TOCItemProps) {
  const [isOpen, setIsOpen] = useState(true)

  if (item.type === 'folder') {
    return (
      <div className="toc-folder">
        <button
          className="toc-folder-toggle"
          onClick={() => setIsOpen(!isOpen)}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          <Icon name="chevron-right" size={14} className={`folder-chevron ${isOpen ? 'open' : ''}`} />
          <Icon name="folder" size={14} className="toc-icon" />
          {item.name}
        </button>
        {isOpen && (
          <div className="toc-folder-children">
            {item.children.map((child) => (
              <TOCItem
                key={getItemId(child)}
                item={child}
                location={location}
                onNavigate={onNavigate}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  const isActive = location.pathname === item.url

  return (
    <Link
      to={item.url}
      className={`toc-link ${isActive ? 'active' : ''}`}
      style={{ paddingLeft: `${depth * 12 + 12}px` }}
      onClick={onNavigate}
    >
      <Icon name="file" size={14} className="toc-icon" />
      {item.name}
    </Link>
  )
}

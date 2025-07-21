import { JSX, useState } from 'react'
import { Collection } from '@/types/types'
import { useCollectionStore } from '@renderer/stores/collectionStore'
import { useTabStore } from '@renderer/stores/tabStore'
import styles from './CollectionPanel.module.scss'

interface CollectionPanelProps {
  isVisible: boolean
  onToggle: () => void
}

export const CollectionPanel = ({ isVisible, onToggle }: CollectionPanelProps): JSX.Element => {
  const collectionStore = useCollectionStore()
  const tabStore = useTabStore()

  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set())
  const [editingCollection, setEditingCollection] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState('')
  const [newCollectionParent, setNewCollectionParent] = useState<string | undefined>(undefined)

  const toggleExpand = (collectionId: string) => {
    const newExpanded = new Set(expandedCollections)
    if (newExpanded.has(collectionId)) {
      newExpanded.delete(collectionId)
    } else {
      newExpanded.add(collectionId)
    }
    setExpandedCollections(newExpanded)
  }

  const startEditing = (collection: Collection) => {
    setEditingCollection(collection.id)
    setEditingName(collection.name)
  }

  const saveEdit = () => {
    if (editingCollection && editingName.trim()) {
      collectionStore.updateCollection(editingCollection, { name: editingName.trim() })
    }
    setEditingCollection(null)
    setEditingName('')
  }

  const cancelEdit = () => {
    setEditingCollection(null)
    setEditingName('')
  }

  const handleDelete = (collectionId: string) => {
    if (confirm('このコレクションを削除しますか？')) {
      collectionStore.deleteCollection(collectionId)
    }
  }

  const handleCreateCollection = () => {
    if (newCollectionName.trim()) {
      collectionStore.createCollection(newCollectionName.trim(), undefined, newCollectionParent)
      setNewCollectionName('')
      setNewCollectionParent(undefined)
      setShowCreateForm(false)
    }
  }

  const handleSelectCollection = (collectionId: string) => {
    const currentActive = collectionStore.activeCollectionId
    collectionStore.setActiveCollection(currentActive === collectionId ? undefined : collectionId)
  }

  const handleAddTabToCollection = (collectionId: string) => {
    tabStore.addTab(collectionId)
  }

  const handleRemoveTabFromCollection = (collectionId: string, tabId: string) => {
    collectionStore.removeTabFromCollection(collectionId, tabId)
    tabStore.setTabCollection(tabId, undefined)
  }

  const renderCollectionTabs = (collection: Collection): JSX.Element => {
    const collectionTabs = tabStore.getTabsByCollection(collection.id)

    if (collectionTabs.length === 0) {
      return (
        <div className={styles.noTabs}>
          <p>このコレクションにタブがありません</p>
          <button
            onClick={() => handleAddTabToCollection(collection.id)}
            className={styles.addTabButton}
            type="button"
          >
            + 新しいタブ
          </button>
        </div>
      )
    }

    return (
      <div className={styles.tabsList}>
        <div className={styles.tabsHeader}>
          <span>タブ ({collectionTabs.length})</span>
          <button
            onClick={() => handleAddTabToCollection(collection.id)}
            className={styles.addTabButton}
            type="button"
          >
            +
          </button>
        </div>
        {collectionTabs.map((tab) => (
          <div key={tab.id} className={styles.tabItem}>
            <span className={styles.tabName}>{tab.title}</span>
            <button
              onClick={() => handleRemoveTabFromCollection(collection.id, tab.id)}
              className={styles.removeTabButton}
              type="button"
              title="コレクションから削除"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    )
  }

  const renderCollection = (collection: Collection, level: number = 0): JSX.Element => {
    const isExpanded = expandedCollections.has(collection.id)
    const isEditing = editingCollection === collection.id
    const children = collectionStore.getCollectionsByParent(collection.id)
    const hasChildren = children.length > 0
    const isActive = collectionStore.activeCollectionId === collection.id

    return (
      <div
        key={collection.id}
        className={styles.collectionItem}
        style={{ paddingLeft: `${level * 16}px` }}
      >
        <div className={styles.collectionHeader}>
          {(hasChildren || isActive) && (
            <button
              className={`${styles.expandButton} ${isExpanded ? styles.expanded : ''}`}
              onClick={() => toggleExpand(collection.id)}
              type="button"
            >
              ▶
            </button>
          )}

          {isEditing ? (
            <div className={styles.editForm}>
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveEdit()
                  if (e.key === 'Escape') cancelEdit()
                }}
                className={styles.editInput}
                // autoFocus
              />
              <button onClick={saveEdit} className={styles.saveButton} type="button">
                ✓
              </button>
              <button onClick={cancelEdit} className={styles.cancelButton} type="button">
                ✕
              </button>
            </div>
          ) : (
            <div className={styles.collectionInfo}>
              <div
                className={`${styles.collectionName} ${isActive ? styles.active : ''}`}
                onClick={() => handleSelectCollection(collection.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleSelectCollection(collection.id)
                  }
                }}
              >
                {collection.name}
                {isActive && <span className={styles.activeIndicator}>●</span>}
              </div>
              <div className={styles.collectionActions}>
                <button
                  onClick={() => startEditing(collection)}
                  className={styles.editButton}
                  type="button"
                  title="名前を編集"
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDelete(collection.id)}
                  className={styles.deleteButton}
                  type="button"
                  title="削除"
                >
                  🗑️
                </button>
              </div>
            </div>
          )}
        </div>

        {isExpanded && (
          <div className={styles.children}>
            {hasChildren && (
              <div className={styles.subCollections}>
                {children.map((child) => renderCollection(child, level + 1))}
              </div>
            )}
            {isActive && (
              <div className={styles.collectionTabs}>{renderCollectionTabs(collection)}</div>
            )}
          </div>
        )}
      </div>
    )
  }

  const rootCollections = collectionStore.getCollectionsByParent()

  return (
    <div className={`${styles.collectionPanel} ${isVisible ? styles.visible : ''}`}>
      <div className={styles.header}>
        <h3>コレクション</h3>
        <button onClick={onToggle} className={styles.toggleButton} type="button">
          ×
        </button>
      </div>

      {isVisible && (
        <div className={styles.content}>
          <div className={styles.toolbar}>
            <button
              onClick={() => setShowCreateForm(true)}
              className={styles.createButton}
              type="button"
            >
              + 新しいコレクション
            </button>
          </div>

          {showCreateForm && (
            <div className={styles.createForm}>
              <input
                type="text"
                placeholder="コレクション名"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                className={styles.createInput}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateCollection()
                  if (e.key === 'Escape') setShowCreateForm(false)
                }}
                // autoFocus
              />
              <select
                value={newCollectionParent || ''}
                onChange={(e) => setNewCollectionParent(e.target.value || undefined)}
                className={styles.parentSelect}
              >
                <option value="">ルートフォルダ</option>
                {collectionStore.collections.map((collection) => (
                  <option key={collection.id} value={collection.id}>
                    {collection.name}
                  </option>
                ))}
              </select>
              <div className={styles.createActions}>
                <button
                  onClick={handleCreateCollection}
                  className={styles.saveButton}
                  type="button"
                >
                  作成
                </button>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className={styles.cancelButton}
                  type="button"
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}

          <div className={styles.collectionList}>
            {rootCollections.length > 0 ? (
              rootCollections.map((collection) => renderCollection(collection))
            ) : (
              <div className={styles.emptyState}>
                <p>コレクションがありません</p>
                <p>新しいコレクションを作成してリクエストを整理しましょう</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

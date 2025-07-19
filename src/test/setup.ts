import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { vi, beforeEach, afterEach } from 'vitest'

// グローバルモック設定
global.fetch = vi.fn()

// モック関数のリセット
beforeEach(() => {
  vi.clearAllMocks()
})

// テスト後のクリーンアップ
afterEach(() => {
  vi.restoreAllMocks()
  cleanup()
})

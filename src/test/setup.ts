import '@testing-library/jest-dom'
import { vi, beforeEach, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

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
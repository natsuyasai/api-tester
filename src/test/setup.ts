import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { vi, beforeEach, afterEach } from 'vitest'

// グローバルモック設定
global.fetch = vi.fn()

// DOM環境のセットアップ
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// モック関数のリセット
beforeEach(() => {
  vi.clearAllMocks()
  // DOM要素をクリーンアップ
  document.body.innerHTML = ''
})

// テスト後のクリーンアップ
afterEach(() => {
  vi.restoreAllMocks()
  cleanup()
})

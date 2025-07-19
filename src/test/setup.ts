import '@testing-library/jest-dom'

// グローバルモック設定
global.fetch = vi.fn()

// モック関数のリセット
beforeEach(() => {
  vi.clearAllMocks()
})

// テスト後のクリーンアップ
afterEach(() => {
  vi.restoreAllMocks()
})
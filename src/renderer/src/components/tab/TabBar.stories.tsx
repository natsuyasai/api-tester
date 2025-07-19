import type { Meta, StoryObj } from '@storybook/react'
import { expect, userEvent, within } from 'storybook/test'
import { useApiStore } from '@renderer/stores/apiStore'
import { TabBar } from './TabBar'

const meta: Meta<typeof TabBar> = {
  title: 'Components/TabBar',
  component: TabBar,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'タブバーコンポーネント。複数のAPIリクエストをタブで管理します。'
      }
    }
  }
}

export default meta
type Story = StoryObj<typeof TabBar>

export const Default: Story = {
  decorators: [
    (Story) => {
      const store = useApiStore.getState()

      // 既存のタブをクリア
      store.tabs.forEach((tab) => store.closeTab(tab.id))

      // 2つのタブを作成
      store.addTab()
      const firstTab = store.tabs[0]
      store.updateUrl(firstTab.id, 'https://api.example.com/users')
      store.updateTabTitle(firstTab.id, 'Users API')

      store.addTab()
      const secondTab = store.tabs[1]
      store.updateUrl(secondTab.id, 'https://api.example.com/posts')
      store.updateTabTitle(secondTab.id, 'Posts API')

      return (
        <div style={{ width: '100%', height: '50px' }}>
          <Story />
        </div>
      )
    }
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // タブが表示されていることを確認
    await expect(canvas.getByText('Users API')).toBeInTheDocument()
    await expect(canvas.getByText('Posts API')).toBeInTheDocument()

    // 新しいタブボタンが表示されていることを確認
    await expect(canvas.getByRole('button', { name: '+' })).toBeInTheDocument()
  }
}

export const SingleTab: Story = {
  decorators: [
    (Story) => {
      const store = useApiStore.getState()

      // 既存のタブをクリア
      store.tabs.forEach((tab) => store.closeTab(tab.id))

      // 1つのタブを作成
      store.addTab()
      const tab = store.tabs[0]
      store.updateUrl(tab.id, 'https://api.example.com/users')
      store.updateTabTitle(tab.id, 'Users API')

      return (
        <div style={{ width: '100%', height: '50px' }}>
          <Story />
        </div>
      )
    }
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // 単一のタブが表示されていることを確認
    await expect(canvas.getByText('Users API')).toBeInTheDocument()

    // 閉じるボタンが表示されないことを確認（単一タブの場合）
    await expect(canvas.queryByLabelText('Close tab')).not.toBeInTheDocument()
  }
}

export const LongTabTitles: Story = {
  decorators: [
    (Story) => {
      const store = useApiStore.getState()

      // 既存のタブをクリア
      store.tabs.forEach((tab) => store.closeTab(tab.id))

      // 長いタイトルのタブを作成
      store.addTab()
      const firstTab = store.tabs[0]
      store.updateUrl(firstTab.id, 'https://api.example.com/very/long/endpoint/path')
      store.updateTabTitle(firstTab.id, 'Very Long Tab Title That Should Be Truncated')

      store.addTab()
      const secondTab = store.tabs[1]
      store.updateUrl(secondTab.id, 'https://api.example.com/another/long/endpoint')
      store.updateTabTitle(
        secondTab.id,
        'Another Very Long Tab Title That Should Also Be Truncated'
      )

      return (
        <div style={{ width: '400px', height: '50px' }}>
          <Story />
        </div>
      )
    }
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // 長いタイトルが表示されていることを確認（切り詰められている可能性あり）
    await expect(canvas.getByText(/Very Long Tab Title/)).toBeInTheDocument()
    await expect(canvas.getByText(/Another Very Long Tab Title/)).toBeInTheDocument()
  }
}

export const EmptyTitle: Story = {
  decorators: [
    (Story) => {
      const store = useApiStore.getState()

      // 既存のタブをクリア
      store.tabs.forEach((tab) => store.closeTab(tab.id))

      // 空のタイトルのタブを作成
      store.addTab()
      const tab = store.tabs[0]
      store.updateUrl(tab.id, '')
      store.updateTabTitle(tab.id, '')

      return (
        <div style={{ width: '100%', height: '50px' }}>
          <Story />
        </div>
      )
    }
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // デフォルトのタブタイトル（「Untitled」など）が表示されることを確認
    await expect(canvas.getByText(/Untitled|New Tab/)).toBeInTheDocument()
  }
}

export const InteractiveExample: Story = {
  decorators: [
    (Story) => {
      const store = useApiStore.getState()

      // 既存のタブをクリア
      store.tabs.forEach((tab) => store.closeTab(tab.id))

      // 複数のタブを作成
      store.addTab()
      const firstTab = store.tabs[0]
      store.updateUrl(firstTab.id, 'https://api.example.com/users')
      store.updateTabTitle(firstTab.id, 'Users API')

      store.addTab()
      const secondTab = store.tabs[1]
      store.updateUrl(secondTab.id, 'https://api.example.com/posts')
      store.updateTabTitle(secondTab.id, 'Posts API')

      store.addTab()
      const thirdTab = store.tabs[2]
      store.updateUrl(thirdTab.id, 'https://api.example.com/comments')
      store.updateTabTitle(thirdTab.id, 'Comments API')

      return (
        <div style={{ width: '100%', height: '50px' }}>
          <Story />
        </div>
      )
    }
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // 新しいタブを追加
    const addButton = canvas.getByRole('button', { name: '+' })
    await userEvent.click(addButton)

    // タブの切り替えテスト
    const postsTab = canvas.getByText('Posts API')
    await userEvent.click(postsTab)

    // タブを閉じるテスト
    const closeButtons = canvas.getAllByLabelText('Close tab')
    if (closeButtons.length > 0) {
      await userEvent.click(closeButtons[0])
    }
  }
}

export const EditableTabTitles: Story = {
  decorators: [
    (Story) => {
      const store = useApiStore.getState()

      // 既存のタブをクリア
      store.tabs.forEach((tab) => store.closeTab(tab.id))

      // 編集可能なタブを作成
      store.addTab()
      const tab = store.tabs[0]
      store.updateUrl(tab.id, 'https://api.example.com/editable')
      store.updateTabTitle(tab.id, 'Double-click to edit')

      return (
        <div style={{ width: '100%', height: '50px' }}>
          <Story />
        </div>
      )
    }
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // タブタイトルをダブルクリックして編集モードに入る
    const tabButton = canvas.getByText('Double-click to edit').closest('button')
    if (tabButton) {
      await userEvent.dblClick(tabButton)

      // 入力フィールドが表示されることを確認
      const input = canvas.getByDisplayValue('Double-click to edit')
      await expect(input).toBeInTheDocument()
    }
  }
}

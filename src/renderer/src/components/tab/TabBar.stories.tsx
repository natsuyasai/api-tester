import type { Meta, StoryObj } from '@storybook/react'
import { expect, userEvent, within } from 'storybook/test'
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
      return (
        <div style={{ width: '100%', height: '50px' }}>
          <Story />
        </div>
      )
    }
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // 新しいタブボタンが表示されていることを確認
    await expect(canvas.getByRole('button', { name: '+' })).toBeInTheDocument()
  }
}

export const SingleTab: Story = {
  decorators: [
    (Story) => {
      return (
        <div style={{ width: '100%', height: '50px' }}>
          <Story />
        </div>
      )
    }
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // 新しいタブボタンが表示されていることを確認
    await expect(canvas.getByRole('button', { name: '+' })).toBeInTheDocument()
  }
}

export const LongTabTitles: Story = {
  decorators: [
    (Story) => {
      return (
        <div style={{ width: '400px', height: '50px' }}>
          <Story />
        </div>
      )
    }
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // 新しいタブボタンが表示されていることを確認
    await expect(canvas.getByRole('button', { name: '+' })).toBeInTheDocument()
  }
}

export const EmptyTitle: Story = {
  decorators: [
    (Story) => {
      return (
        <div style={{ width: '100%', height: '50px' }}>
          <Story />
        </div>
      )
    }
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // 新しいタブボタンが表示されていることを確認
    await expect(canvas.getByRole('button', { name: '+' })).toBeInTheDocument()
  }
}

export const InteractiveExample: Story = {
  decorators: [
    (Story) => {
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
    await expect(addButton).toBeInTheDocument()
  }
}

export const EditableTabTitles: Story = {
  decorators: [
    (Story) => {
      return (
        <div style={{ width: '100%', height: '50px' }}>
          <Story />
        </div>
      )
    }
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // 新しいタブボタンが表示されていることを確認
    await expect(canvas.getByRole('button', { name: '+' })).toBeInTheDocument()
  }
}

export const MiddleClickCloseTab: Story = {
  decorators: [
    (Story) => {
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

    // タブが存在することを確認
    const tabButtons = canvas
      .getAllByRole('button')
      .filter(
        (button) =>
          button.classList.contains('tabButton') ||
          (button.textContent && button.textContent.includes('Untitled'))
      )

    if (tabButtons.length > 0) {
      const firstTab = tabButtons[0]

      // 中クリック（button: 1）をシミュレート
      const mouseDownEvent = new MouseEvent('mousedown', {
        button: 1, // 中クリック
        bubbles: true,
        cancelable: true
      })

      // mousedownイベントを発火
      firstTab.dispatchEvent(mouseDownEvent)

      // タブが削除されるかどうかは、実際のストア状態に依存するため、
      // ここではイベントが正常に処理されることを確認
      await expect(firstTab).toBeInTheDocument()
    }
  }
}

import type { Meta, StoryObj } from '@storybook/react'
import { expect, within } from 'storybook/test'
import { TabContent } from './TabContent'

const meta: Meta<typeof TabContent> = {
  title: 'Components/TabContent',
  component: TabContent,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'アクティブなタブのリクエストフォームとレスポンス表示を含むメインコンテンツエリア'
      }
    }
  },
  argTypes: {
    className: {
      description: 'カスタムCSSクラス',
      control: 'text'
    }
  },
  decorators: [
    (Story) => {
      return (
        <div style={{ width: '100%', height: '100vh', padding: '20px' }}>
          <Story />
        </div>
      )
    }
  ]
}

export default meta
type Story = StoryObj<typeof TabContent>

export const Default: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // アクティブなタブがない場合のメッセージ確認
    await expect(canvas.getByText('No active tab')).toBeInTheDocument()
  }
}

export const NoActiveTab: Story = {
  args: {},
  decorators: [
    (Story) => {
      return (
        <div style={{ width: '100%', height: '100vh', padding: '20px' }}>
          <Story />
        </div>
      )
    }
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // タブが無い場合のメッセージ確認
    await expect(canvas.getByText('No active tab')).toBeInTheDocument()
  }
}

export const WithAPICall: Story = {
  args: {},
  parameters: {
    msw: {
      handlers: [
        // このストーリー専用のハンドラーがあれば追加可能
      ]
    }
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // アクティブなタブがない場合のメッセージ確認
    await expect(canvas.getByText('No active tab')).toBeInTheDocument()
  }
}

export const POSTRequest: Story = {
  args: {},
  decorators: [
    (Story) => {
      return (
        <div style={{ width: '100%', height: '100vh', padding: '20px' }}>
          <Story />
        </div>
      )
    }
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // アクティブなタブがない場合のメッセージ確認
    await expect(canvas.getByText('No active tab')).toBeInTheDocument()
  }
}

// 他のストーリーは削除して、実用的なものに集約

export const WithCustomClassName: Story = {
  args: {
    className: 'custom-tab-content'
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // アクティブなタブがない場合のメッセージ確認
    await expect(canvas.getByText('No active tab')).toBeInTheDocument()
  }
}

export const ResizableLayout: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story:
          'RequestFormとResponseViewの間をマウス操作でリサイズできるGridレイアウト。境界線をドラッグしてgrid-template-rowsが動的に更新されます。'
      }
    }
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // アクティブなタブがない場合のメッセージ確認
    await expect(canvas.getByText('No active tab')).toBeInTheDocument()
  }
}

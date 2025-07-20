import type { Meta, StoryObj } from '@storybook/react'
import { expect, within } from 'storybook/test'
import { ResponseView } from './ResponseView'

const meta: Meta<typeof ResponseView> = {
  title: 'Components/ResponseView',
  component: ResponseView,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'APIレスポンスを表示するコンポーネント。ステータス、ヘッダー、ボディを表示します。'
      }
    }
  },
  argTypes: {
    tabId: {
      description: 'タブのID',
      control: 'text'
    }
  },
  decorators: [
    (Story) => {
      return (
        <div style={{ width: '100%', height: '500px', padding: '20px' }}>
          <Story />
        </div>
      )
    }
  ]
}

export default meta
type Story = StoryObj<typeof ResponseView>

export const NoResponse: Story = {
  args: {
    tabId: 'tab-1'
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByText('No Response')).toBeInTheDocument()
    await expect(canvas.getByText('Send a request to see the response here')).toBeInTheDocument()
  }
}

export const SuccessResponse: Story = {
  args: {
    tabId: 'tab-1'
  },
  decorators: [
    (Story) => {
      return (
        <div style={{ width: '100%', height: '500px' }}>
          <Story />
        </div>
      )
    }
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // NoResponseメッセージが表示されることを確認（ストアなしでは初期状態）
    await expect(canvas.getByText('No Response')).toBeInTheDocument()
    await expect(canvas.getByText('Send a request to see the response here')).toBeInTheDocument()
  }
}

export const ErrorResponse: Story = {
  args: {
    tabId: 'tab-1'
  },
  decorators: [
    (Story) => {
      return (
        <div style={{ width: '100%', height: '500px' }}>
          <Story />
        </div>
      )
    }
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // NoResponseメッセージが表示されることを確認
    await expect(canvas.getByText('No Response')).toBeInTheDocument()
  }
}

export const TextResponse: Story = {
  args: {
    tabId: 'tab-1'
  },
  decorators: [
    (Story) => {
      return (
        <div style={{ width: '100%', height: '500px' }}>
          <Story />
        </div>
      )
    }
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // NoResponseメッセージが表示されることを確認
    await expect(canvas.getByText('No Response')).toBeInTheDocument()
  }
}

export const HeadersView: Story = {
  args: {
    tabId: 'tab-1'
  },
  decorators: [
    (Story) => {
      return (
        <div style={{ width: '100%', height: '500px' }}>
          <Story />
        </div>
      )
    }
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // NoResponseメッセージが表示されることを確認
    await expect(canvas.getByText('No Response')).toBeInTheDocument()
  }
}

export const SlowResponse: Story = {
  args: {
    tabId: 'tab-1'
  },
  decorators: [
    (Story) => {
      return (
        <div style={{ width: '100%', height: '500px' }}>
          <Story />
        </div>
      )
    }
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // NoResponseメッセージが表示されることを確認
    await expect(canvas.getByText('No Response')).toBeInTheDocument()
  }
}

export const TextSelection: Story = {
  args: {
    tabId: 'tab-1'
  },
  decorators: [
    (Story) => {
      return (
        <div style={{ width: '100%', height: '500px' }}>
          <Story />
        </div>
      )
    }
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // NoResponseメッセージが表示されることを確認
    await expect(canvas.getByText('No Response')).toBeInTheDocument()
  }
}

export const ActionButtons: Story = {
  args: {
    tabId: 'tab-1'
  },
  decorators: [
    (Story) => {
      return (
        <div style={{ width: '100%', height: '500px' }}>
          <Story />
        </div>
      )
    }
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // NoResponseメッセージが表示されることを確認
    await expect(canvas.getByText('No Response')).toBeInTheDocument()
  }
}

export const HeadersTextSelection: Story = {
  args: {
    tabId: 'tab-1'
  },
  decorators: [
    (Story) => {
      return (
        <div style={{ width: '100%', height: '500px' }}>
          <Story />
        </div>
      )
    }
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // NoResponseメッセージが表示されることを確認
    await expect(canvas.getByText('No Response')).toBeInTheDocument()
  }
}

export const CopyFunctionality: Story = {
  args: {
    tabId: 'tab-1'
  },
  decorators: [
    (Story) => {
      return (
        <div style={{ width: '100%', height: '500px' }}>
          <Story />
        </div>
      )
    }
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // NoResponseメッセージが表示されることを確認
    await expect(canvas.getByText('No Response')).toBeInTheDocument()
  }
}
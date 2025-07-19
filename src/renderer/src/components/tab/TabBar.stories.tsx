import type { Meta, StoryObj } from '@storybook/react'
import { TabBar } from './TabBar'

// Mock useApiStore hook
const mockUseApiStore = (state: any) => state

// Create mock component with data
const TabBarWithMockData = ({ tabs, ...props }: any) => {
  // Override the useApiStore temporarily
  const originalModule = require('@/stores/apiStore')
  originalModule.useApiStore = () => ({
    tabs: tabs || [
      {
        id: 'tab-1',
        title: 'Users API',
        isActive: true,
        request: {
          id: 'req-1',
          name: 'Get Users',
          url: 'https://api.example.com/users',
          method: 'GET',
          headers: [],
          params: [],
          body: '',
          bodyType: 'json',
          type: 'rest'
        },
        response: null
      },
      {
        id: 'tab-2',
        title: 'Posts API',
        isActive: false,
        request: {
          id: 'req-2',
          name: 'Get Posts',
          url: 'https://api.example.com/posts',
          method: 'GET',
          headers: [],
          params: [],
          body: '',
          bodyType: 'json',
          type: 'rest'
        },
        response: null
      }
    ],
    addTab: () => console.log('addTab called'),
    closeTab: (id: string) => console.log('closeTab called', id),
    setActiveTab: (id: string) => console.log('setActiveTab called', id)
  })
  
  return <TabBar {...props} />
}

const meta: Meta<typeof TabBarWithMockData> = {
  title: 'Components/TabBar',
  component: TabBarWithMockData,
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
type Story = StoryObj<typeof TabBarWithMockData>

export const Default: Story = {
  args: {},
  decorators: [
    (Story) => (
      <div style={{ width: '100%', height: '50px' }}>
        <Story />
      </div>
    )
  ]
}

export const SingleTab: Story = {
  args: {
    tabs: [
      {
        id: 'tab-1',
        title: 'Users API',
        isActive: true,
        request: {
          id: 'req-1',
          name: 'Get Users',
          url: 'https://api.example.com/users',
          method: 'GET',
          headers: [],
          params: [],
          body: '',
          bodyType: 'json',
          type: 'rest'
        },
        response: null
      }
    ]
  },
  decorators: [
    (Story) => (
      <div style={{ width: '100%', height: '50px' }}>
        <Story />
      </div>
    )
  ]
}

export const LongTabTitles: Story = {
  args: {
    tabs: [
      {
        id: 'tab-1',
        title: 'Very Long Tab Title That Should Be Truncated',
        isActive: true,
        request: {
          id: 'req-1',
          name: 'Very Long Request Name',
          url: 'https://api.example.com/very/long/endpoint/path',
          method: 'GET',
          headers: [],
          params: [],
          body: '',
          bodyType: 'json',
          type: 'rest'
        },
        response: null
      },
      {
        id: 'tab-2',
        title: 'Another Very Long Tab Title That Should Also Be Truncated',
        isActive: false,
        request: {
          id: 'req-2',
          name: 'Another Long Request',
          url: 'https://api.example.com/another/long/endpoint',
          method: 'POST',
          headers: [],
          params: [],
          body: '',
          bodyType: 'json',
          type: 'rest'
        },
        response: null
      }
    ]
  },
  decorators: [
    (Story) => (
      <div style={{ width: '400px', height: '50px' }}>
        <Story />
      </div>
    )
  ]
}

export const EmptyTitle: Story = {
  args: {
    tabs: [
      {
        id: 'tab-1',
        title: '',
        isActive: true,
        request: {
          id: 'req-1',
          name: 'Untitled Request',
          url: '',
          method: 'GET',
          headers: [],
          params: [],
          body: '',
          bodyType: 'json',
          type: 'rest'
        },
        response: null
      }
    ]
  },
  decorators: [
    (Story) => (
      <div style={{ width: '100%', height: '50px' }}>
        <Story />
      </div>
    )
  ]
}
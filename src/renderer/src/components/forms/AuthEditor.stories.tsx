import { action } from '@storybook/addon-actions'
import type { Meta, StoryObj } from '@storybook/react'
import { expect, userEvent, within } from '@storybook/test'
import type { AuthConfig } from '@/types/types'
import { AuthEditor } from './AuthEditor'

const meta: Meta<typeof AuthEditor> = {
  title: 'Forms/AuthEditor',
  component: AuthEditor,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'API認証設定のためのフォームコンポーネント。Basic認証、Bearer Token、API Keyの設定に対応。'
      }
    }
  },
  argTypes: {
    auth: {
      description: '現在の認証設定',
      control: 'object'
    },
    onChange: {
      description: '認証設定が変更された時のコールバック',
      action: 'changed'
    }
  }
}

export default meta
type Story = StoryObj<typeof AuthEditor>

// デフォルト状態（認証なし）
export const Default: Story = {
  args: {
    onChange: action('auth-changed')
  }
}

// Basic認証の設定
export const BasicAuth: Story = {
  args: {
    auth: {
      type: 'basic',
      basic: {
        username: 'testuser',
        password: 'testpass'
      }
    } as AuthConfig,
    onChange: action('auth-changed')
  }
}

// Bearer Token認証の設定
export const BearerAuth: Story = {
  args: {
    auth: {
      type: 'bearer',
      bearer: {
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
      }
    } as AuthConfig,
    onChange: action('auth-changed')
  }
}

// API Key認証の設定（Header）
export const ApiKeyHeader: Story = {
  args: {
    auth: {
      type: 'api-key',
      apiKey: {
        key: 'X-API-Key',
        value: 'your-api-key-here',
        location: 'header'
      }
    } as AuthConfig,
    onChange: action('auth-changed')
  }
}

// API Key認証の設定（Query Parameter）
export const ApiKeyQuery: Story = {
  args: {
    auth: {
      type: 'api-key',
      apiKey: {
        key: 'api_key',
        value: 'your-api-key-here',
        location: 'query'
      }
    } as AuthConfig,
    onChange: action('auth-changed')
  }
}

// 空の設定状態
export const EmptyAuth: Story = {
  args: {
    auth: {
      type: 'none'
    } as AuthConfig,
    onChange: action('auth-changed')
  }
}

// インタラクションテスト: 認証タイプの変更
export const AuthTypeChange: Story = {
  args: {
    onChange: action('auth-changed')
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // 初期状態は「認証なし」
    const typeSelect = canvas.getByRole('combobox', { name: /認証タイプ/ })
    await expect(typeSelect).toHaveValue('none')

    // Basic認証に変更
    await userEvent.selectOptions(typeSelect, 'basic')

    // Basic認証のフィールドが表示される
    await expect(canvas.getByLabelText(/ユーザー名/)).toBeInTheDocument()
    await expect(canvas.getByLabelText(/パスワード/)).toBeInTheDocument()

    // Bearer Tokenに変更
    await userEvent.selectOptions(typeSelect, 'bearer')

    // Bearer Tokenのフィールドが表示される
    await expect(canvas.getByLabelText(/Token/)).toBeInTheDocument()

    // API Keyに変更
    await userEvent.selectOptions(typeSelect, 'api-key')

    // API Keyのフィールドが表示される
    await expect(canvas.getByLabelText(/キー名/)).toBeInTheDocument()
    await expect(canvas.getByLabelText(/値/)).toBeInTheDocument()
    await expect(canvas.getByLabelText(/配置場所/)).toBeInTheDocument()
  }
}

// インタラクションテスト: Basic認証の入力
export const BasicAuthInput: Story = {
  args: {
    onChange: action('auth-changed')
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Basic認証を選択
    const typeSelect = canvas.getByRole('combobox', { name: /認証タイプ/ })
    await userEvent.selectOptions(typeSelect, 'basic')

    // ユーザー名を入力
    const usernameInput = canvas.getByLabelText(/ユーザー名/)
    await userEvent.type(usernameInput, 'admin')
    await expect(usernameInput).toHaveValue('admin')

    // パスワードを入力
    const passwordInput = canvas.getByLabelText(/パスワード/)
    await userEvent.type(passwordInput, 'secret123')
    await expect(passwordInput).toHaveValue('secret123')
    await expect(passwordInput).toHaveAttribute('type', 'password')
  }
}

// インタラクションテスト: Bearer Token認証の入力
export const BearerAuthInput: Story = {
  args: {
    onChange: action('auth-changed')
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Bearer認証を選択
    const typeSelect = canvas.getByRole('combobox', { name: /認証タイプ/ })
    await userEvent.selectOptions(typeSelect, 'bearer')

    // Tokenを入力
    const tokenInput = canvas.getByLabelText(/Token/)
    const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'
    await userEvent.type(tokenInput, testToken)
    await expect(tokenInput).toHaveValue(testToken)
  }
}

// インタラクションテスト: API Key認証の入力と配置場所変更
export const ApiKeyInput: Story = {
  args: {
    onChange: action('auth-changed')
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // API Key認証を選択
    const typeSelect = canvas.getByRole('combobox', { name: /認証タイプ/ })
    await userEvent.selectOptions(typeSelect, 'api-key')

    // キー名を入力
    const keyInput = canvas.getByLabelText(/キー名/)
    await userEvent.type(keyInput, 'X-API-Key')
    await expect(keyInput).toHaveValue('X-API-Key')

    // 値を入力
    const valueInput = canvas.getByLabelText(/値/)
    await userEvent.type(valueInput, 'abc123xyz')
    await expect(valueInput).toHaveValue('abc123xyz')

    // 配置場所を確認（デフォルトはheader）
    const locationSelect = canvas.getByLabelText(/配置場所/)
    await expect(locationSelect).toHaveValue('header')

    // Query Parameterに変更
    await userEvent.selectOptions(locationSelect, 'query')
    await expect(locationSelect).toHaveValue('query')
  }
}

// エラーケース: 既存設定の保持テスト
export const ExistingSettingsPreservation: Story = {
  args: {
    auth: {
      type: 'basic',
      basic: {
        username: 'existing_user',
        password: 'existing_pass'
      },
      bearer: {
        token: 'existing_token'
      },
      apiKey: {
        key: 'existing_key',
        value: 'existing_value',
        location: 'query'
      }
    } as AuthConfig,
    onChange: action('auth-changed')
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // 初期状態でBasic認証の値が表示される
    await expect(canvas.getByDisplayValue('existing_user')).toBeInTheDocument()
    await expect(canvas.getByDisplayValue('existing_pass')).toBeInTheDocument()

    // Bearer認証に切り替え
    const typeSelect = canvas.getByRole('combobox', { name: /認証タイプ/ })
    await userEvent.selectOptions(typeSelect, 'bearer')

    // Bearerの既存値が表示される（設定が保持されている）
    await expect(canvas.getByDisplayValue('existing_token')).toBeInTheDocument()

    // API Key認証に切り替え
    await userEvent.selectOptions(typeSelect, 'api-key')

    // API Keyの既存値が表示される
    await expect(canvas.getByDisplayValue('existing_key')).toBeInTheDocument()
    await expect(canvas.getByDisplayValue('existing_value')).toBeInTheDocument()
    await expect(canvas.getByDisplayValue('query')).toBeInTheDocument()

    // Basic認証に戻す
    await userEvent.selectOptions(typeSelect, 'basic')

    // Basic認証の値が保持されている
    await expect(canvas.getByDisplayValue('existing_user')).toBeInTheDocument()
    await expect(canvas.getByDisplayValue('existing_pass')).toBeInTheDocument()
  }
}

// アクセシビリティテスト
export const AccessibilityTest: Story = {
  args: {
    onChange: action('auth-changed')
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // ラベルとフィールドの関連付けを確認
    const typeSelect = canvas.getByRole('combobox', { name: /認証タイプ/ })
    await expect(typeSelect).toBeInTheDocument()

    // Basic認証を選択してフィールドの関連付けを確認
    await userEvent.selectOptions(typeSelect, 'basic')

    const usernameInput = canvas.getByLabelText(/ユーザー名/)
    const passwordInput = canvas.getByLabelText(/パスワード/)

    await expect(usernameInput).toHaveAttribute('placeholder', 'ユーザー名を入力')
    await expect(passwordInput).toHaveAttribute('placeholder', 'パスワードを入力')
    await expect(passwordInput).toHaveAttribute('type', 'password')

    // フォーカス管理の確認
    await userEvent.tab()
    await expect(usernameInput).toHaveFocus()
  }
}

// 視覚的回帰テスト用のすべての状態
export const AllAuthTypes: Story = {
  render: () => (
    <div
      style={{
        display: 'grid',
        gap: '2rem',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))'
      }}
    >
      <div>
        <h4>認証なし</h4>
        <AuthEditor onChange={action('none-changed')} />
      </div>
      <div>
        <h4>Basic認証</h4>
        <AuthEditor
          auth={{
            type: 'basic',
            basic: { username: 'user', password: 'pass' }
          }}
          onChange={action('basic-changed')}
        />
      </div>
      <div>
        <h4>Bearer Token</h4>
        <AuthEditor
          auth={{
            type: 'bearer',
            bearer: { token: 'token123' }
          }}
          onChange={action('bearer-changed')}
        />
      </div>
      <div>
        <h4>API Key (Header)</h4>
        <AuthEditor
          auth={{
            type: 'api-key',
            apiKey: { key: 'X-API-Key', value: 'key123', location: 'header' }
          }}
          onChange={action('apikey-header-changed')}
        />
      </div>
      <div>
        <h4>API Key (Query)</h4>
        <AuthEditor
          auth={{
            type: 'api-key',
            apiKey: { key: 'api_key', value: 'key123', location: 'query' }
          }}
          onChange={action('apikey-query-changed')}
        />
      </div>
    </div>
  )
}

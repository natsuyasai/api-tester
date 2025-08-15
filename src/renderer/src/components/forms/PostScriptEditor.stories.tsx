import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test'
import { expect, userEvent, within } from '@storybook/test'
import { SCRIPT_TEMPLATES } from '@/services/postScriptEngine'
import { PostScriptEditor } from './PostScriptEditor'

const meta: Meta<typeof PostScriptEditor> = {
  title: 'Forms/PostScriptEditor',
  component: PostScriptEditor,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'API実行後にレスポンスからグローバル変数を生成するJavaScriptスクリプトを編集するコンポーネント。テンプレート選択、ヘルプ表示、コード編集機能を提供。'
      }
    }
  },
  argTypes: {
    postScript: {
      description: '現在のポストスクリプトコード',
      control: 'text'
    },
    onChange: {
      description: 'スクリプトが変更された時のコールバック',
      action: 'changed'
    }
  }
}

export default meta
type Story = StoryObj<typeof PostScriptEditor>

// デフォルト状態（空のスクリプト）
export const Default: Story = {
  args: {
    onChange: fn()
  }
}

// 基本的なスクリプトが設定された状態
export const WithBasicScript: Story = {
  args: {
    postScript: `// 基本的なトークン抽出の例
if (getStatus() === 200) {
  const token = getData('access_token');
  if (token) {
    setGlobalVariable('AUTH_TOKEN', token, '認証トークン');
  }
  
  const userId = getData('user.id');
  if (userId) {
    setGlobalVariable('USER_ID', String(userId), 'ユーザーID');
  }
}`,
    onChange: fn()
  }
}

// 複雑なスクリプトの例
export const WithComplexScript: Story = {
  args: {
    postScript: SCRIPT_TEMPLATES.complexProcessing,
    onChange: fn()
  }
}

// ヘルプが表示された状態
export const WithHelpOpen: Story = {
  args: {
    postScript: `// ヘルプを確認してスクリプトを記述してください
console.log('Hello, PostScript!');`,
    onChange: fn()
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // ヘルプボタンをクリック
    const helpButton = canvas.getByTitle('ヘルプを表示')
    await userEvent.click(helpButton)

    // ヘルプが表示されることを確認
    await expect(canvas.getByText('利用可能な関数とオブジェクト')).toBeInTheDocument()
    await expect(canvas.getByText('データアクセス')).toBeInTheDocument()
    await expect(canvas.getByText('変数操作')).toBeInTheDocument()
  }
}

// テンプレート選択のテスト
export const TemplateSelection: Story = {
  args: {
    onChange: fn()
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // テンプレート選択のセレクトボックスを探す
    const templateSelect = canvas.getByDisplayValue('テンプレートを選択...')
    await expect(templateSelect).toBeInTheDocument()

    // 基本的なJSON抽出テンプレートを選択
    await userEvent.selectOptions(templateSelect, 'basicJsonExtraction')

    // テキストエリアにテンプレートが設定されることを確認
    const editor = canvas.getByRole('textbox')
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await expect(editor).toHaveValue(expect.stringContaining('getStatus() === 200'))
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await expect(editor).toHaveValue(expect.stringContaining("getData('token')"))
  }
}

// スクリプト入力のテスト
export const ScriptInput: Story = {
  args: {
    onChange: fn()
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // エディターにスクリプトを入力
    const editor = canvas.getByRole('textbox')
    const testScript = `// テストスクリプト
const token = getData('token');
if (token) {
  setGlobalVariable('TEST_TOKEN', token, 'テストトークン');
}`

    await userEvent.clear(editor)
    await userEvent.type(editor, testScript)

    // 文字数カウンターが更新されることを確認
    const expectedLength = testScript.length
    await expect(canvas.getByText(`文字数: ${expectedLength}`)).toBeInTheDocument()
  }
}

// 各テンプレートの表示テスト
export const BasicJsonExtractionTemplate: Story = {
  args: {
    postScript: SCRIPT_TEMPLATES.basicJsonExtraction,
    onChange: fn()
  }
}

export const ArrayDataExtractionTemplate: Story = {
  args: {
    postScript: SCRIPT_TEMPLATES.arrayDataExtraction,
    onChange: fn()
  }
}

export const HeaderExtractionTemplate: Story = {
  args: {
    postScript: SCRIPT_TEMPLATES.headerExtraction,
    onChange: fn()
  }
}

export const ConditionalProcessingTemplate: Story = {
  args: {
    postScript: SCRIPT_TEMPLATES.conditionalProcessing,
    onChange: fn()
  }
}

// インタラクションテスト: テンプレート切り替え
export const TemplateSwitching: Story = {
  args: {
    onChange: fn()
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    const templateSelect = canvas.getByDisplayValue('テンプレートを選択...')
    const editor = canvas.getByRole('textbox')

    // 配列データ抽出テンプレートを選択
    await userEvent.selectOptions(templateSelect, 'arrayDataExtraction')
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await expect(editor).toHaveValue(expect.stringContaining('Array.isArray(items)'))

    // ヘッダー抽出テンプレートに切り替え
    await userEvent.selectOptions(templateSelect, 'headerExtraction')
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await expect(editor).toHaveValue(expect.stringContaining('getHeaders()'))

    // 条件付き処理テンプレートに切り替え
    await userEvent.selectOptions(templateSelect, 'conditionalProcessing')
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await expect(editor).toHaveValue(expect.stringContaining('if (status === 200)'))
  }
}

// UIコンポーネントの表示確認
export const UIComponents: Story = {
  args: {
    postScript: '// スクリプトを記述してください',
    onChange: fn()
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // 主要なUI要素が存在することを確認
    await expect(canvas.getByText('ポストスクリプト')).toBeInTheDocument()
    await expect(canvas.getByDisplayValue('テンプレートを選択...')).toBeInTheDocument()
    await expect(canvas.getByTitle('ヘルプを表示')).toBeInTheDocument()
    await expect(
      canvas.getByText(
        'API実行後にレスポンスからグローバル変数を生成するJavaScriptコードを記述してください'
      )
    ).toBeInTheDocument()
    await expect(canvas.getByRole('textbox')).toBeInTheDocument()
    await expect(
      canvas.getByText(
        '💡 ヒント: レスポンスから動的に値を抽出してグローバル変数として保存できます'
      )
    ).toBeInTheDocument()
    await expect(canvas.getByText(/文字数:/)).toBeInTheDocument()
  }
}

// アクセシビリティテスト
export const AccessibilityTest: Story = {
  args: {
    onChange: fn()
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // フォーカス可能な要素の確認
    const templateSelect = canvas.getByDisplayValue('テンプレートを選択...')
    const helpButton = canvas.getByTitle('ヘルプを表示')
    const editor = canvas.getByRole('textbox')

    // タブ移動の確認
    await userEvent.tab()
    await expect(templateSelect).toHaveFocus()

    await userEvent.tab()
    await expect(helpButton).toHaveFocus()

    await userEvent.tab()
    await expect(editor).toHaveFocus()

    // エディターでのキーボード操作
    await userEvent.type(editor, 'console.log("test");')
    await expect(editor).toHaveValue('console.log("test");')
  }
}

// エラーハンドリング表示用（実際のエラーではなく、UIの表示確認）
export const LongScript: Story = {
  args: {
    postScript: `// 長いスクリプトの例
// このスクリプトは、複数の処理を組み合わせた例です

// 1. 基本的な認証トークンの処理
if (getStatus() === 200) {
  const token = getData('access_token') || getData('token');
  if (token) {
    setGlobalVariable('AUTH_TOKEN', token, 'API認証トークン');
    console.log('トークンを設定しました:', token);
  }
}

// 2. ユーザー情報の処理
const user = getData('user') || getData('data.user');
if (user) {
  if (user.id) {
    setGlobalVariable('USER_ID', String(user.id), 'ユーザーID');
  }
  
  if (user.email) {
    setGlobalVariable('USER_EMAIL', user.email, 'ユーザーメールアドレス');
  }
  
  if (user.name) {
    setGlobalVariable('USER_NAME', user.name, 'ユーザー名');
  }
  
  console.log('ユーザー情報を処理しました');
}

// 3. ページネーション情報の処理
const pagination = getData('pagination') || getData('meta.pagination');
if (pagination) {
  if (pagination.next_page) {
    setGlobalVariable('NEXT_PAGE', String(pagination.next_page), '次のページ番号');
  }
  
  if (pagination.total) {
    setGlobalVariable('TOTAL_COUNT', String(pagination.total), '総件数');
  }
}

// 4. エラーハンドリング
const status = getStatus();
if (status >= 400) {
  const errorMessage = getData('error') || getData('message') || 'Unknown error';
  setGlobalVariable('LAST_ERROR', String(errorMessage), '最後のエラーメッセージ');
  console.error('エラーが発生しました:', status, errorMessage);
}

// 5. 実行時刻の記録
const now = new Date().toISOString();
setGlobalVariable('LAST_EXECUTION_TIME', now, '最後の実行時刻');

console.log('ポストスクリプトの実行が完了しました');`,
    onChange: fn()
  }
}

// 視覚的回帰テスト用のすべての表示状態
export const AllStates: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: '1fr 1fr' }}>
      <div>
        <h4>デフォルト状態</h4>
        <PostScriptEditor onChange={fn()} />
      </div>
      <div>
        <h4>スクリプト設定済み</h4>
        <PostScriptEditor postScript={SCRIPT_TEMPLATES.basicJsonExtraction} onChange={fn()} />
      </div>
    </div>
  )
}

import { JSX, useState } from 'react'
import { SCRIPT_TEMPLATES } from '@/services/postScriptEngine'
import { CodeTextarea } from '../common/CodeTextarea'
import styles from './PostScriptEditor.module.scss'

interface PostScriptEditorProps {
  postScript?: string
  onChange: (postScript: string) => void
}

type TemplateKey = keyof typeof SCRIPT_TEMPLATES

export const PostScriptEditor = ({
  postScript = '',
  onChange
}: PostScriptEditorProps): JSX.Element => {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateKey | ''>('')
  const [showHelp, setShowHelp] = useState(false)

  const handleTemplateSelect = (templateKey: TemplateKey | '') => {
    setSelectedTemplate(templateKey)
    if (templateKey !== '') {
      onChange(SCRIPT_TEMPLATES[templateKey])
    }
  }

  const templateOptions: Array<{ key: TemplateKey | ''; label: string }> = [
    { key: '', label: 'テンプレートを選択...' },
    { key: 'basicJsonExtraction', label: '基本的なJSON値抽出' },
    { key: 'arrayDataExtraction', label: '配列データから抽出' },
    { key: 'headerExtraction', label: 'ヘッダーから抽出' },
    { key: 'conditionalProcessing', label: '条件付き処理' },
    { key: 'complexProcessing', label: '複合的な処理' }
  ]

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>ポストスクリプト</h3>
        <div className={styles.controls}>
          <select
            value={selectedTemplate}
            onChange={(e) => handleTemplateSelect(e.target.value as TemplateKey | '')}
            className={styles.templateSelect}
          >
            {templateOptions.map((option) => (
              <option key={option.key || 'empty'} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            className={styles.helpButton}
            title="ヘルプを表示"
          >
            ?
          </button>
        </div>
      </div>

      <div className={styles.description}>
        API実行後にレスポンスからグローバル変数を生成するJavaScriptコードを記述してください
      </div>

      {showHelp && (
        <div className={styles.help}>
          <h4>利用可能な関数とオブジェクト</h4>
          <div className={styles.helpSection}>
            <h5>データアクセス</h5>
            <ul>
              <li>
                <code>getData()</code> - レスポンスデータ全体を取得
              </li>
              <li>
                <code>getData(&apos;path&apos;)</code> - 指定されたパスのデータを取得（例:
                &apos;user.id&apos;, &apos;data.items[0].name&apos;）
              </li>
              <li>
                <code>getStatus()</code> - HTTPステータスコードを取得
              </li>
              <li>
                <code>getHeaders()</code> - レスポンスヘッダーを取得
              </li>
              <li>
                <code>getDuration()</code> - リクエスト実行時間を取得
              </li>
            </ul>
          </div>
          <div className={styles.helpSection}>
            <h5>変数操作</h5>
            <ul>
              <li>
                <code>setGlobalVariable(key, value, description?)</code> - グローバル変数を設定
              </li>
              <li>
                <code>getGlobalVariable(key)</code> - 既存のグローバル変数を取得
              </li>
            </ul>
          </div>
          <div className={styles.helpSection}>
            <h5>ログ出力</h5>
            <ul>
              <li>
                <code>console.log()</code> - 情報ログを出力
              </li>
              <li>
                <code>console.error()</code> - エラーログを出力
              </li>
              <li>
                <code>console.warn()</code> - 警告ログを出力
              </li>
            </ul>
          </div>
          <div className={styles.helpSection}>
            <h5>使用例</h5>
            <pre className={styles.example}>{`// 基本的な使用例
if (getStatus() === 200) {
  const token = getData('access_token');
  if (token) {
    setGlobalVariable('AUTH_TOKEN', token, '認証トークン');
  }
  
  const userId = getData('user.id');
  if (userId) {
    setGlobalVariable('USER_ID', String(userId), 'ユーザーID');
  }
}`}</pre>
          </div>
        </div>
      )}

      <div className={styles.editorContainer}>
        <CodeTextarea
          value={postScript}
          onChange={onChange}
          className={styles.editor}
          placeholder="// API実行後に実行するJavaScriptコードを記述してください
// 例：
// if (getStatus() === 200) {
//   const token = getData('access_token');
//   if (token) {
//     setGlobalVariable('AUTH_TOKEN', token, '認証トークン');
//   }
// }"
          rows={15}
          spellCheck={false}
        />
      </div>

      <div className={styles.footer}>
        <div className={styles.info}>
          <span>💡 ヒント: レスポンスから動的に値を抽出してグローバル変数として保存できます</span>
        </div>
        <div className={styles.stats}>文字数: {postScript.length}</div>
      </div>
    </div>
  )
}

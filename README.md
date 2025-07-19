# api-tester

WebAPIの動作確認を行うためのツール

## 機能

- RestAPIの実行
  - URL、リクエストヘッダー、リクエストパラメータの入力
    - 入力はテーブル形式とtextareaを使用したjsonの入力が可能
- 複数タブを表示可能で、タブ毎に定義が可能
- APIの実行の定義はyamlファイルとしてインポート、エクスポートが可能
- GraphQLにも対応

## テスト

vitestを使用  
ロジックに関してはカバレッジを70%は満たせるようにする  
UIはStorybookを使用  
UI観点のテストはStorybookのPlayFunctionを使用してい行う

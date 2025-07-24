/**
 * Undiciライブラリへの依存を抽象化するインターフェース
 */
export interface UndiciLibraryInterface {
  request: (url: string, options: any) => Promise<any>
  ProxyAgent: new (options: any) => any
  getGlobalDispatcher: () => any
  interceptors: {
    redirect: (options: { maxRedirections: number }) => any
  }
  Agent: new (options: any) => any
}

/**
 * Node.js fsモジュールへの依存を抽象化するインターフェース
 */
export interface FsInterface {
  readFileSync: (path: string, encoding: string) => string
}

/**
 * 実際のUndiciライブラリを使用する実装
 */
export class RealUndiciLibrary implements UndiciLibraryInterface {
  private undiciModule: any = null

  async initialize(): Promise<void> {
    if (!this.undiciModule) {
      this.undiciModule = await import('undici')
    }
  }

  get request() {
    return this.undiciModule.request
  }

  get ProxyAgent() {
    return this.undiciModule.ProxyAgent
  }

  get getGlobalDispatcher() {
    return this.undiciModule.getGlobalDispatcher
  }

  get interceptors() {
    return this.undiciModule.interceptors
  }

  get Agent() {
    return this.undiciModule.Agent
  }
}

/**
 * 実際のNode.js fsモジュールを使用する実装
 */
export class RealFsModule implements FsInterface {
  private fsModule: any = null

  async initialize(): Promise<void> {
    if (!this.fsModule) {
      this.fsModule = await import('fs')
    }
  }

  readFileSync(path: string, encoding: string): string {
    return this.fsModule.readFileSync(path, encoding)
  }
}

/**
 * クライアント証明書設定のインターフェース
 */
export interface ClientCertificateConfigProvider {
  getConfig(): ClientCertificateConfig
}

export interface ClientCertificateConfig {
  enabled: boolean
  certificates: ClientCertificate[]
}

export interface ClientCertificate {
  id: string
  name: string
  host?: string
  certPath: string
  keyPath: string
  passphrase?: string
  enabled: boolean
}

/**
 * デフォルトのクライアント証明書設定プロバイダー
 */
export class DefaultClientCertificateProvider implements ClientCertificateConfigProvider {
  getConfig(): ClientCertificateConfig {
    return {
      enabled: false,
      certificates: []
    }
  }
}

import type { Dispatcher, Agent, ProxyAgent } from 'undici-types'

/**
 * Undiciライブラリへの依存を抽象化するインターフェース
 */
interface UndiciRequest {
  (url: string, options: Dispatcher.RequestOptions): Promise<UndiciResponse>
}

interface UndiciResponse {
  statusCode: number
  headers: Record<string, string | string[]>
  body: {
    arrayBuffer(): Promise<ArrayBuffer>
  }
}

type UndiciAgent = Agent

type UndiciProxyAgent = ProxyAgent

type UndiciDispatcher = Dispatcher

interface UndiciRedirectInterceptor {
  (options: { maxRedirections: number }): unknown
}

interface UndiciInterceptors {
  redirect: UndiciRedirectInterceptor
}

export interface UndiciLibraryInterface {
  request: UndiciRequest
  ProxyAgent: new (options: { uri: string; auth?: string } | string) => UndiciProxyAgent
  getGlobalDispatcher: () => UndiciDispatcher
  interceptors: UndiciInterceptors
  Agent: new (options?: Agent.Options) => UndiciAgent
  FormData: new () => FormData
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
interface UndiciModule {
  request: UndiciRequest
  ProxyAgent: new (options: { uri: string; auth?: string } | string) => UndiciProxyAgent
  getGlobalDispatcher: () => UndiciDispatcher
  interceptors: UndiciInterceptors
  Agent: new (options?: Agent.Options) => UndiciAgent
  FormData: new () => FormData
}

export class RealUndiciLibrary implements UndiciLibraryInterface {
  private undiciModule: UndiciModule | null = null

  async initialize(): Promise<void> {
    if (!this.undiciModule) {
      this.undiciModule = (await import('undici')) as unknown as UndiciModule
    }
  }

  get request(): UndiciRequest {
    return this.undiciModule!.request
  }

  get ProxyAgent(): new (options: { uri: string; auth?: string } | string) => UndiciProxyAgent {
    return this.undiciModule!.ProxyAgent
  }

  get getGlobalDispatcher(): () => UndiciDispatcher {
    return this.undiciModule!.getGlobalDispatcher
  }

  get interceptors(): UndiciInterceptors {
    return this.undiciModule!.interceptors
  }

  get Agent(): new (options?: Agent.Options) => UndiciAgent {
    return this.undiciModule!.Agent
  }

  get FormData(): new () => FormData {
    return this.undiciModule!.FormData
  }
}

/**
 * 実際のNode.js fsモジュールを使用する実装
 */
interface FsModule {
  readFileSync: (path: string, encoding: string) => string
}

export class RealFsModule implements FsInterface {
  private fsModule: FsModule | null = null

  async initialize(): Promise<void> {
    if (!this.fsModule) {
      this.fsModule = (await import('fs')) as FsModule
    }
  }

  readFileSync(path: string, encoding: string): string {
    return this.fsModule!.readFileSync(path, encoding)
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

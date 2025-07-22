/**
 * アプリケーション全体で使用する統一エラーハンドリングユーティリティ
 */
export enum ErrorType {
  VALIDATION = 'validation',
  NETWORK = 'network',
  PARSING = 'parsing',
  STORAGE = 'storage',
  SYSTEM = 'system',
  UNKNOWN = 'unknown'
}

export interface AppError {
  type: ErrorType
  message: string
  originalError?: unknown
  context?: Record<string, unknown>
  timestamp: string
}

/**
 * 統一エラーハンドリングクラス
 */
export class ErrorHandler {
  /**
   * エラーを統一形式に変換
   */
  static createError(
    type: ErrorType,
    message: string,
    originalError?: unknown,
    context?: Record<string, unknown>
  ): AppError {
    return {
      type,
      message,
      originalError,
      context,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * ネットワークエラーの処理
   */
  static handleNetworkError(error: unknown, context?: Record<string, unknown>): AppError {
    const message = this.extractErrorMessage(error) || 'ネットワークエラーが発生しました'
    return this.createError(ErrorType.NETWORK, message, error, context)
  }

  /**
   * 検証エラーの処理
   */
  static handleValidationError(message: string, context?: Record<string, unknown>): AppError {
    return this.createError(ErrorType.VALIDATION, message, undefined, context)
  }

  /**
   * パース/変換エラーの処理
   */
  static handleParsingError(error: unknown, context?: Record<string, unknown>): AppError {
    const message = this.extractErrorMessage(error) || 'データの解析に失敗しました'
    return this.createError(ErrorType.PARSING, message, error, context)
  }

  /**
   * ストレージエラーの処理
   */
  static handleStorageError(error: unknown, context?: Record<string, unknown>): AppError {
    const message = this.extractErrorMessage(error) || 'データの保存に失敗しました'
    return this.createError(ErrorType.STORAGE, message, error, context)
  }

  /**
   * システムエラーの処理
   */
  static handleSystemError(error: unknown, context?: Record<string, unknown>): AppError {
    const message = this.extractErrorMessage(error) || 'システムエラーが発生しました'
    return this.createError(ErrorType.SYSTEM, message, error, context)
  }

  /**
   * 未知のエラーの処理
   */
  static handleUnknownError(error: unknown, context?: Record<string, unknown>): AppError {
    const message = this.extractErrorMessage(error) || '予期しないエラーが発生しました'
    return this.createError(ErrorType.UNKNOWN, message, error, context)
  }

  /**
   * エラーからメッセージを抽出
   */
  static extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message
    }
    if (typeof error === 'string') {
      return error
    }
    if (error && typeof error === 'object' && 'message' in error) {
      return String((error as { message: unknown }).message)
    }
    return ''
  }

  /**
   * エラーをログに出力
   */
  static logError(appError: AppError, shouldConsoleLog = true): void {
    if (shouldConsoleLog) {
      console.error('[ERROR]', {
        type: appError.type,
        message: appError.message,
        context: appError.context,
        timestamp: appError.timestamp
      })

      if (appError.originalError) {
        console.error('[ORIGINAL ERROR]', appError.originalError)
      }
    }
  }

  /**
   * 非同期処理のエラーハンドリングラッパー
   */
  static async withErrorHandling<T>(
    asyncFn: () => Promise<T>,
    errorType: ErrorType = ErrorType.UNKNOWN,
    context?: Record<string, unknown>
  ): Promise<{ result?: T; error?: AppError }> {
    try {
      const result = await asyncFn()
      return { result }
    } catch (error) {
      const appError = this.createError(errorType, this.extractErrorMessage(error), error, context)
      this.logError(appError)
      return { error: appError }
    }
  }

  /**
   * 同期処理のエラーハンドリングラッパー
   */
  static withSyncErrorHandling<T>(
    syncFn: () => T,
    errorType: ErrorType = ErrorType.UNKNOWN,
    context?: Record<string, unknown>
  ): { result?: T; error?: AppError } {
    try {
      const result = syncFn()
      return { result }
    } catch (error) {
      const appError = this.createError(errorType, this.extractErrorMessage(error), error, context)
      this.logError(appError)
      return { error: appError }
    }
  }

  /**
   * 複数エラーの処理
   */
  static handleMultipleErrors(errors: AppError[]): AppError {
    if (errors.length === 0) {
      return this.createError(ErrorType.UNKNOWN, 'エラーが発生しましたが詳細不明です')
    }

    if (errors.length === 1) {
      return errors[0]
    }

    return this.createError(
      ErrorType.SYSTEM,
      `複数のエラーが発生しました (${errors.length}件)`,
      errors,
      { errorCount: errors.length }
    )
  }

  /**
   * エラー情報をユーザーフレンドリーなメッセージに変換
   */
  static getUserFriendlyMessage(appError: AppError): string {
    const typeMessages: Record<ErrorType, string> = {
      [ErrorType.VALIDATION]: '入力内容に問題があります',
      [ErrorType.NETWORK]: 'ネットワーク接続に問題があります',
      [ErrorType.PARSING]: 'データの形式に問題があります',
      [ErrorType.STORAGE]: 'データの保存に失敗しました',
      [ErrorType.SYSTEM]: 'システムエラーが発生しました',
      [ErrorType.UNKNOWN]: '予期しないエラーが発生しました'
    }

    const defaultMessage = typeMessages[appError.type] || '問題が発生しました'
    return appError.message || defaultMessage
  }
}

/**
 * Try-Catch構文のヘルパー関数
 */
export const safeAsync = ErrorHandler.withErrorHandling.bind(ErrorHandler)
export const safeSync = ErrorHandler.withSyncErrorHandling.bind(ErrorHandler)

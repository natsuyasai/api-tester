import { AppError, ErrorHandler } from './errorUtils'

export enum NotificationType {
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  timestamp: string
  autoClose?: number
  actions?: NotificationAction[]
}

export interface NotificationAction {
  label: string
  action: () => void
}

/**
 * 通知管理クラス
 */
export class NotificationManager {
  private static notifications: Notification[] = []
  private static listeners: ((notifications: Notification[]) => void)[] = []
  private static idCounter = 0

  /**
   * 通知を追加
   */
  static addNotification(
    type: NotificationType,
    title: string,
    message: string,
    options?: {
      autoClose?: number
      actions?: NotificationAction[]
    }
  ): string {
    const id = `notification_${++this.idCounter}`
    const notification: Notification = {
      id,
      type,
      title,
      message,
      timestamp: new Date().toISOString(),
      autoClose: options?.autoClose,
      actions: options?.actions
    }

    this.notifications.unshift(notification)
    this.notifyListeners()

    // 自動削除
    if (notification.autoClose && notification.autoClose > 0) {
      setTimeout(() => {
        this.removeNotification(id)
      }, notification.autoClose)
    }

    return id
  }

  /**
   * エラーから通知を作成
   */
  static notifyError(appError: AppError, autoClose = 5000): string {
    return this.addNotification(
      NotificationType.ERROR,
      'エラーが発生しました',
      ErrorHandler.getUserFriendlyMessage(appError),
      { autoClose }
    )
  }

  /**
   * 成功通知
   */
  static notifySuccess(title: string, message: string, autoClose = 3000): string {
    return this.addNotification(NotificationType.SUCCESS, title, message, { autoClose })
  }

  /**
   * 警告通知
   */
  static notifyWarning(title: string, message: string, autoClose = 4000): string {
    return this.addNotification(NotificationType.WARNING, title, message, { autoClose })
  }

  /**
   * 情報通知
   */
  static notifyInfo(title: string, message: string, autoClose = 3000): string {
    return this.addNotification(NotificationType.INFO, title, message, { autoClose })
  }

  /**
   * 通知を削除
   */
  static removeNotification(id: string): void {
    this.notifications = this.notifications.filter((n) => n.id !== id)
    this.notifyListeners()
  }

  /**
   * 全通知をクリア
   */
  static clearAll(): void {
    this.notifications = []
    this.notifyListeners()
  }

  /**
   * 通知リストを取得
   */
  static getNotifications(): Notification[] {
    return [...this.notifications]
  }

  /**
   * 変更を監視
   */
  static subscribe(listener: (notifications: Notification[]) => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener)
    }
  }

  /**
   * リスナーに変更を通知
   */
  private static notifyListeners(): void {
    this.listeners.forEach((listener) => {
      listener([...this.notifications])
    })
  }
}

/**
 * 便利な短縮関数
 */
export const notify = {
  success: NotificationManager.notifySuccess,
  error: NotificationManager.notifyError,
  warning: NotificationManager.notifyWarning,
  info: NotificationManager.notifyInfo
}
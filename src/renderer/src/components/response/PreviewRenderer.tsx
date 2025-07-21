import { JSX } from 'react'
import { PreviewContent } from '@renderer/utils/propertyUtils'
import styles from './ResponseView.module.scss'

interface PreviewRendererProps {
  previewContent: PreviewContent
}

export const PreviewRenderer = ({ previewContent }: PreviewRendererProps): JSX.Element => {
  const { content, type } = previewContent

  switch (type) {
    case 'html':
      return (
        <iframe
          className={styles.htmlPreview}
          srcDoc={content}
          title="HTML Preview"
          sandbox="allow-same-origin"
          loading="lazy"
        />
      )
    case 'xml':
      return (
        <pre className={styles.xmlPreview} style={{ userSelect: 'text', cursor: 'text' }}>
          {content}
        </pre>
      )
    case 'image':
      return (
        <div className={styles.imagePreview}>
          <img
            src={content}
            alt="Preview"
            className={styles.previewImage}
            width={800}
            height={600}
          />
        </div>
      )
    case 'audio':
      return (
        <div className={styles.audioPreview}>
          <audio controls className={styles.previewAudio} src={content}>
            <track kind="captions" />
            お使いのブラウザは音声の再生をサポートしていません。
          </audio>
        </div>
      )
    case 'video':
      return (
        <div className={styles.videoPreview}>
          <video controls className={styles.previewVideo} src={content} width={800} height={600}>
            <track kind="captions" />
            お使いのブラウザは動画の再生をサポートしていません。
          </video>
        </div>
      )
    case 'document':
      return (
        <div className={styles.documentPreview}>
          <iframe
            className={styles.documentFrame}
            src={content}
            title="Document Preview"
            width="100%"
            height="600"
          />
        </div>
      )
    default:
      return (
        <pre className={styles.textPreview} style={{ userSelect: 'text', cursor: 'text' }}>
          {content}
        </pre>
      )
  }
}

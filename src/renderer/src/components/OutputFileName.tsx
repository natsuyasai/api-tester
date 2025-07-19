import { FC } from 'react'
import styles from './OutputFileName.module.scss'

interface Props {
  filename: string
  setFilename: (value: string) => void
}

export const OutputFileName: FC<Props> = ({ filename, setFilename }) => {
  return (
    <>
      <div className={styles.root}>
        <div>OutputFileName</div>
        <input
          className={styles.input}
          value={filename}
          onChange={(e) => setFilename(e.target.value)}
        ></input>
      </div>
    </>
  )
}

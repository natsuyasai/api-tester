import { FC } from 'react'
import styles from './FormatSelect.module.scss'
import { Format } from '@/types/types'

interface Props {
  format: Format
  setFormat: (value: Format) => void
}

export const FormatSelect: FC<Props> = ({ format, setFormat }) => {
  return (
    <>
      <div className={styles.root}>
        <div>FormatSelect</div>
        <select
          className={styles.select}
          value={format}
          onChange={(e) => setFormat(e.target.value as Format)}
        >
          {Object.entries(Format).map(([key, value]) => {
            return (
              <option key={key} value={key}>
                {value}
              </option>
            )
          })}
        </select>
      </div>
    </>
  )
}

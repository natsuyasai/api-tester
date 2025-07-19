import { FC } from 'react'
import styles from './LanguageSelect.module.scss'
import { Language } from '@/types/types'

interface Props {
  selectedItem: Language
  setSelectedItem: (value: Language) => void
}

export const LanguageSelect: FC<Props> = ({ selectedItem, setSelectedItem }) => {
  return (
    <>
      <div className={styles.root}>
        <div>LanguageSelect</div>
        <select
          className={styles.select}
          value={selectedItem}
          onChange={(e) => setSelectedItem(e.target.value as Language)}
        >
          {Object.entries(Language).map(([key, value]) => {
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

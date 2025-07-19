import { FC } from 'react'
import styles from './CommandBaseInput.module.scss'

interface Props {
  basecommand: string
  setBaseCommand: (value: string) => void
}

export const CommandBaseInput: FC<Props> = ({ basecommand, setBaseCommand }) => {
  return (
    <>
      <div className={styles.root}>
        <div>CommandBase</div>
        <input
          className={styles.input}
          value={basecommand}
          onChange={(e) => setBaseCommand(e.target.value)}
        ></input>
      </div>
    </>
  )
}

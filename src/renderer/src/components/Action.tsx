import { FC } from 'react'
import styles from './Action.module.scss'

interface Props {
  enableExecute: boolean
  enableCancel: boolean
  onExecute: () => void
  onCancel: () => void
}

export const Action: FC<Props> = ({ enableExecute, enableCancel, onExecute, onCancel }) => {
  return (
    <>
      <button className={styles.cahcel} onClick={onCancel} disabled={!enableCancel}>
        Cancel
      </button>
      <button className={`${styles.exec} execbutton`} onClick={onExecute} disabled={!enableExecute}>
        Execute
      </button>
    </>
  )
}

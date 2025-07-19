import { FC } from 'react'
import styles from './ParameterInput.module.scss'

interface Props {
  parameter: string
  setParameter: (value: string) => void
}

export const ParameterInput: FC<Props> = ({ parameter, setParameter }) => {
  return (
    <>
      <div className={styles.root}>
        <div>ParameterInput</div>
        <input
          className={styles.input}
          value={parameter}
          onChange={(e) => setParameter(e.target.value)}
          placeholder="-h --version"
        ></input>
      </div>
    </>
  )
}

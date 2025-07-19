import { TargetPath } from './components/TargetPath'
import { LanguageSelect } from './components/LanguageSelect'
import { FormatSelect } from './components/FormatSelect'
import { OutputFileName } from './components/OutputFileName'
import { ParameterInput } from './components/ParameterInput'
import { Action } from './components/Action'
import styles from './App.module.scss'
import { JSX, useState } from 'react'
import { BaseCommand, Format, Language, LizardParameter } from '../../types/types'
import { FileNameValidator } from './validator/fileNameValidator'
import { CommandBaseInput } from './components/CommandBaseInput'

function App(): JSX.Element {
  const initParam: LizardParameter = {
    baseCommand: BaseCommand,
    targetPath: '',
    language: Language.AUTO,
    format: Format.HTML,
    outputFileName: 'output',
    addParameter: ''
  }
  const [parameter, setParameter] = useState(initParam)

  const [enableExecute, setEnableExecute] = useState(false)
  const [enableCancel, setEnableCancel] = useState(false)

  async function execute(): Promise<void> {
    const validator = new FileNameValidator(parameter.outputFileName)
    if (!validator.validate()) {
      window.dialogAPI.showModalMessageBox({
        type: 'warning',
        title: 'info',
        message: 'Invalid FileName',
        detail: 'The FileName contains invalid characters.'
      })
      return
    }

    updateExecuteButtonState()
    await window.lizard.execute(parameter)
    updateDefaultButtonState()
  }

  function updateExecuteButtonState(): void {
    setEnableCancel(true)
    setEnableExecute(false)
  }

  function updateDefaultButtonState(): void {
    setEnableCancel(false)
    setEnableExecute(true)
  }

  function cancel(): void {
    updateDefaultButtonState()
  }

  function updateTargetPath(targetPath: string): void {
    setParameter({ ...parameter, ...{ targetPath } })
    const canExecute = targetPath !== '' && parameter.outputFileName !== ''
    setEnableExecute(canExecute)
  }

  function updateOutputFilename(outputFileName: string): void {
    setParameter({ ...parameter, ...{ outputFileName } })
    const canExecute = parameter.targetPath !== '' && outputFileName !== ''
    setEnableExecute(canExecute)
  }

  function updateBaseCommnad(baseCommand: string): void {
    setParameter({ ...parameter, ...{ baseCommand } })
    const canExecute =
      parameter.targetPath !== '' && parameter.outputFileName !== '' && baseCommand !== ''
    setEnableExecute(canExecute)
  }

  return (
    <>
      <div className={styles.app_root}>
        {/* 入力 */}
        <div className={styles.contents}>
          <CommandBaseInput
            basecommand={parameter.baseCommand}
            setBaseCommand={(baseCommand) => updateBaseCommnad(baseCommand)}
          ></CommandBaseInput>
          <TargetPath
            targetPath={parameter.targetPath}
            setTargetPath={(targetPath) => updateTargetPath(targetPath)}
          ></TargetPath>
          <LanguageSelect
            selectedItem={parameter.language}
            setSelectedItem={(language) => setParameter({ ...parameter, ...{ language } })}
          ></LanguageSelect>
          <FormatSelect
            format={parameter.format}
            setFormat={(format) => setParameter({ ...parameter, ...{ format } })}
          ></FormatSelect>
          <OutputFileName
            filename={parameter.outputFileName}
            setFilename={(outputFileName) => updateOutputFilename(outputFileName)}
          ></OutputFileName>
          <ParameterInput
            parameter={parameter.addParameter}
            setParameter={(addParameter) => setParameter({ ...parameter, ...{ addParameter } })}
          ></ParameterInput>
        </div>
        {/* 実行 */}
        <div className={styles.bottom}>
          <hr className="separator"></hr>
          <div className={styles.action_root}>
            <Action
              enableExecute={enableExecute}
              enableCancel={enableCancel}
              onExecute={execute}
              onCancel={cancel}
            ></Action>
          </div>
        </div>
      </div>
    </>
  )
}

export default App

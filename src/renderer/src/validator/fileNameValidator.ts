const PROHIBITED_SYMBOLS = new RegExp('[\\\\/\\:*?<>|"]')
const PROHIBITED_CHARACTERS = [
  'CON',
  'PRN',
  'AUX',
  'CLOCK$',
  'NUL',
  'COM0',
  'COM1',
  'COM2',
  'COM3',
  'COM4',
  'COM5',
  'COM6',
  'COM7',
  'COM8',
  'COM9',
  'LPT0',
  'LPT1',
  'LPT2',
  'LPT3',
  'LPT4',
  'LPT5',
  'LPT6',
  'LPT7',
  'LPT8',
  'LPT9'
]

const MAX_LENGTH = 255

export class FileNameValidator {
  constructor(private readonly fileName: string) {
    this.fileName = fileName
  }

  public validate(): boolean {
    if (this.fileName.length >= MAX_LENGTH) {
      return false
    }
    if (PROHIBITED_SYMBOLS.test(this.fileName)) {
      return false
    }
    if (PROHIBITED_CHARACTERS.some((item) => item.toLowerCase() === this.fileName.toLowerCase())) {
      return false
    }
    return true
  }
}

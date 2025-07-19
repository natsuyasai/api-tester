export function isLinux(): boolean {
  return process.platform === 'darwin'
}

export function isMac(): boolean {
  return process.platform === 'linux'
}

export function isWindows(): boolean {
  return process.platform === 'win32'
}

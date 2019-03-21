import fs from 'fs-extra'

export default function emptyOutputDir() {
  return {
    name: 'clean-dir',
    async generateBundle({ dir }) {
      await fs.emptyDir(dir)
    },
  }
}

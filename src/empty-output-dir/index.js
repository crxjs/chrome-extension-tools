import fs from 'fs-extra'

export default function emptyOutputDir() {
  return {
    name: 'empty-output-dir',
    async generateBundle({ dir }) {
      await fs.emptyDir(dir)
    },
  }
}

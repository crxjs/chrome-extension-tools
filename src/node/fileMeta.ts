interface FileMeta {
  url: string
  fileName: string
  id: string
}
export const fileById = new Map<string, string>()
export const fileByUrl = new Map<string, string>()
export const idByFile = new Map<string, string>()
export const idByUrl = new Map<string, string>()
export const urlByFile = new Map<string, string>()
export const urlById = new Map<string, string>()
export const setFileMeta = ({ url, fileName, id }: FileMeta) => {
  fileById.set(id, fileName)
  fileByUrl.set(url, fileName)
  idByFile.set(fileName, id)
  idByUrl.set(url, id)
  urlByFile.set(fileName, url)
  urlById.set(id, url)
}

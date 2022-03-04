interface FileMeta {
  fileName: string
  id: string
  url: string
}

export const fileById = new Map<string, string>()
export const fileByUrl = new Map<string, string>()
export const idByFile = new Map<string, string>()
export const idByUrl = new Map<string, string>()
export const pathById = new Map<string, string>()
export const pathByUrl = new Map<string, string>()
export const urlByFile = new Map<string, string>()
export const urlById = new Map<string, string>()

export const setFileMeta = ({ fileName, id, url }: FileMeta) => {
  const pathName = `/${fileName}`
  pathById.set(id, pathName)
  pathByUrl.set(url, pathName)

  fileById.set(id, fileName)
  fileByUrl.set(url, fileName)
  idByFile.set(fileName, id)
  idByUrl.set(url, id)
  urlByFile.set(fileName, url)
  urlById.set(id, url)
}

export const ownerById = new Map<string, string>()
export const pathByOwner = new Map<string, string>()
export const setOwnerMeta = ({ owner, id }: { owner: string; id: string }) => {
  const pathName = pathById.get(id)
  if (!pathName) throw new Error(`file meta not set for "${id}"`)
  pathByOwner.set(owner, pathName)
  ownerById.set(id, owner)
}

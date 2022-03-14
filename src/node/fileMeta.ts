export const idBySource = new Map<string, string>()
export const idByUrl = new Map<string, string>()
export const urlById = new Map<string, string>()

export function setUrlMeta({
  id,
  source,
  url,
}: {
  id: string
  url: string
  source: string
}) {
  idBySource.set(source, id)
  idByUrl.set(url, id)
  urlById.set(id, url)
}

export const fileById = new Map<string, string>()
export const fileByUrl = new Map<string, string>()
export const pathById = new Map<string, string>()
export const pathByUrl = new Map<string, string>()

export const idByFile = new Map<string, string>()
export const urlByFile = new Map<string, string>()

/** Set the filename of the source file */
export const setFileMeta = ({ file, id }: { file: string; id: string }) => {
  const url = urlById.get(id)
  if (!url) return

  fileById.set(id, file)
  fileByUrl.set(url, file)

  const pathName = `/${file}`
  pathById.set(id, pathName)
  pathByUrl.set(url, pathName)
}

export const ownerById = new Map<string, string>()
export const pathByOwner = new Map<string, string>()
export const ownersByFile = new Map<string, Set<string>>()
export const setOwnerMeta = ({ owner, id }: { owner: string; id: string }) => {
  const pathName = pathById.get(id)
  if (!pathName) return

  pathByOwner.set(owner, pathName)
  ownerById.set(id, owner)

  const fileName = fileById.get(id)!
  const owners = ownersByFile.get(fileName) ?? new Set()
  owners.add(owner)
  ownersByFile.set(fileName, owners)
}

export const outputById = new Map<string, string>()
export const outputByOwner = new Map<string, string>()
export const setOutputMeta = ({
  output,
  id,
}: {
  output: string
  id: string
}) => {
  const ownerName = ownerById.get(id)
  if (!ownerName) return
  outputByOwner.set(ownerName, output)
  outputById.set(id, output)
}

import { OutputChunk } from 'rollup'
import * as permissions from './permissions'

/* ============================================ */
/*              DERIVE PERMISSIONS              */
/* ============================================ */

export const derivePermissions = (
  set: Set<string>,
  { code }: OutputChunk,
) =>
  Object.entries(permissions)
    .filter(([key]) => key !== 'default')
    .filter(([, fn]) => fn(code))
    .map(([key]) => key)
    .reduce((s, p) => s.add(p), set)

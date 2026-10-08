import { useEffect, useState } from 'react'
import { loadYarns, saveYarns, type Yarn } from '../yarns'

/** The yarn library, remembered in this browser. */
export function useYarns() {
  const [yarns, setYarns] = useState<Yarn[]>(loadYarns)
  useEffect(() => saveYarns(yarns), [yarns])
  return [yarns, setYarns] as const
}

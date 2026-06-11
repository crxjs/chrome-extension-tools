import React from 'react'

export function Shared({ entry, page }) {
  return (
    <div id={`${page}-app`}>
      {page} ready: {entry}: shared v1
    </div>
  )
}

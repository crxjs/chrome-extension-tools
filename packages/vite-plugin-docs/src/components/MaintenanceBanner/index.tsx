import React from 'react'
import styles from './styles.module.css'

export default function MaintenanceBanner() {
  return (
    <div className={styles.banner}>
      <div className={styles.bannerContent}>
        🚧 New CRXJS Docs Coming Soon! Try the <a href='https://crxjs.netlify.app/'>Preview</a> & Tell Us <a href='https://github.com/crxjs/website/issues/'>What You Think</a>.
      </div>
    </div>
  )
}

import React from 'react'
import styles from './styles.module.css'

export default function MaintenanceBanner() {
  return (
    <div className={styles.banner}>
      <div className={styles.bannerContent}>
        ⚠️ CRXJS is seeking new maintainers. If no maintenance team is
        established by March 31, 2025, this repository will be archived.{' '}
        <a href='https://github.com/crxjs/chrome-extension-tools/discussions/974'>
          Learn more
        </a>
      </div>
    </div>
  )
}

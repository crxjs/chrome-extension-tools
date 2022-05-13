import React from 'react'
import clsx from 'clsx'
import styles from './styles.module.css'

type FeatureItem = {
  title: string
  Svg: React.ComponentType<React.ComponentProps<'svg'>>
  description: JSX.Element
}

const FeatureList = [
  {
    title: 'Simple Config',
    Svg: require('@site/static/img/undraw_happy_news.svg').default,
    description: (
      <>
        Declare most extension files in one place. CRXJS parses{' '}
        <code>manifest.json</code> to find the files to build your extension.
      </>
    ),
  },
  {
    title: 'Modern Experience',
    Svg: require(`@site/static/img/undraw_javascript_frameworks.svg`).default,
    description: (
      <>
        Build Chrome Extensions with CRXJS using modern development tools and
        frameworks like TypeScript, ES&nbsp;Modules, React, and Vue.
      </>
    ),
  },
  {
    title: 'True HMR',
    Svg: require('@site/static/img/undraw_programming.svg').default,
    description: (
      <>
        CRXJS adds true Vite-style HMR to your extension during development.
        HTML&nbsp;pages, background, and content scripts included.
      </>
    ),
  },
  {
    title: 'Content Scripts',
    Svg: require(`@site/static/img/undraw_good_team.svg`).default,
    description: (
      <>
        Content Scripts are first class citizens with CRXJS, enjoying advanced
        development features like imported static assets and file-system-based
        HMR.
      </>
    ),
  },
  {
    title: 'Dynamic Scripting API',
    Svg: require('@site/static/img/undraw_blooming.svg').default,
    description: (
      <>
        Use <code>chrome.scripting</code> with no extra config. Develop dynamic
        content scripts without compromising developer experience.
      </>
    ),
  },
  {
    title: 'Automatic Script Assets',
    Svg: require('@site/static/img/undraw_gifts.svg').default,
    description: (
      <>
        CRXJS compiles a list of the exact <code>web_accessible_resources</code>{' '}
        a content script needs and automatically declares these files in the
        manifest.
      </>
    ),
  },
]

function Feature({ title, Svg, description }: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className='text--center'>
        <Svg className={styles.featureSvg} role='img' />
      </div>
      <div className='text--center padding-horiz--md'>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  )
}

export default function HomepageFeatures(): JSX.Element {
  return (
    <section className={styles.features}>
      <div className='container'>
        <div className='row'>
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  )
}

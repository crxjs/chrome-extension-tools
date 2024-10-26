import React from 'react';
import CodeBlock from '@theme/CodeBlock';

// Helper function to dedent the code
const dedent = (str) => {
  const lines = str.split('\n');
  const minIndent = Math.min(
    ...lines.filter(line => line.trim()).map(line => line.match(/^ */)[0].length)
  );
  return lines.map(line => line.slice(minIndent)).join('\n').trim();
};

const reactCodeBlock = () => {
  return (
    <div>
      <CodeBlock
        language='jsx'
        title='App.jsx'>
        {dedent(`
          <img
            // highlight-next-line
            src={chrome.runtime.getURL('icons/logo.png')}
            className='App-logo'
            alt='logo'
          />
        `)}
      </CodeBlock>
    </div>
  )
};

const solidCodeBlock = () => {
  return (
    <div>
      <CodeBlock
        language='jsx'
        title='App.jsx'>
        {dedent(`
          <img
            // highlight-next-line
            src={chrome.runtime.getURL('icons/logo.png')}
            className='App-logo'
            alt='logo'
          />
        `)}
      </CodeBlock>
    </div>
  )
}

const vanillaCodeBlock = () => {
  return (
    <div>
      <CodeBlock
        language='jsx'
        title='App.jsx'>
        {dedent(`
          <img
            // highlight-next-line
            src={chrome.runtime.getURL('icons/logo.png')}
            className='App-logo'
            alt='logo'
          />
        `)}
      </CodeBlock>
    </div>
  )
}

const vueCodeBlock = () => {
  return (
    <div>
      <CodeBlock
        language='jsx'
        title='App.vue'>
        {dedent(`
          <script setup>
            import logo from './assets/image.png';
            // highlight-next-line
            const logoUrl = chrome.runtime.getURL(logo);
          </script>

          <template>
            <img :src="logoUrl" className='App-logo' alt='logo' />
          </template>
        `)}
      </CodeBlock>
    </div>
  )
}

const factory = (framework) => {
  switch (framework) {
    case 'react':
      return reactCodeBlock();
    case 'solid':
      return solidCodeBlock();
    case 'vanilla':
      return vanillaCodeBlock();
    case 'vue':
      return vueCodeBlock();
    default:
      return "No code block available";
  }
};

const ImageCodeBlock = ({ framework }) => {
  const codeBlock = factory(framework);
  return (
    <div>
      {codeBlock}
    </div>
  );
};

export { ImageCodeBlock };

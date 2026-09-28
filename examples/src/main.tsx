import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { examples } from './examples'
import './components/ui.css'
import './app.css'

const SOURCE_URL = 'https://github.com/feego/react-functional-form/blob/main/examples/src/examples/'

const getExampleId = () => window.location.hash.slice(1) || examples[0]!.id

function App() {
  const [exampleId, setExampleId] = useState(getExampleId)
  const example = examples.find(({ id }) => id === exampleId) ?? examples[0]!

  useEffect(() => {
    const onHashChange = () => setExampleId(getExampleId())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  return (
    <div className="app">
      <nav className="app-nav">
        <h1>react-functional-form</h1>
        <ul>
          {examples.map(({ id, title }) => (
            <li key={id}>
              <a href={`#${id}`} aria-current={id === example.id ? 'page' : undefined}>
                {title}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <main className="app-main">
        <h2>{example.title}</h2>
        <p>
          {example.description}{' '}
          <a href={SOURCE_URL + example.file} target="_blank" rel="noreferrer">
            View source
          </a>
        </p>
        <div className="rff-demo">
          {/* Keyed so switching examples starts from a fresh form. */}
          <example.Component key={example.id} />
        </div>
      </main>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

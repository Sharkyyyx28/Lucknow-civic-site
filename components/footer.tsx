import Container from './container'

const Footer = () => {
  return (
    <footer className="border-t-2 border-brand-700 bg-brand-50">
      <Container>
        <div className="py-10 flex flex-col sm:flex-row items-center justify-center gap-2 text-sm text-ink-600">
          <span>
            Built by{' '}
            <a
              href="https://github.com/Sharkyyyx28"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-ink-900 hover:underline"
            >
              Sharkyyyx28
            </a>
          </span>
          <span className="hidden sm:inline text-ink-300">&middot;</span>
          <a
            href="https://github.com/Sharkyyyx28/Lucknow-civic-site"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            Source on GitHub
          </a>
          <span className="hidden sm:inline text-ink-300">&middot;</span>
          <a
            href="https://sharkyyyx28.space"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            Portfolio
          </a>
        </div>
      </Container>
    </footer>
  )
}

export default Footer

import Container from './container'

// Preview-mode banner only. Site navigation lives in the navbar.
const Alert = () => {
  return (
    <div className="bg-ink-800 border-b border-ink-800 text-white">
      <Container>
        <div className="py-2 text-center text-sm">
          This page is a preview.{' '}
          <a
            href="/api/exit-preview"
            className="underline hover:text-brand-300 duration-200 transition-colors"
          >
            Click here
          </a>{' '}
          to exit preview mode.
        </div>
      </Container>
    </div>
  )
}

export default Alert

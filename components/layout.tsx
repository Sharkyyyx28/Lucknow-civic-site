import Alert from './alert'
import Footer from './footer'
import Meta from './meta'
import Navbar from './navbar'
import FloatingAiAssistant from './floating-ai-assistant'

type Props = {
  preview?: boolean
  children: React.ReactNode
}

const Layout = ({ preview, children }: Props) => {
  return (
    <>
      <Meta />
      <div className="min-h-screen">
        {preview && <Alert />}
        <Navbar />
        <main>{children}</main>
      </div>
      <FloatingAiAssistant />
      <Footer />
    </>
  )
}

export default Layout

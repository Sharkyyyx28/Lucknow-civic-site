import { GetServerSideProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../api/auth/[...nextauth]'
import { isAdmin } from '../../lib/admin'
import Layout from '../../components/layout'

interface Props {
  signedIn: boolean
  authorized: boolean
  email: string | null
}

export const getServerSideProps: GetServerSideProps<Props> = async ({ req, res }) => {
  const session = await getServerSession(req, res, authOptions)
  const email = session?.user?.email ?? null
  return {
    props: {
      signedIn: Boolean(email),
      authorized: email ? await isAdmin(email) : false,
      email,
    },
  }
}

const SECTIONS = [
  {
    href: '/admin/social-handles',
    title: 'Social handles',
    blurb: 'Add, edit or remove entries in the /social-handles directory.',
  },
  {
    href: '/admin/admins',
    title: 'Admins',
    blurb: 'See who has admin access and add someone else.',
  },
]

export default function AdminIndexPage({ signedIn, authorized, email }: Props) {
  return (
    <Layout preview={false}>
      <div className="px-5">
        <Head><title>Admin | Lucknow</title></Head>

        <div className="pb-24 pt-10 md:pt-14">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
            Admin
          </p>
          <h1 className="mb-4 font-display text-4xl font-bold leading-tight tracking-tight text-ink-900 md:text-5xl">
            Site administration
          </h1>

          {!signedIn && (
            <p className="text-lg leading-relaxed text-ink-600">
              Sign in from the header to see whether your account has admin access.
            </p>
          )}

          {signedIn && !authorized && (
            <p className="text-lg leading-relaxed text-ink-600">
              {email} does not have admin access. Ask an existing admin to add this email
              from the Admins section.
            </p>
          )}

          {authorized && (
            <ul className="mt-8 space-y-4">
              {SECTIONS.map(s => (
                <li key={s.href}>
                  <Link
                    href={s.href}
                    className="card-mark block rounded-md border border-ink-200 bg-white p-5 transition-colors hover:border-brand-600"
                  >
                    <h2 className="font-display text-lg font-bold tracking-tight text-ink-900">
                      {s.title}
                    </h2>
                    <p className="mt-1 text-sm text-ink-600">{s.blurb}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Layout>
  )
}

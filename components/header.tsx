import Link from 'next/link'

type Props = {
  headerText: string
  headerLink: string
}

const Header = ({headerText, headerLink} : Props) => {
  return (
    <h2 className="text-2xl md:text-4xl font-bold tracking-tight md:tracking-tighter leading-tight mb-10 mt-10">
      <Link href={headerLink} className="hover:underline">
        {headerText}
      </Link>
    </h2>
  )
}

Header.defaultProps = {
  headerText: "Lucknow Road Details",
  headerLink: "/"
};

export default Header

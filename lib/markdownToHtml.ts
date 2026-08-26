import { remark } from 'remark'
import html from 'remark-html'

export default async function markdownToHtml(markdown: string) {
  // Configure remark-html to properly handle links
  const result = await remark()
    .use(html, { 
      sanitize: false, // Don't sanitize HTML to allow all attributes
      handlers: {
        // Ensure links are properly processed
        link: (h, node) => {
          const props = { href: node.url, target: '_blank', rel: 'noopener noreferrer' }
          return h(node, 'a', props, node.children)
        }
      }
    })
    .process(markdown)
  return result.toString()
}

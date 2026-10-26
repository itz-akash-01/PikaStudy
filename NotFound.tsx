import { Link } from 'react-router-dom'
import { EmptyState } from './Mascot'
import { usePageTitle } from './useAsync'

export default function NotFound() {
  usePageTitle('Page not found')
  return <EmptyState title="Page not found">That page doesn’t exist. <Link to="/" className="font-bold underline">Go home</Link>.</EmptyState>
}

import { useEffect, useState } from 'react'

interface State<T> { data?: T; error?: string; loading: boolean }

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): State<T> {
  const [state, setState] = useState<State<T>>({ loading: true })
  useEffect(() => {
    let alive = true
    setState((s) => ({ ...s, loading: true, error: undefined }))
    fn()
      .then((data) => alive && setState({ data, loading: false }))
      .catch((e: unknown) => alive && setState({ error: e instanceof Error ? e.message : 'Something went wrong', loading: false }))
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return state
}

export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} – PikaStudy` : 'PikaStudy – Learn Smart. Shine Bright.'
  }, [title])
}

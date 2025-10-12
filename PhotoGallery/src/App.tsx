import { useEffect, useRef, useState } from 'react'
import './App.css'

type Photo = {
  id: string
  author: string
  width: number
  height: number
  url: string
  download_url: string
}

function App() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState<number>(1)
  const [loadingMore, setLoadingMore] = useState<boolean>(false)
  const [hasMore, setHasMore] = useState<boolean>(true)

  const LIMIT = 30
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  // Fetch photos when page changes (handles initial load + pagination)
  useEffect(() => {
    const controller = new AbortController()
    const isFirstPage = page === 1
    const run = async () => {
      try {
        if (isFirstPage) setLoading(true)
        else setLoadingMore(true)
        setError(null)
        const url = `https://picsum.photos/v2/list?page=${page}&limit=${LIMIT}`
        const res = await fetch(url, { signal: controller.signal })
        if (!res.ok) throw new Error(`Failed to fetch photos: ${res.status}`)
        const data: Photo[] = await res.json()
        setPhotos((prev) => (isFirstPage ? data : [...prev, ...data]))
        if (data.length < LIMIT) setHasMore(false)
      } catch (e: unknown) {
        if ((e as any)?.name === 'AbortError') return
        const msg = e instanceof Error ? e.message : 'Unknown error fetching photos'
        setError(msg)
      } finally {
        if (isFirstPage) setLoading(false)
        else setLoadingMore(false)
      }
    }
    run()
    return () => controller.abort()
  }, [page])

  // IntersectionObserver to trigger loading more when the sentinel enters view
  useEffect(() => {
    if (!hasMore) return
    const node = sentinelRef.current
    if (!node) return
    let ticking = false
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry.isIntersecting && !loading && !loadingMore && hasMore) {
          // Throttle to avoid rapid multi-triggers
          if (ticking) return
          ticking = true
          setPage((p) => p + 1)
          // allow another trigger after a short tick
          setTimeout(() => (ticking = false), 200)
        }
      },
      {
        root: null,
        rootMargin: '300px 0px',
        threshold: 0,
      }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [hasMore, loading, loadingMore])

  return (
    <main>
      <h1>Photo Gallery</h1>
      {loading && <p>Loading photos…</p>}
      {error && (
        <p role="alert" style={{ color: 'tomato' }}>
          {error}
        </p>
      )}
      <ul className="photo-grid" aria-live="polite">
        {photos.map((p) => {
          const widths = [320, 480, 640, 800]
          const srcSet = widths
            .map((w) => `https://picsum.photos/id/${p.id}/${w}/${Math.round(w * 0.75)} ${w}w`)
            .join(', ')
          const sizes = '(max-width: 600px) 100vw, (max-width: 1024px) 50vw, 33vw'
          const thumb = `https://picsum.photos/id/${p.id}/480/360`
          return (
            <li className="photo-card" key={p.id}>
              <a href={p.download_url} target="_blank" rel="noreferrer">
                <img
                  src={thumb}
                  srcSet={srcSet}
                  sizes={sizes}
                  alt={`Photo by ${p.author}`}
                  loading="lazy"
                  width={480}
                  height={360}
                />
              </a>
              <div className="meta">
                <span className="author">{p.author}</span>
              </div>
            </li>
          )
        })}
      </ul>
      {/* Loading more indicator */}
      {loadingMore && !loading && (
        <p className="loading-more" aria-live="polite">
          Loading more…
        </p>
      )}
      {/* End of list */}
      {!loading && !loadingMore && !hasMore && photos.length > 0 && (
        <p className="end-message" aria-live="polite">
          You've reached the end.
        </p>
      )}
      {/* Sentinel for intersection observer */}
      <div ref={sentinelRef} className="sentinel" aria-hidden="true" />
    </main>
  )
}

export default App

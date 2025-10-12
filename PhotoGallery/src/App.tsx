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

  // New: detail view state
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [detailLoading, setDetailLoading] = useState<boolean>(false)
  const [detailError, setDetailError] = useState<string | null>(null)

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

  // New: hash-based routing for detail view
  useEffect(() => {
    const parse = () => {
      const m = window.location.hash.match(/^#\/photo\/(\d+)/)
      setSelectedId(m ? m[1] : null)
    }
    parse()
    window.addEventListener('hashchange', parse)
    return () => window.removeEventListener('hashchange', parse)
  }, [])

  // New: fetch single photo details (supports direct links)
  useEffect(() => {
    if (!selectedId) {
      setSelectedPhoto(null)
      setDetailError(null)
      setDetailLoading(false)
      return
    }
    const cached = photos.find((p) => p.id === selectedId)
    if (cached) {
      setSelectedPhoto(cached)
      return
    }
    const controller = new AbortController()
    ;(async () => {
      try {
        setDetailLoading(true)
        setDetailError(null)
        const res = await fetch(`https://picsum.photos/id/${selectedId}/info`, {
          signal: controller.signal,
        })
        if (!res.ok) throw new Error(`Failed to fetch photo ${selectedId}`)
        const info: Photo = await res.json()
        setSelectedPhoto(info)
      } catch (e: unknown) {
        if ((e as any)?.name === 'AbortError') return
        setDetailError(e instanceof Error ? e.message : 'Unknown error loading photo')
      } finally {
        setDetailLoading(false)
        window.scrollTo({ top: 0 })
      }
    })()
    return () => controller.abort()
  }, [selectedId, photos])

  const openDetail = (p: Photo) => {
    window.location.hash = `#/photo/${p.id}`
  }
  const closeDetail = () => {
    if (window.history.length > 1) window.history.back()
    else window.location.hash = ''
  }

  return (
    <main>
      {/* New: conditional routing - show detail or gallery */}
      {selectedId ? (
        <section className="detail-view">
          <button className="back-button" onClick={closeDetail} aria-label="Back to gallery">
            ← Back
          </button>
          {detailLoading && <p>Loading photo…</p>}
          {detailError && (
            <p role="alert" style={{ color: 'tomato' }}>
              {detailError}
            </p>
          )}
          {selectedPhoto && (
            <article className="detail-card">
              <img
                src={selectedPhoto.download_url}
                alt={`Full-size photo by ${selectedPhoto.author}`}
                className="detail-image"
              />
              <div className="detail-meta">
                <h2 className="detail-title">Photo {selectedPhoto.id}</h2>
                <p className="author">By {selectedPhoto.author}</p>
                <p className="description">No description available.</p>
              </div>
            </article>
          )}
        </section>
      ) : (
        <>
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
                  <a
                    href={`#/photo/${p.id}`}
                    onClick={(e) => {
                      e.preventDefault()
                      openDetail(p)
                    }}
                  >
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
        </>
      )}
    </main>
  )
}

export default App

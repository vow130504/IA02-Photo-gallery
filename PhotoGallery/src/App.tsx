import { useEffect, useRef, useState, useCallback } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useParams, useNavigate } from 'react-router-dom'
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

  // New: observer + callback ref
  const observerRef = useRef<IntersectionObserver | null>(null)
  const setSentinel = useCallback((node: HTMLDivElement | null) => {
    // cleanup previous observer
    if (observerRef.current) {
      observerRef.current.disconnect()
      observerRef.current = null
    }
    if (!node || !hasMore) return
    let ticking = false
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry.isIntersecting && !loading && !loadingMore && hasMore) {
          if (ticking) return
          ticking = true
          setPage((p) => p + 1)
          setTimeout(() => (ticking = false), 200)
        }
      },
      { root: null, rootMargin: '300px 0px', threshold: 0 }
    )
    observer.observe(node)
    observerRef.current = observer
  }, [hasMore, loading, loadingMore])

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

  return (
    <Router>
      <main>
        <Routes>
          <Route path="/" element={<Navigate to="/photos" replace />} />
          <Route
            path="/photos"
            element={
              <Gallery
                photos={photos}
                loading={loading}
                error={error}
                loadingMore={loadingMore}
                hasMore={hasMore}
                sentinelRef={setSentinel}
              />
            }
          />
          <Route path="/photos/:id" element={<PhotoDetail photos={photos} />} />
        </Routes>
      </main>
    </Router>
  )
}

export default App

// --- child views ---

type GalleryProps = {
  photos: Photo[]
  loading: boolean
  error: string | null
  loadingMore: boolean
  hasMore: boolean
  sentinelRef: (node: HTMLDivElement | null) => void
}

function Gallery({ photos, loading, error, loadingMore, hasMore, sentinelRef }: GalleryProps) {
  return (
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
          const srcSet = widths.map((w) => `https://picsum.photos/id/${p.id}/${w}/${Math.round(w * 0.75)} ${w}w`).join(', ')
          const sizes = '(max-width: 600px) 100vw, (max-width: 1024px) 50vw, 33vw'
          const thumb = `https://picsum.photos/id/${p.id}/480/360`
          return (
            <li className="photo-card" key={p.id}>
              <Link to={`/photos/${p.id}`}>
                <img
                  src={thumb}
                  srcSet={srcSet}
                  sizes={sizes}
                  alt={`Photo by ${p.author}`}
                  loading="lazy"
                  width={480}
                  height={360}
                />
              </Link>
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
  )
}

function PhotoDetail({ photos }: { photos: Photo[] }) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [photo, setPhoto] = useState<Photo | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    const cached = photos.find((p) => p.id === id)
    if (cached) {
      setPhoto(cached)
      return
    }
    const controller = new AbortController()
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`https://picsum.photos/id/${id}/info`, { signal: controller.signal })
        if (!res.ok) throw new Error(`Failed to fetch photo ${id}`)
        const info: Photo = await res.json()
        setPhoto(info)
      } catch (e: unknown) {
        if ((e as any)?.name === 'AbortError') return
        setError(e instanceof Error ? e.message : 'Unknown error loading photo')
      } finally {
        setLoading(false)
        window.scrollTo({ top: 0 })
      }
    })()
    return () => controller.abort()
  }, [id, photos])

  return (
    <section className="detail-view">
      <button className="back-button" onClick={() => navigate(-1)} aria-label="Back to gallery">
        ← Back
      </button>
      {loading && <p>Loading photo…</p>}
      {error && (
        <p role="alert" style={{ color: 'tomato' }}>
          {error}
        </p>
      )}
      {photo && (
        <article className="detail-card">
          <img src={photo.download_url} alt={`Full-size photo by ${photo.author}`} className="detail-image" />
          <div className="detail-meta">
            <h2 className="detail-title">Untitled Photo</h2>
            <p className="author">By {photo.author}</p>
            <p className="description">No description available.</p>
          </div>
        </article>
      )}
    </section>
  )
}

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

const LIMIT = 30
// Picsum supports pagination via ?page and ?limit.
// We request small batches so the gallery can load more items progressively (infinite scroll).
function App() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState<number>(1) // Current page index of the gallery (1-based) used with the API's ?page param.
  const [loadingMore, setLoadingMore] = useState<boolean>(false)
  const [hasMore, setHasMore] = useState<boolean>(true)
  // New: trigger refetch for current page (supports retry)
  const [reloadTick, setReloadTick] = useState(0)

  // IntersectionObserver callback ref:
  // When the sentinel enters the viewport, increment `page` to fetch the next batch via ?page=...
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

  // Fetch photos when page changes:
  // Uses the Picsum API pagination (?page & ?limit). Page 1 replaces, subsequent pages append to enable infinite scroll.
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
        if (!res.ok) throw new Error(`Không thể tải danh sách ảnh (${res.status})`)
        const data: Photo[] = await res.json()
        setPhotos((prev) => (isFirstPage ? data : [...prev, ...data]))
        if (data.length < LIMIT) setHasMore(false)
      } catch (e: unknown) {
        if ((e as any)?.name === 'AbortError') return
        const msg = e instanceof Error ? e.message : 'Lỗi không xác định khi tải ảnh'
        setError(msg)
      } finally {
        if (isFirstPage) setLoading(false)
        else setLoadingMore(false)
      }
    }
    run()
    return () => controller.abort()
  }, [page, reloadTick]) // added reloadTick to allow retry on same page

  const handleRetryList = () => {
    setHasMore(true)
    setPage(1)
    setReloadTick((x) => x + 1)
  }

  return (
    <Router>
      <main className="container mx-auto p-4">
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
                onRetry={handleRetryList}
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

// Reusable status components
function StatusLoading({ label }: { label: string }) {
  return (
    <p className="status" role="status" aria-live="polite" aria-busy="true">
      <span className="spinner" aria-hidden="true" /> {label}
    </p>
  )
}

function ErrorBanner({ message, onRetry }: { message: string | null; onRetry?: () => void }) {
  if (!message) return null
  return (
    <div className="error-banner" role="alert">
      {message}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="ml-3 px-3 py-1 rounded border border-gray-500 text-sm hover:bg-gray-800"
        >
          Thử lại
        </button>
      )}
    </div>
  )
}

// --- child views ---

type GalleryProps = {
  photos: Photo[]
  loading: boolean
  error: string | null
  loadingMore: boolean
  hasMore: boolean
  sentinelRef: (node: HTMLDivElement | null) => void
  onRetry: () => void
}

function Gallery({ photos, loading, error, loadingMore, hasMore, sentinelRef, onRetry }: GalleryProps) {
  return (
    <>
      {/* The grid supports infinite scroll; more pages load when the sentinel div becomes visible. */}
      <h1>Photo Gallery</h1>
      {loading && <StatusLoading label="Đang tải ảnh…" />}
      {!loading && <ErrorBanner message={error} onRetry={onRetry} />}
      <ul className="photo-grid" aria-live="polite" aria-busy={loading || loadingMore}>
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
                  className="w-full h-auto"
                />
              </Link>
              <div className="meta">
                <span className="author">{p.author}</span>
              </div>
            </li>
          )
        })}
      </ul>
      {loadingMore && !loading && (
        <p className="loading-more text-center text-gray-400 my-3" aria-live="polite">
          Loading more…
        </p>
      )}
      {!loading && !loadingMore && !hasMore && photos.length > 0 && (
        <p className="end-message text-center text-gray-400 my-3" aria-live="polite">
          You've reached the end.
        </p>
      )}
      {/* Sentinel observed by IntersectionObserver to trigger fetching the next ?page */}
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
  const [retryTick, setRetryTick] = useState(0)

  useEffect(() => {
    if (!id) return
    const cached = photos.find((p) => p.id === id)
    if (cached) {
      setPhoto(cached)
      setError(null)
      return
    }
    const controller = new AbortController()
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`https://picsum.photos/id/${id}/info`, { signal: controller.signal })
        if (!res.ok) throw new Error(`Không thể tải chi tiết ảnh (${res.status})`)
        const info: Photo = await res.json()
        setPhoto(info)
      } catch (e: unknown) {
        if ((e as any)?.name === 'AbortError') return
        setError(e instanceof Error ? e.message : 'Lỗi không xác định khi tải ảnh')
      } finally {
        setLoading(false)
        window.scrollTo({ top: 0 })
      }
    })()
    return () => controller.abort()
  }, [id, photos, retryTick]) // added retryTick

  return (
    <section className="detail-view">
      <button
        className="back-button inline-flex items-center gap-1 rounded border border-gray-500 px-3 py-1 text-sm hover:bg-gray-800 mb-3"
        onClick={() => navigate(-1)}
        aria-label="Back to gallery"
      >
        ← Back
      </button>
      {loading && <StatusLoading label="Đang tải ảnh…" />}
      {!loading && <ErrorBanner message={error} onRetry={() => setRetryTick((v) => v + 1)} />}
      {photo && (
        <article className="detail-card">
          <img src={photo.download_url} alt={`Full-size photo by ${photo.author}`} className="detail-image" />
          <div className="detail-meta">
            <h2 className="detail-title">Photo {photo.id}</h2>
            <p className="author">By {photo.author}</p>
            <p className="description">API Lorem Picsum không cung cấp tiêu đề hay mô tả cho ảnh.</p>
            <p className="description">Kích thước: {photo.width} × {photo.height}px</p>
            <p className="description">
              Nguồn:{' '}
              <a href={photo.url} target="_blank" rel="noreferrer">
                picsum.photos/id/{photo.id}
              </a>
            </p>
          </div>
        </article>
      )}
    </section>
  )
}

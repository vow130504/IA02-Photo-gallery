import { useEffect, useState } from 'react'
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

  useEffect(() => {
    const controller = new AbortController()
    const fetchPhotos = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch('https://picsum.photos/v2/list?page=1&limit=30', {
          signal: controller.signal,
        })
        if (!res.ok) throw new Error(`Failed to fetch photos: ${res.status}`)
        const data: Photo[] = await res.json()
        setPhotos(data)
      } catch (e: unknown) {
        if ((e as any)?.name === 'AbortError') return
        const msg = e instanceof Error ? e.message : 'Unknown error fetching photos'
        setError(msg)
      } finally {
        setLoading(false)
      }
    }
    fetchPhotos()
    return () => controller.abort()
  }, [])

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
          const thumb = `https://picsum.photos/id/${p.id}/400/300`
          return (
            <li className="photo-card" key={p.id}>
              <a href={p.download_url} target="_blank" rel="noreferrer">
                <img
                  src={thumb}
                  alt={`Photo by ${p.author}`}
                  loading="lazy"
                  width={400}
                  height={300}
                />
              </a>
              <div className="meta">
                <span className="author">{p.author}</span>
              </div>
            </li>
          )
        })}
      </ul>
    </main>
  )
}

export default App

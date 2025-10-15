// D:\AWeb\Week02\IA02-Photo-gallery\PhotoGallery\src\components/PhotoDetail.tsx

import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import type { Photo } from '../types' // SỬA LỖI: Thêm 'type' vào import
import StatusLoading from './StatusLoading'
import ErrorBanner from './ErrorBanner'

// Sử dụng CSS class đã định nghĩa trong App.css
// .detail-view, .back-button, .detail-card, .detail-image, .detail-meta, .detail-title, .description

type PhotoDetailProps = {
  photos: Photo[] // Danh sách ảnh đã tải để kiểm tra cache
}

/**
 * Component hiển thị chi tiết của một ảnh.
 * Nếu ảnh chưa có trong cache (photos), sẽ fetch riêng lẻ.
 */
const PhotoDetail: React.FC<PhotoDetailProps> = ({ photos }) => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [photo, setPhoto] = useState<Photo | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [retryTick, setRetryTick] = useState(0)

  // Hàm fetch chi tiết ảnh
  useEffect(() => {
    if (!id) return

    // 1. Kiểm tra cache
    const cached = photos.find((p) => p.id === id)
    if (cached) {
      setPhoto(cached)
      setError(null)
      return
    }

    // 2. Fetch nếu không có trong cache (từ API /id/{id}/info)
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
  }, [id, photos, retryTick])

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
          {/* Lấy ảnh chất lượng cao hơn từ photo.download_url */}
          <img
            src={photo.download_url}
            alt={`Full-size photo by ${photo.author}`}
            className="detail-image"
          />
          <div className="detail-meta">
            <h2 className="detail-title">Photo {photo.id}</h2>
            <p className="author">By {photo.author}</p>
            <p className="description">
              API Lorem Picsum không cung cấp tiêu đề hay mô tả cho ảnh.
            </p>
            <p className="description">
              Kích thước: {photo.width} × {photo.height}px
            </p>
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

export default PhotoDetail

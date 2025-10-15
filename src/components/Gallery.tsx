// D:\AWeb\Week02\IA02-Photo-gallery\PhotoGallery\src\components/Gallery.tsx

import React from 'react'
import type { Photo } from '../types' // SỬA LỖI: Thêm 'type' vào import
import PhotoCard from './PhotoCard'
import StatusLoading from './StatusLoading'
import ErrorBanner from './ErrorBanner'

// Sử dụng CSS class đã định nghĩa trong App.css
// .photo-grid, .loading-more, .end-message, .sentinel

type GalleryProps = {
  photos: Photo[]
  loading: boolean
  error: string | null
  loadingMore: boolean
  hasMore: boolean
  sentinelRef: (node: HTMLDivElement | null) => void
  onRetry: () => void
}

/**
 * Component hiển thị toàn bộ Thư viện ảnh (Gallery) với Infinite Scroll.
 */
const Gallery: React.FC<GalleryProps> = ({
  photos,
  loading,
  error,
  loadingMore,
  hasMore,
  sentinelRef,
  onRetry,
}) => {
  return (
    <>
      {/* H1 đã có style trong App.css */}
      <h1>Photo Gallery</h1>
      {loading && <StatusLoading label="Đang tải ảnh…" />}
      {!loading && <ErrorBanner message={error} onRetry={onRetry} />}

      <ul className="photo-grid" aria-live="polite" aria-busy={loading || loadingMore}>
        {photos.map((p) => (
          <PhotoCard photo={p} key={p.id} />
        ))}
      </ul>

      {loadingMore && !loading && (
        <p className="loading-more" aria-live="polite">
          Loading more…
        </p>
      )}

      {!loading && !loadingMore && !hasMore && photos.length > 0 && (
        <p className="end-message" aria-live="polite">
          You've reached the end.
        </p>
      )}

      {/* Sentinel được quan sát bởi IntersectionObserver để kích hoạt tải trang tiếp theo */}
      <div ref={sentinelRef} className="sentinel" aria-hidden="true" />
    </>
  )
}

export default Gallery

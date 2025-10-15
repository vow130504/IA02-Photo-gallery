// D:\AWeb\Week02\IA02-Photo-gallery\PhotoGallery\src\App.tsx

import { useEffect, useRef, useState, useCallback } from 'react'
import { HashRouter as Router // THAY THẾ BrowserRouter bằng HashRouter as Router
      , Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import type { Photo } from './types' // Import type Photo
import Gallery from './components/Gallery' // Import component Gallery
import PhotoDetail from './components/PhotoDetail' // Import component PhotoDetail
// Định nghĩa đường dẫn cơ sở của repo GitHub
const BASE_NAME = "/IA02-Photo-gallery"; 
const LIMIT = 30
// Picsum hỗ trợ phân trang qua ?page và ?limit.
// Chúng ta yêu cầu các lô nhỏ để thư viện có thể tải thêm dần dần (cuộn vô hạn).
function App() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState<number>(1) // Chỉ mục trang hiện tại của thư viện (bắt đầu từ 1)
  const [loadingMore, setLoadingMore] = useState<boolean>(false)
  const [hasMore, setHasMore] = useState<boolean>(true)
  // Biến state để kích hoạt tải lại trang hiện tại (hỗ trợ nút thử lại)
  const [reloadTick, setReloadTick] = useState(0)

  // Ref cho IntersectionObserver:
  // Khi sentinel đi vào viewport, tăng `page` để fetch lô tiếp theo.
  const observerRef = useRef<IntersectionObserver | null>(null)
  const setSentinel = useCallback((node: HTMLDivElement | null) => {
    // dọn dẹp observer cũ
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
          // Tăng page để kích hoạt useEffect fetch data mới
          setPage((p) => p + 1)
          // Giới hạn tần suất update state (debounce)
          setTimeout(() => (ticking = false), 200)
        }
      },
      { root: null, rootMargin: '300px 0px', threshold: 0 }
    )
    // Bắt đầu quan sát div sentinel
    observer.observe(node)
    observerRef.current = observer
  }, [hasMore, loading, loadingMore]) // dependencies để cập nhật logic observer

  // Fetch photos khi page thay đổi:
  // Trang 1 thay thế, các trang sau đó được nối thêm để kích hoạt Infinite Scroll.
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
        
        // Cập nhật state ảnh: thay thế (trang 1) hoặc nối thêm (các trang sau)
        setPhotos((prev) => (isFirstPage ? data : [...prev, ...data]))
        
        // Cập nhật trạng thái còn dữ liệu hay không
        if (data.length < LIMIT) setHasMore(false)
      } catch (e: unknown) {
        if ((e as any)?.name === 'AbortError') return
        const msg = e instanceof Error ? e.message : 'Lỗi không xác định khi tải ảnh'
        setError(msg)
        // Nếu lỗi xảy ra, set hasMore = false để ngăn IntersectionObserver trigger tiếp tục
        setHasMore(false)
      } finally {
        if (isFirstPage) setLoading(false)
        else setLoadingMore(false)
      }
    }
    run()
    return () => controller.abort()
  }, [page, reloadTick]) // reloadTick cho phép retry trên cùng một page

  // Xử lý khi bấm nút Thử lại
  const handleRetryList = () => {
    // Reset lại trạng thái để bắt đầu fetch lại từ đầu (page 1)
    setHasMore(true)
    setPage(1)
    setPhotos([]) // Xóa ảnh cũ
    setReloadTick((x) => x + 1) // Kích hoạt useEffect
  }

  return (
    <Router>
      <main className="container mx-auto p-4">
        <Routes>
          {/* Redirect từ root / sang /photos */}
          <Route path="/" element={<Navigate to="/photos" replace />} />
          
          {/* Route cho trang Gallery chính */}
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
          
          {/* Route cho trang chi tiết ảnh */}
          {/* Truyền photos để PhotoDetail có thể kiểm tra cache trước khi fetch riêng lẻ */}
          <Route path="/photos/:id" element={<PhotoDetail photos={photos} />} />
        </Routes>
      </main>
    </Router>
  )
}

export default App

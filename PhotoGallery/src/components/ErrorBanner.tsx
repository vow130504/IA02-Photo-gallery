// D:\AWeb\Week02\IA02-Photo-gallery\PhotoGallery\src\components/ErrorBanner.tsx

import React from 'react'
// Sử dụng CSS class đã định nghĩa trong App.css
// .error-banner

type ErrorBannerProps = {
  message: string | null
  onRetry?: () => void
}

/**
 * Component hiển thị thông báo lỗi.
 * @param message - Nội dung thông báo lỗi.
 * @param onRetry - Hàm callback được gọi khi người dùng bấm nút "Thử lại".
 */
const ErrorBanner: React.FC<ErrorBannerProps> = ({ message, onRetry }) => {
  if (!message) return null
  return (
    <div className="error-banner" role="alert">
      {message}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          // Sử dụng Tailwind CSS cho button thử lại (vì App.css không có style cụ thể cho nút này)
          className="ml-3 px-3 py-1 rounded border border-gray-500 text-sm hover:bg-gray-800"
        >
          Thử lại
        </button>
      )}
    </div>
  )
}

export default ErrorBanner

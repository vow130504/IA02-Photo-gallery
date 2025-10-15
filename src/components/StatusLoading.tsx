// D:\AWeb\Week02\IA02-Photo-gallery\PhotoGallery\src\components/StatusLoading.tsx

import React from 'react'
// Sử dụng CSS class đã định nghĩa trong App.css
// .status, .spinner

type StatusLoadingProps = {
  label: string
}

/**
 * Component hiển thị trạng thái đang tải (Loading Spinner).
 * @param label - Nội dung hiển thị bên cạnh spinner.
 */
const StatusLoading: React.FC<StatusLoadingProps> = ({ label }) => {
  return (
    <p className="status" role="status" aria-live="polite" aria-busy="true">
      <span className="spinner" aria-hidden="true" /> {label}
    </p>
  )
}

export default StatusLoading

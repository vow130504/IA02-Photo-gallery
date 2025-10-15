// D:\AWeb\Week02\IA02-Photo-gallery\PhotoGallery\src\components/PhotoCard.tsx

import React from 'react'
import { Link } from 'react-router-dom'
import type { Photo } from '../types' // Import type Photo

// Sử dụng CSS class đã định nghĩa trong App.css
// .photo-card, .meta, .author

type PhotoCardProps = {
  photo: Photo
}

/**
 * Component hiển thị một thẻ ảnh nhỏ trong lưới.
 * @param photo - Dữ liệu ảnh để hiển thị.
 */
const PhotoCard: React.FC<PhotoCardProps> = ({ photo }) => {
  const { id, author } = photo
  // Tính toán srcset và thumb như trong App.tsx gốc
  const widths = [320, 480, 640, 800]
  const srcSet = widths
    .map((w) => `https://picsum.photos/id/${id}/${w}/${Math.round(w * 0.75)} ${w}w`)
    .join(', ')
  const sizes = '(max-width: 600px) 100vw, (max-width: 1024px) 50vw, 33vw'
  const thumb = `https://picsum.photos/id/${id}/480/360`

  return (
    <li className="photo-card" key={id}>
      <Link to={`/photos/${id}`}>
        <img
          src={thumb}
          srcSet={srcSet}
          sizes={sizes}
          alt={`Photo by ${author}`}
          loading="lazy"
          width={480}
          height={360}
          className="w-full h-auto"
        />
      </Link>
      <div className="meta">
        <span className="author">{author}</span>
      </div>
    </li>
  )
}

export default PhotoCard

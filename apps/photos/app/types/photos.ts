export type PhotoWithUrls = {
  id: string
  albumId: string | null
  title: string | null
  description: string | null
  locationName: string | null
  takenAt: string | null
  width: number | null
  height: number | null
  isPublic: boolean
  createdAt: string
  updatedAt: string
  exif?: Record<string, unknown> | null
  album?: {
    id: string
    slug: string
    title: string
  } | null
  thumbUrl?: string | null
  webUrl?: string | null
}

export type AlbumWithPhotos = {
  id: string
  slug: string
  title: string
  description: string | null
  isPublic: boolean
  coverPhotoId: string | null
  createdAt: string
  updatedAt: string
  photos?: PhotoWithUrls[]
  coverPhoto?: PhotoWithUrls | null
  _count?: {
    photos: number
  }
}

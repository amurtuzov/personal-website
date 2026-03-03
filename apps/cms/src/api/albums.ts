import type { Album, Photo } from '@packages/database'
import axios from 'axios'

export type CreateAlbumBody = Pick<Album, 'slug' | 'title' | 'description' | 'isPublic'>
export type UpdateAlbumBody = Partial<CreateAlbumBody> & { coverPhotoId?: string | null }
export type Paginated<T> = {
  items: T[]
  page: number
  pageSize: number
  total: number
}
export type AlbumsQuery = {
  page: number
  pageSize: number
  search?: string
}

export type PhotoWithUrls = Photo & {
  thumbUrl?: string | null
  webUrl?: string | null
}

export type AlbumWithPhotos = Album & {
  photos: PhotoWithUrls[]
  coverPhoto?: PhotoWithUrls | null
  _count?: { photos: number }
}

export const getAlbums = async (
  abortController?: AbortController,
  params?: AlbumsQuery,
): Promise<Paginated<AlbumWithPhotos>> => {
  const { data } = await axios.get<Paginated<AlbumWithPhotos>>('/api/albums/admin/all', {
    signal: abortController?.signal,
    params,
  })
  return data
}

export const getAlbumBySlug = async (
  abortController: AbortController,
  slug: string,
): Promise<AlbumWithPhotos> => {
  const { data } = await axios.get<AlbumWithPhotos>(`/api/albums/slug/${slug}`, {
    signal: abortController?.signal,
  })
  return data
}

export const createAlbum = async (
  abortController: AbortController,
  body?: CreateAlbumBody,
): Promise<AlbumWithPhotos> => {
  const { data } = await axios.post<AlbumWithPhotos>('/api/albums', body, {
    signal: abortController.signal,
  })
  return data
}

export const getAlbumById = async (
  abortController: AbortController,
  id?: string,
): Promise<AlbumWithPhotos> => {
  const { data } = await axios.get<AlbumWithPhotos>(`/api/albums/${id}`, {
    signal: abortController.signal,
  })
  return data
}

export const updateAlbum = async (
  abortController: AbortController,
  params?: UpdateAlbumBody & { id?: string },
): Promise<AlbumWithPhotos> => {
  const id = params?.id
  const { id: _id, ...body } = params || {}
  const { data } = await axios.put<AlbumWithPhotos>(`/api/albums/${id}`, body, {
    signal: abortController.signal,
  })
  return data
}

export const deleteAlbum = async (
  abortController: AbortController,
  id?: string,
): Promise<AlbumWithPhotos> => {
  const { data } = await axios.delete<AlbumWithPhotos>(`/api/albums/${id}`, {
    signal: abortController.signal,
  })
  return data
}

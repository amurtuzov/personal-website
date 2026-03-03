import type { Album, Photo } from '@packages/database'
import axios from 'axios'

export interface PresignFile {
  filename: string
  contentType: string
  locationName?: string
  takenAt?: string
}

export interface CreatePhotoBody {
  albumId?: string
  s3Key: string
  title?: string
  description?: string
  locationName?: string
  takenAt?: Date | string
  isPublic?: boolean
  exif?: any
}

export interface CreateBulkPhotosBody {
  photos: CreatePhotoBody[]
  albumId?: string
}

export type UpdatePhotoBody = Partial<CreatePhotoBody> & { albumId?: string | null }

export type Paginated<T> = {
  items: T[]
  page: number
  pageSize: number
  total: number
}

export type PhotoAlbumInfo = Pick<Album, 'id' | 'slug' | 'title'>

export type PhotoWithUrls = Photo & {
  thumbUrl?: string | null
  webUrl?: string | null
  album?: PhotoAlbumInfo | null
}

export type PhotosQuery = {
  page: number
  pageSize: number
  search?: string
  albumId?: string
}

export const getPhotos = async (
  abortController?: AbortController,
  params?: PhotosQuery,
): Promise<Paginated<PhotoWithUrls>> => {
  const { data } = await axios.get<Paginated<PhotoWithUrls>>('/api/admin/photos', {
    signal: abortController?.signal,
    params,
  })
  return data
}

export const getPublicPhotos = async (
  abortController?: AbortController,
  params?: Omit<PhotosQuery, 'albumId'>,
): Promise<Paginated<PhotoWithUrls>> => {
  const { data } = await axios.get<Paginated<PhotoWithUrls>>('/api/photos', {
    signal: abortController?.signal,
    params,
  })
  return data
}

export const getPhotoById = async (
  abortController: AbortController | undefined,
  id: string,
): Promise<PhotoWithUrls> => {
  const { data } = await axios.get<PhotoWithUrls>(`/api/photos/${id}`, {
    signal: abortController?.signal,
  })
  return data
}

export const getAdminPhotoById = async (
  abortController: AbortController | undefined,
  id?: string,
): Promise<PhotoWithUrls> => {
  const { data } = await axios.get<PhotoWithUrls>(`/api/admin/photos/${id}`, {
    signal: abortController?.signal,
  })
  return data
}

export const signUpload = async (
  abortController: AbortController | undefined,
  body: PresignFile,
) => {
  const { data } = await axios.post('/api/sign-upload', body, {
    signal: abortController?.signal,
  })
  return data
}

export const signBulkUpload = async (
  abortController: AbortController | undefined,
  files: PresignFile[],
) => {
  const { data } = await axios.post(
    '/api/sign-bulk-upload',
    { files },
    { signal: abortController?.signal },
  )
  return data
}

export const createPhoto = async (
  abortController: AbortController | undefined,
  body: CreatePhotoBody,
): Promise<Photo> => {
  const { data } = await axios.post<Photo>('/api/photos', body, {
    signal: abortController?.signal,
  })
  return data
}

export const createBulkPhotos = async (
  abortController: AbortController | undefined,
  body: CreateBulkPhotosBody,
) => {
  const { data } = await axios.post('/api/photos/bulk', body, {
    signal: abortController?.signal,
  })
  return data
}

export const updatePhoto = async (
  abortController: AbortController | undefined,
  params?: UpdatePhotoBody & { id?: string },
): Promise<Photo> => {
  const id = params?.id
  const { id: _id, ...body } = params || {}
  const { data } = await axios.put<Photo>(`/api/photos/${id}`, body, {
    signal: abortController?.signal,
  })
  return data
}

export const deletePhoto = async (
  abortController: AbortController | undefined,
  id?: string,
) => {
  const { data } = await axios.delete(`/api/photos/${id}`, {
    signal: abortController?.signal,
  })
  return data
}

export const bulkDeletePhotos = async (
  abortController: AbortController | undefined,
  ids: string[],
) => {
  const { data } = await axios.post(
    '/api/photos/bulk-delete',
    { ids },
    { signal: abortController?.signal },
  )
  return data
}

export const reprocessPhoto = async (
  abortController: AbortController | undefined,
  id: string,
) => {
  const { data } = await axios.post(`/api/photos/${id}/reprocess`, null, {
    signal: abortController?.signal,
  })
  return data
}

export const getPhotosByAlbum = async (
  abortController: AbortController | undefined,
  albumId: string,
) => {
  const { data } = await axios.get<Paginated<PhotoWithUrls>>(`/api/albums/${albumId}/photos`, {
    signal: abortController?.signal,
  })
  return data
}

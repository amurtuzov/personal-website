import type { AxiosError } from 'axios'
import type { Ref } from 'vue'
import type { HTTPError } from '@/types/httpError'
import { computed, isReactive, ref, toRaw, watch } from 'vue'
import { RequestStatus } from '@/enum/RequestStatus'

export const useApiCall = <T, K, V>(
  apiCallFunction: (abortController: AbortController, params?: V) => Promise<T>,
  externalCall = false,
  params?: V,
) => {
  let abortController: AbortController | null = null
  const data = ref<T | null>(null) as Ref<T | null>
  const error = ref<HTTPError<K> | null>(null) as Ref<HTTPError<K> | null>
  const requestStatus = ref<RequestStatus>(
    RequestStatus.NOT_STARTED,
  ) as Ref<RequestStatus>

  const isLoading = computed(
    () => requestStatus.value === RequestStatus.PENDING,
  )

  const executeApiCall = async (externalParams?: V) => {
    data.value = null
    error.value = null
    requestStatus.value = RequestStatus.PENDING
    try {
      abortController?.abort()
      abortController = new AbortController()
      const apiCallParams = toRaw(externalParams || params)
      data.value = await apiCallFunction(
        abortController,
        apiCallParams as V,
      )
      requestStatus.value = RequestStatus.SUCCESS
      abortController = null
    }
    catch (e: unknown) {
      requestStatus.value = RequestStatus.FAILED
      const axiosError = e as AxiosError<K>
      const status = axiosError.response?.status
      const response = axiosError.response
      if (response) {
        error.value = { status, data: response.data as K }
      }
      if (externalCall) {
        throw new Error('Error for external call catch')
      }
    }
  }

  if (!externalCall) {
    if (isReactive(params)) {
      watch(
        () => params,
        async () => await executeApiCall(toRaw(params) as V),
        {
          immediate: true,
          deep: true,
        },
      )
    }
    else {
      executeApiCall(params)
    }
  }
  return { data, error, isLoading, executeApiCall }
}

import type { RootGetters, RootState } from '@/store/main/types'
import { defineStore } from 'pinia'
import { Breakpoints } from '@/enum/Breakpoints'

export const useMainStore = defineStore<string, RootState, RootGetters>(
  'main',
  {
    state: () => {
      return {
        windowWidth: window.innerWidth,
      }
    },

    getters: {
      isMobile: (state: RootState) => state.windowWidth < Breakpoints.TABLET,
      isTablet: (state: RootState) =>
        state.windowWidth >= Breakpoints.TABLET
        && state.windowWidth < Breakpoints.DESKTOP,
      isDesktop: (state: RootState) => state.windowWidth >= Breakpoints.DESKTOP,
    },
  },
)

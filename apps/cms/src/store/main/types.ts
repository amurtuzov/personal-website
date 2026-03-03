export type RootState = {
  windowWidth: number
}
export type RootGetters = {
  isMobile: (state: RootState) => boolean
  isTablet: (state: RootState) => boolean
  isDesktop: (state: RootState) => boolean
}

<template>
  <component :is="dynamicSvg" v-if="dynamicSvg" ref="svgRef" />
</template>

<script lang="ts" src="./SvgIcon.ts"></script>

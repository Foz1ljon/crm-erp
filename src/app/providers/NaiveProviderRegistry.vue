<script setup lang="ts">
// Renderless: mounts under NMessage/NDialog/NNotification/NLoadingBar
// providers purely to capture their APIs into the module-level registry
// non-component code reads from (see core/api/feedback.ts).
import { useDialog, useLoadingBar, useMessage, useNotification } from 'naive-ui'
import { onBeforeUnmount } from 'vue'
import { feedback } from '@/core/api/feedback'

feedback.message = useMessage()
feedback.dialog = useDialog()
feedback.notification = useNotification()
feedback.loadingBar = useLoadingBar()

onBeforeUnmount(() => {
  feedback.message = null
  feedback.dialog = null
  feedback.notification = null
  feedback.loadingBar = null
})
</script>

<template>
  <!-- Renderless: exists only to sit inside the providers and register their APIs. -->
  <div v-if="false" />
</template>

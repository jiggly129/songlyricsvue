<script setup>
import { onMounted } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'

onMounted(async () => {
  if (Capacitor.getPlatform() === 'android') {
    setTimeout(() => {
      StatusBar.hide().catch(() => {})
    }, 500)
  }
})

</script>

<template>
  <div class="app-shell">
    <nav class="app-nav">
      <RouterLink to="/">Home</RouterLink>
      <RouterLink to="/about">About Me</RouterLink>
    </nav>
    <RouterView />
  </div>
</template>


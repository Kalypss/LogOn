<!--
Composant ToggleTheme.vue
Affiche un bouton pour basculer entre le mode clair et sombre.
Persistance du choix dans localStorage, icône dynamique Sun/Moon (lucide-vue-next).
-->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { SunDim, Moon } from 'lucide-vue-next'

const isDark = ref(false)

const toggleTheme = () => {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
}

onMounted(() => {
  const saved = localStorage.getItem('theme')
  isDark.value = saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', isDark.value)
})
</script>

<template>
  <button
    class="flex items-center justify-center p-2 rounded-full border border-border bg-background text-foreground shadow hover:bg-muted transition"
    aria-label="Changer le thème"
    @click="toggleTheme"
  >
    <component :is="isDark ? Moon : SunDim" class="w-5 h-5 transition-transform duration-200" :class="isDark ? 'rotate-12 scale-110' : 'rotate-0 scale-100'" />
  </button>
</template>

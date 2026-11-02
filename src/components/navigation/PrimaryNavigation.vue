<script setup>
defineProps({
  activePage: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['navigate'])

const pages = [
  { id: 'overview', label: 'Overview', href: '#overview' },
  {
    id: 'intelligence',
    label: 'Portfolio Intelligence',
    href: '#portfolio-intelligence',
  },
  { id: 'optimization', label: 'Optimization', href: '#optimization' },
  { id: 'data', label: 'Data', href: '#data' },
]
</script>

<template>
  <nav class="primary-navigation" aria-label="Primary navigation">
    <div class="primary-navigation__inner">
      <a
        v-for="page in pages"
        :key="page.id"
        class="primary-navigation__link"
        :class="{ 'is-active': activePage === page.id }"
        :href="page.href"
        :aria-current="activePage === page.id ? 'page' : undefined"
        @click.prevent="emit('navigate', page.id)"
      >
        {{ page.label }}
      </a>
    </div>
  </nav>
</template>

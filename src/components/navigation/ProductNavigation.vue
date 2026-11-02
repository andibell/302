<script setup>
defineProps({
  activeSection: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['navigate'])

const sections = [
  { id: 'performance', label: 'Performance' },
  { id: 'claims', label: 'Claims' },
  { id: 'underwriting', label: 'Underwriting' },
  { id: 'actuarial', label: 'Actuarial' },
  { id: 'mapping', label: 'Mapping' },
]
</script>

<template>
  <nav class="product-navigation" aria-label="Portfolio Intelligence sections">
    <div class="product-navigation__inner">
      <button
        v-for="section in sections"
        :key="section.id"
        class="product-navigation__link"
        :class="{ 'is-active': activeSection === section.id }"
        type="button"
        :disabled="section.id !== 'performance'"
        :aria-current="activeSection === section.id ? 'page' : undefined"
        @click="section.id === 'performance' && emit('navigate', section.id)"
      >
        {{ section.label }}
      </button>
    </div>
  </nav>
</template>

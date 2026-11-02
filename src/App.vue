<script setup>
import AppShell from './components/common/AppShell.vue'
import OverviewView from './views/OverviewView.vue'
import IntelligenceView from './views/IntelligenceView.vue'
</script>

<template>
  <AppShell
    v-slot="{
      activePage,
      activeProductSection,
      navigateProductSection,
    }"
  >
    <OverviewView v-if="activePage === 'overview'" />
    <IntelligenceView
      v-else-if="activePage === 'intelligence'"
      :active-product-section="activeProductSection"
      @navigate-product-section="navigateProductSection"
    />
  </AppShell>
</template>

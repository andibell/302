<script setup>
import AppShell from './components/common/AppShell.vue'
import OverviewView from './views/OverviewView.vue'
import IntelligenceView from './views/IntelligenceView.vue'
import DataView from './views/DataView.vue'
import DataQualityView from './views/DataQualityView.vue'
</script>

<template>
  <AppShell
    v-slot="{
      activePage,
      activeProductSection,
      activeDataView,
      activeDataLine,
      navigateProductSection,
      navigateDataView,
    }"
  >
    <OverviewView v-if="activePage === 'overview'" />
    <IntelligenceView
      v-else-if="activePage === 'intelligence'"
      :active-product-section="activeProductSection"
      @navigate-product-section="navigateProductSection"
    />
    <DataView
      v-else-if="activePage === 'data' && activeDataView === 'summary'"
      @open-quality="navigateDataView('quality', $event)"
    />
    <DataQualityView
      v-else-if="activePage === 'data' && activeDataView === 'quality'"
      :initial-line-of-business="activeDataLine"
      @back-to-data="navigateDataView('summary')"
    />
  </AppShell>
</template>

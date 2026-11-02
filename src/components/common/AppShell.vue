<script setup>
import { ref } from 'vue'
import PrimaryNavigation from '../navigation/PrimaryNavigation.vue'
import ProductNavigation from '../navigation/ProductNavigation.vue'

const activePage = ref('overview')
const activeProductSection = ref('performance')

function navigateTo(page) {
  activePage.value = page
}
</script>

<template>
  <div
    class="application-shell"
    :class="{ 'has-product-navigation': activePage === 'intelligence' }"
  >
    <header class="application-header">
      <div class="application-header__inner">
        <a
          class="application-header__brand"
          href="#overview"
          aria-label="Nimva Risk home"
          @click.prevent="navigateTo('overview')"
        >
          <img
            src="../../assets/brand/NimvaRisk-White.png"
            alt="Nimva Risk"
          />
        </a>
      </div>
    </header>

    <PrimaryNavigation
      :active-page="activePage"
      @navigate="navigateTo"
    />

    <ProductNavigation
      v-if="activePage === 'intelligence'"
      :active-section="activeProductSection"
      @navigate="activeProductSection = $event"
    />

    <main
      id="main-content"
      class="application-main"
      :aria-label="activePage === 'intelligence' ? 'Portfolio Intelligence' : 'Application workspace'"
    >
      <slot />
    </main>
  </div>
</template>

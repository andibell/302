<script setup>
import { ref } from 'vue'
import PrimaryNavigation from '../navigation/PrimaryNavigation.vue'

const activePage = ref('overview')
const activeProductSection = ref('performance')

function navigateTo(page) {
  activePage.value = page
  activeProductSection.value = 'performance'
}

function navigateProductSection(section) {
  activeProductSection.value = section
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
        <label class="application-search">
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <circle cx="8.5" cy="8.5" r="5.5" />
            <path d="m13 13 4 4" />
          </svg>
          <input type="search" aria-label="Search" placeholder="Search" />
        </label>
        <div class="application-header__tools">
          <button
            class="header-tool header-tool--icon"
            type="button"
            aria-label="Notifications"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"
              />
            </svg>
          </button>
          <button
            class="header-tool header-tool--meetings"
            type="button"
            disabled
            title="Meetings are outside the scope of this prototype"
          >
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <rect x="2.5" y="4" width="15" height="13" rx="1.5" />
              <path d="M6 2.5v3M14 2.5v3M2.5 8h15M6 11h2M10 11h2" />
            </svg>
            Meetings
          </button>
          <button
            class="header-tool header-tool--profile"
            type="button"
            aria-label="Profile"
            disabled
          >
            JD
          </button>
        </div>
      </div>
    </header>

    <PrimaryNavigation
      :active-page="activePage"
      @navigate="navigateTo"
    />

    <main
      id="main-content"
      class="application-main"
      :aria-label="
        activePage === 'intelligence'
          ? 'Portfolio Intelligence'
          : activePage === 'overview'
            ? 'Portfolio overview'
            : 'Application workspace'
      "
    >
      <slot
        :active-page="activePage"
        :active-product-section="activeProductSection"
        :navigate-product-section="navigateProductSection"
      />
    </main>
  </div>
</template>

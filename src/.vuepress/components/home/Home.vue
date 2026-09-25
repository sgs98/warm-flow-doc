<template>
  <main class="wf-home">
    <Hero />
    <div class="wf-hero-body">
      <CodePanel />
      <StatsBar />
    </div>
    <FeaturesGrid />
    <QuickNav />
    <CaseShowcase />
    <SiteFooter />
  </main>
</template>

<script setup lang="ts">
import Hero from "./Hero.vue";
import CodePanel from "./CodePanel.vue";
import StatsBar from "./StatsBar.vue";
import FeaturesGrid from "./FeaturesGrid.vue";
import QuickNav from "./QuickNav.vue";
import CaseShowcase from "./CaseShowcase.vue";
import SiteFooter from "./SiteFooter.vue";
</script>

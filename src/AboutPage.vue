<script setup lang="ts">
import { FileSpreadsheet, GitFork, MessageSquare, ScrollText, UserRound } from "@lucide/vue";
import { getAboutContent } from "./aboutContent";

const about = getAboutContent();
const aboutIconByTitle = {
  主作者: UserRound,
  开源仓库: GitFork,
  意见反馈: MessageSquare,
  更新记录: ScrollText,
};
</script>

<template>
  <div class="about-page" data-page="about">
    <section class="about-hero in-panel">
      <div class="about-app-mark"><FileSpreadsheet :size="54" /></div>
      <h1>{{ about.title }}</h1>
      <div class="version-pill">{{ about.version }}</div>
      <p>{{ about.description }}</p>
    </section>
    <section class="about-grid">
      <article v-for="card in about.cards" :key="card.title" class="about-card">
        <component :is="aboutIconByTitle[card.title as keyof typeof aboutIconByTitle] ?? ScrollText" :size="30" />
        <h2>{{ card.title }}</h2>
        <p>{{ card.description }}</p>
        <span v-if="card.detail">{{ card.detail }}</span>
      </article>
    </section>
  </div>
</template>

<template>
  <span class="streaming-cursor">
    <span class="cursor-char">▌</span>
  </span>
</template>

<style scoped>
.streaming-cursor {
  display: inline;
}
.cursor-char {
  animation: blink 0.8s infinite;
  color: var(--primary-color, #409eff);
  font-weight: normal;
}
@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}
</style>

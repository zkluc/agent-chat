import { createRouter, createWebHashHistory } from 'vue-router'
import ChatWindow from '@/components/chat/ChatWindow.vue'
import FileCompare from '@/views/FileCompare.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'chat',
      component: ChatWindow,
    },
    {
      path: '/compare',
      name: 'file-compare',
      component: FileCompare,
    },
  ],
})

export default router

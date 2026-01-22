// plugins/liff.client.ts
import liff from '@line/liff'

export default defineNuxtPlugin(async (nuxtApp) => {
    const config = useRuntimeConfig()
    const liffId = config.public.liffId as string

    // Provide liff first
    nuxtApp.provide('liff', liff)

    if (!liffId || liffId === 'YOUR_LIFF_ID_HERE') {
        console.warn('⚠️ LIFF ID not configured. Please set NUXT_PUBLIC_LIFF_ID in .env')
        return
    }

    try {
        console.log('🚀 Initializing LIFF with ID:', liffId)
        await liff.init({ liffId })
        console.log('✅ LIFF initialized successfully')
        console.log('📱 Is in LINE app:', liff.isInClient())
        console.log('👤 Is logged in:', liff.isLoggedIn())
    } catch (error) {
        console.error('❌ LIFF init failed:', error)
    }
})

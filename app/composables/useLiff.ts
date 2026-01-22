// composables/useLiff.ts

// Global state สำหรับ LIFF (ใช้ร่วมกันทุก component)
const isReady = ref(false)
const isLoggedIn = ref(false)
const userProfile = ref<{
    userId: string
    displayName: string
    pictureUrl?: string
    statusMessage?: string
} | null>(null)
const isInClient = ref(false)
const isInitialized = ref(false)

export const useLiff = () => {
    const { $liff } = useNuxtApp()
    const liff = $liff as typeof import('@line/liff').default

    const init = async () => {
        // ป้องกัน init ซ้ำ
        if (isInitialized.value) {
            console.log('🔄 LIFF already initialized')
            return
        }

        if (!liff) {
            console.warn('⚠️ LIFF SDK not available')
            return
        }

        try {
            console.log('🚀 Waiting for LIFF ready...')
            await liff.ready

            isReady.value = true
            isLoggedIn.value = liff.isLoggedIn()
            isInClient.value = liff.isInClient()
            isInitialized.value = true

            console.log('✅ LIFF ready:', {
                isLoggedIn: isLoggedIn.value,
                isInClient: isInClient.value,
            })

            if (isLoggedIn.value) {
                try {
                    const profile = await liff.getProfile()
                    userProfile.value = profile
                    console.log('👤 User profile:', profile.displayName)
                } catch (profileError) {
                    console.error('❌ Error getting profile:', profileError)
                }
            }
        } catch (error) {
            console.error('❌ Error initializing LIFF:', error)
        }
    }

    const login = () => {
        if (liff && !liff.isLoggedIn()) {
            liff.login()
        }
    }

    const logout = () => {
        if (liff && liff.isLoggedIn()) {
            liff.logout()
            window.location.reload()
        }
    }

    // ส่งข้อความไปยัง LINE chat
    const sendMessage = async (message: string) => {
        if (!liff) return false

        try {
            // ใน LIFF browser สามารถส่ง message ได้โดยตรง
            if (liff.isInClient()) {
                await liff.sendMessages([
                    {
                        type: 'text',
                        text: message,
                    },
                ])
                return true
            } else {
                // ใน external browser ใช้ share target picker
                if (liff.isApiAvailable('shareTargetPicker')) {
                    const result = await liff.shareTargetPicker([
                        {
                            type: 'text',
                            text: message,
                        },
                    ])
                    return result?.status === 'success'
                }
            }
        } catch (error) {
            console.error('Error sending message:', error)
        }
        return false
    }

    const closeWindow = () => {
        if (liff) {
            liff.closeWindow()
        }
    }

    return {
        liff,
        isReady,
        isLoggedIn,
        userProfile,
        isInClient,
        init,
        login,
        logout,
        sendMessage,
        closeWindow,
    }
}

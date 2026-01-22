// server/api/webhook.post.ts
// LINE Webhook API for Chatbot with Gemini AI

import { prisma } from '~~/server/utils/db'
import {
    replyMessage,
    isAnimationLoading,
    type LineMessage
} from '~~/server/utils/line'
import { chatWithMenuContext, type ChatMessage } from '~~/server/utils/gemini'

// ===== Chat History Cache (per user) =====
const userChatHistory = new Map<string, ChatMessage[]>()
const MAX_HISTORY_LENGTH = 10 // Keep last 10 messages per user

// ===== LINE Event Types =====
interface LineSource {
    type: 'user' | 'group' | 'room'
    userId?: string
    groupId?: string
    roomId?: string
}

interface LineTextMessage {
    type: 'text'
    id: string
    text: string
}

interface LineMessageEvent {
    type: 'message'
    message: LineTextMessage
    timestamp: number
    source: LineSource
    replyToken: string
    mode: string
    webhookEventId: string
}

interface LineFollowEvent {
    type: 'follow' | 'unfollow'
    timestamp: number
    source: LineSource
    replyToken?: string
    mode: string
    webhookEventId: string
}

type LineEvent = LineMessageEvent | LineFollowEvent

interface LineWebhookBody {
    destination: string
    events: LineEvent[]
}

// ===== Get Menu Data from Database =====
const getMenuData = async (): Promise<string> => {
    try {
        const menus = await prisma.menu.findMany({
            where: { isAvailable: true },
            orderBy: { category: 'asc' },
        })

        if (menus.length === 0) {
            return 'ไม่มีข้อมูลเมนูในขณะนี้'
        }

        // Group by category
        const grouped: Record<string, string[]> = {}
        for (const menu of menus) {
            if (!grouped[menu.category]) {
                grouped[menu.category] = []
            }
            grouped[menu.category].push(`- ${menu.name}: ฿${menu.price} ${menu.description ? `(${menu.description})` : ''}`)
        }

        // Format as text
        const categoryNames: Record<string, string> = {
            coffee: '☕ กาแฟ',
            tea: '🍵 ชา',
            dessert: '🍰 ของหวาน/ปั่น',
            other: '🍹 อื่นๆ',
        }

        let result = ''
        for (const [category, items] of Object.entries(grouped)) {
            result += `\n${categoryNames[category] || category}:\n${items.join('\n')}\n`
        }

        return result.trim()
    } catch (error) {
        console.error('❌ Error fetching menus:', error)
        return 'ไม่สามารถโหลดข้อมูลเมนูได้'
    }
}

// ===== Get/Update User Chat History =====
const getChatHistory = (userId: string): ChatMessage[] => {
    return userChatHistory.get(userId) || []
}

const addToChatHistory = (userId: string, userMessage: string, aiResponse: string) => {
    const history = userChatHistory.get(userId) || []

    history.push(
        { role: 'user', parts: [{ text: userMessage }] },
        { role: 'model', parts: [{ text: aiResponse }] }
    )

    // Keep only last N messages
    if (history.length > MAX_HISTORY_LENGTH * 2) {
        history.splice(0, 2)
    }

    userChatHistory.set(userId, history)
}

// ===== Process User Message with Gemini =====
const processMessage = async (userId: string, text: string): Promise<string> => {
    try {
        // Get menu data from database
        const menuData = await getMenuData()
        console.log(`📦 Menu data loaded for AI context`)

        // Get user's chat history
        const chatHistory = getChatHistory(userId)
        console.log(`� Chat history: ${chatHistory.length / 2} messages`)

        // Ask Gemini
        const aiResponse = await chatWithMenuContext(menuData, text, chatHistory)

        // Save to history
        addToChatHistory(userId, text, aiResponse)

        return aiResponse
    } catch (error: any) {
        console.error('❌ Gemini error:', error.message)

        // Fallback response
        return `ขออภัยครับ ระบบขัดข้อง 🙏\n\nลองใหม่อีกครั้ง หรือพิมพ์ "เมนู" เพื่อดูรายการทั้งหมด`
    }
}

// ===== Handle Follow Event =====
const handleFollow = async (replyToken: string) => {
    const welcomeMessage = `🎉 ยินดีต้อนรับสู่ Coffee Shop!\n\n☕ เราเสิร์ฟกาแฟและเครื่องดื่มคุณภาพดีให้คุณทุกวัน\n\n� ถามอะไรก็ได้ เช่น:\n• "มีเมนูอะไรบ้าง"\n• "แนะนำกาแฟหน่อย"\n• "Latte ราคาเท่าไหร่"\n\n🛒 หรือกดเมนูด้านล่างเพื่อสั่งซื้อ\n\nขอบคุณที่ติดตามครับ! 🙏`

    await replyMessage(replyToken, [
        { type: 'text', text: welcomeMessage }
    ])
}

// ===== Main Webhook Handler =====
export default defineEventHandler(async (event) => {
    try {
        const body = await readBody<LineWebhookBody>(event)

        console.log('📨 Webhook received:', JSON.stringify(body, null, 2))

        // Process each event
        for (const lineEvent of body.events) {
            console.log(`🔔 Event type: ${lineEvent.type}`)

            // Handle Follow Event
            if (lineEvent.type === 'follow' && lineEvent.replyToken) {
                await handleFollow(lineEvent.replyToken)
                continue
            }

            // Handle Unfollow Event
            if (lineEvent.type === 'unfollow') {
                const userId = lineEvent.source.userId
                if (userId) {
                    // Clear chat history when user unfollows
                    userChatHistory.delete(userId)
                }
                console.log(`👋 User unfollowed: ${userId}`)
                continue
            }

            // Handle Message Event
            if (lineEvent.type === 'message' && lineEvent.message.type === 'text') {
                const userMessage = lineEvent.message.text
                const userId = lineEvent.source.userId || 'unknown'
                const replyToken = lineEvent.replyToken

                console.log(`💬 Message from ${userId}: ${userMessage}`)

                // Show loading animation
                if (userId !== 'unknown') {
                    await isAnimationLoading(userId, 15)
                }

                // Process message with Gemini AI
                const responseText = await processMessage(userId, userMessage)

                // Reply to user
                await replyMessage(replyToken, [
                    { type: 'text', text: responseText }
                ])
            }
        }

        return { success: true }
    } catch (error: any) {
        console.error('❌ Webhook error:', error)
        return { success: false, error: error.message }
    }
})

// server/api/webhook.post.ts
// LINE Webhook API for Chatbot with Gemini AI

import { prisma } from '~~/server/utils/db'
import {
    replyMessage,
    isAnimationLoading,
    getImageBinary,
    type LineMessage
} from '~~/server/utils/line'
import { chatWithMenuContext, multimodal, type ChatMessage } from '~~/server/utils/gemini'

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

interface LineImageMessage {
    type: 'image'
    id: string
}

type WebhookMessage = LineTextMessage | LineImageMessage

interface LineMessageEvent {
    type: 'message'
    message: WebhookMessage
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

            // Handle Image Event (Payment Slip Verification)
            if (lineEvent.type === 'message' && lineEvent.message.type === 'image') {
                const messageId = lineEvent.message.id
                const userId = lineEvent.source.userId || 'unknown'
                const replyToken = lineEvent.replyToken

                console.log(`🖼️ Image received from ${userId}`)

                // Show loading animation
                if (userId !== 'unknown') {
                    await isAnimationLoading(userId, 10)
                }

                try {
                    // Get Image Binary
                    const imageBuffer = await getImageBinary(messageId)
                    if (!imageBuffer) {
                        await replyMessage(replyToken, [
                            { type: 'text', text: '❌ ไม่สามารถอ่านรูปภาพได้ กรุณาลองใหม่อีกครั้ง' }
                        ])
                        continue
                    }

                    // Convert to Base64
                    const base64Image = Buffer.from(imageBuffer).toString('base64')

                    // Analyze with Gemini
                    // TODO: You can customize the prompt to extract specific Bank names or Account numbers if needed
                    const prompt = `ภาพนี้คือสลิปการโอนเงินธนาคารของไทยใช่หรือไม่?
                    
                    ถ้าใช่: 
                    1. บอกว่าเป็นสลิปถูกต้อง ✅
                    2. ระบุยอดเงินที่โอน (บาท)
                    3. ระบุวันและเวลาที่โอน
                    4. ระบุชื่อผู้รับโอน (ถ้ามี)
                    ตอบกลับด้วยข้อความสั้นๆ เช่น "✅ ได้รับยอดเงิน 120 บาท เมื่อ 12:30 น. เรียบร้อยครับ ออเดอร์กำลังดำเนินการ"

                    ถ้าไม่ใช่สลิป:
                    ตอบสั้นๆ ว่า "⚠️ รูปภาพนี้ดูไม่เหมือนสลิปการโอนเงิน รบกวนส่งรูปสลิปที่ถูกต้องด้วยครับ"
                    `

                    const aiResponse = await multimodal(prompt, base64Image)

                    await replyMessage(replyToken, [
                        { type: 'text', text: aiResponse }
                    ])

                } catch (error: any) {
                    console.error('❌ Error processing image:', error)
                    await replyMessage(replyToken, [
                        { type: 'text', text: 'ขออภัย ระบบตรวจสอบสลิปขัดข้องชั่วคราว 🙏' }
                    ])
                }
            }
        }

        return { success: true }
    } catch (error: any) {
        console.error('❌ Webhook error:', error)
        return { success: false, error: error.message }
    }
})

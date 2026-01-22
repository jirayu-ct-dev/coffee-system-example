// server/utils/gemini.ts
// Gemini AI utilities for TypeScript

import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from '@google/generative-ai'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)

// Safety settings
const safetySettings = [
    {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
    },
    {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
    },
    {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
    },
    {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
    },
]

// Chat history type
export interface ChatMessage {
    role: 'user' | 'model'
    parts: { text: string }[]
}

/**
 * Chat with Gemini AI
 */
export const chat = async (cacheChatHistory: ChatMessage[], prompt: string): Promise<string> => {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' })

        const chatHistory: ChatMessage[] = [
            {
                role: 'user',
                parts: [{ text: 'สวัสดี คุณสามารถช่วยตอบคำถามของฉันจากบริบทที่เคยถามและอ้างอิงจากคำตอบที่คุณตอบไป เป็นภาษาไทยได้ไหม?' }]
            },
            {
                role: 'model',
                parts: [{ text: 'แน่นอน! ถามมาได้เลยครับ 😊' }]
            }
        ]

        if (cacheChatHistory.length > 0) {
            chatHistory.push(...cacheChatHistory)
        }

        const chatSession = model.startChat({
            history: chatHistory,
            safetySettings,
        })

        const result = await chatSession.sendMessage(prompt)
        console.log('✅ Gemini Chat successful')

        return result.response.text()
    } catch (error: any) {
        console.error('❌ Error in Gemini chat:', error.message)
        throw error
    }
}

/**
 * Chat with Coffee Shop context - for menu chatbot
 */
export const chatWithMenuContext = async (
    menuData: string,
    userMessage: string,
    chatHistory: ChatMessage[] = []
): Promise<string> => {
    try {
        // https://ai.google.dev/gemini-api/docs/models
        const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' })

        const systemPrompt = `
            คุณคือผู้ช่วยตอบคำถามของร้าน Coffee Shop ชื่อ "Coffee Shop"
    
            คุณมีหน้าที่:
            1. ตอบคำถามเกี่ยวกับเมนูและราคา
            2. แนะนำเมนูที่เหมาะสมกับลูกค้า
            3. ตอบด้วยความเป็นมิตรและใช้อิโมจิให้เหมาะสม
            4. ตอบเป็นภาษาไทยเสมอ
            5. ถ้าลูกค้าถามนอกเหนือจากเมนู ให้บอกว่าช่วยได้เฉพาะเรื่องเมนูและการสั่งซื้อ
            6. ถ้าลูกค้าต้องการสั่งซื้อ แนะนำให้กดเมนู LIFF ด้านล่าง

            ข้อมูลเมนูปัจจุบัน:
            ${menuData}

            กฎสำคัญ:
            - ตอบสั้นกระชับ ไม่เกิน 200 ตัวอักษร (เว้นแต่ต้องแสดงรายการเมนู)
            - ใช้อิโมจิให้เหมาะสม เช่น ☕ 🍵 🍰 💰
            - ถ้าถามราคา ให้บอกราคาเป็นบาท (฿)
            - ถ้าถามเมนูทั้งหมด ให้แสดงเป็นรายการ
        `

        const history: ChatMessage[] = [
            {
                role: 'user',
                parts: [{ text: systemPrompt }]
            },
            {
                role: 'model',
                parts: [{ text: 'เข้าใจแล้วครับ! ผมพร้อมช่วยตอบคำถามเกี่ยวกับเมนูและบริการของ Coffee Shop แล้วครับ ☕' }]
            },
            ...chatHistory
        ]

        const chatSession = model.startChat({
            history,
            safetySettings,
        })

        const result = await chatSession.sendMessage(userMessage)
        console.log('✅ Gemini Menu Chat successful')

        return result.response.text()
    } catch (error: any) {
        console.error('❌ Error in Gemini menu chat:', error.message)
        throw error
    }
}

/**
 * Multimodal - process image with text
 */
export const multimodal = async (prompt: string, base64Image: string): Promise<string> => {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' })

        const imageParts = [{
            inlineData: {
                data: base64Image,
                mimeType: 'image/png'
            }
        }]

        const thaiPrompt = `${prompt}\n\nโปรดตอบกลับเป็นภาษาไทยทั้งหมด`

        const result = await model.generateContent({
            contents: [{
                role: 'user',
                parts: [
                    { text: thaiPrompt },
                    ...imageParts
                ]
            }],
            safetySettings,
        })

        console.log('✅ Gemini Multimodal successful')
        return result.response.text()
    } catch (error: any) {
        console.error('❌ Error in Gemini multimodal:', error.message)
        throw error
    }
}

// server/utils/line.ts
// LINE Messaging API utilities for TypeScript

import crypto from 'crypto'

// ===== Config =====
const LINE_MESSAGING_API = process.env.LINE_MESSAGING_API || 'https://api.line.me/v2/bot'
const LINE_DATA_MESSAGING_API = process.env.LINE_DATA_MESSAGING_API || 'https://api-data.line.me/v2/bot'
const LINE_MESSAGING_ACCESS_TOKEN = process.env.LINE_MESSAGING_ACCESS_TOKEN || ''
const LINE_MESSAGING_CHANNEL_ID = process.env.LINE_MESSAGING_CHANNEL_ID || ''
const LINE_MESSAGING_CHANNEL_SECRET = process.env.LINE_MESSAGING_CHANNEL_SECRET || ''
const LINE_MESSAGING_OAUTH_ISSUE_TOKENV3 = process.env.LINE_MESSAGING_OAUTH_ISSUE_TOKENV3 || 'https://api.line.me/oauth2/v3/token'
const LINE_NOTIFY_API = process.env.LINE_NOTIFY_API || 'https://notify-api.line.me/api/notify'

// ===== Simple Cache for Profile =====
const profileCache = new Map<string, { data: any; expiry: number }>()
const CACHE_TTL = 30 * 60 * 1000 // 30 minutes

// ===== Types =====
export interface LineTextMessage {
    type: 'text'
    text: string
}

export interface LineFlexMessage {
    type: 'flex'
    altText: string
    contents: object
}

export type LineMessage = LineTextMessage | LineFlexMessage | object

export interface LineProfile {
    userId: string
    displayName: string
    pictureUrl?: string
    statusMessage?: string
}

// ===== Helper: Issue Stateless Access Token =====
const issueStatelessAccessToken = async (): Promise<string | null> => {
    try {
        const response = await fetch(LINE_MESSAGING_OAUTH_ISSUE_TOKENV3, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: LINE_MESSAGING_CHANNEL_ID,
                client_secret: LINE_MESSAGING_CHANNEL_SECRET,
            }),
        })

        if (response.ok) {
            const data = await response.json()
            return data.access_token
        }
        return null
    } catch (error: any) {
        console.error('❌ Error issuing stateless token:', error.message)
        return null
    }
}

// ===== Get User Profile =====
export const getProfile = async (userId: string): Promise<LineProfile | null> => {
    try {
        // Check cache first
        const cached = profileCache.get(userId)
        if (cached && cached.expiry > Date.now()) {
            console.log(`[Cache Profile] Hit for ${userId}`)
            return cached.data
        }

        const url = `${LINE_MESSAGING_API}/profile/${userId}`
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${LINE_MESSAGING_ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
            },
        })

        if (response.ok) {
            const profile = await response.json()
            // Cache the profile
            profileCache.set(userId, {
                data: profile,
                expiry: Date.now() + CACHE_TTL,
            })
            return profile
        }

        console.error('❌ Failed to get profile:', await response.text())
        return null
    } catch (error: any) {
        console.error('❌ Error fetching profile:', error.message)
        return null
    }
}

// ===== Display Loading Animation =====
export const isAnimationLoading = async (userId: string, loadingSeconds: number = 20) => {
    try {
        const url = `${LINE_MESSAGING_API}/chat/loading/start`
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${LINE_MESSAGING_ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chatId: userId,
                loadingSeconds,
            }),
        })

        if (response.ok || response.status === 202) {
            console.log(`⏳ Loading animation started for ${userId}`)
            return true
        }
        return false
    } catch (error: any) {
        console.error('❌ Error starting loading animation:', error.message)
        return false
    }
}

// ===== Reply Message =====
export const replyMessage = async (replyToken: string, messages: LineMessage[]) => {
    try {
        const url = `${LINE_MESSAGING_API}/message/reply`
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${LINE_MESSAGING_ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                replyToken,
                messages,
            }),
        })

        if (response.ok) {
            console.log('✅ Reply sent successfully')
            return { success: true }
        }

        const error = await response.json()
        console.error('❌ Reply failed:', error)
        return { success: false, error }
    } catch (error: any) {
        console.error('❌ Error sending reply:', error.message)
        return { success: false, error: error.message }
    }
}

// ===== Reply with Stateless Token =====
export const replyWithStateless = async (replyToken: string, messages: LineMessage[]) => {
    try {
        const accessToken = await issueStatelessAccessToken()
        if (!accessToken) {
            throw new Error('Failed to obtain stateless access token')
        }

        const url = `${LINE_MESSAGING_API}/message/reply`
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                replyToken,
                messages,
            }),
        })

        if (response.ok) {
            console.log('✅ Stateless reply sent successfully')
            return { success: true }
        }

        const error = await response.json()
        console.error('❌ Stateless reply failed:', error)
        return { success: false, error }
    } catch (error: any) {
        console.error('❌ Error in stateless reply:', error.message)
        return { success: false, error: error.message }
    }
}

// ===== Push Message to User =====
export const pushMessage = async (userId: string, messages: LineMessage[]) => {
    try {
        const url = `${LINE_MESSAGING_API}/message/push`
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${LINE_MESSAGING_ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                to: userId,
                messages,
            }),
        })

        if (response.ok) {
            console.log(`✅ Push message sent to ${userId}`)
            return { success: true }
        }

        const error = await response.json()
        console.error('❌ Push message failed:', error)
        return { success: false, error }
    } catch (error: any) {
        console.error('❌ Error sending push message:', error.message)
        return { success: false, error: error.message }
    }
}

// ===== Get Image Binary =====
export const getImageBinary = async (messageId: string): Promise<ArrayBuffer | null> => {
    try {
        const accessToken = await issueStatelessAccessToken()
        if (!accessToken) {
            throw new Error('Failed to obtain access token')
        }

        const url = `${LINE_DATA_MESSAGING_API}/message/${messageId}/content`
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        })

        if (response.ok) {
            return await response.arrayBuffer()
        }
        return null
    } catch (error: any) {
        console.error('❌ Error fetching image binary:', error.message)
        return null
    }
}

// ===== LINE Notify =====
export const notify = async (message: string) => {
    try {
        const notifyToken = process.env.NOTIFY_TOKEN
        if (!notifyToken) {
            console.warn('⚠️ NOTIFY_TOKEN not configured')
            return { success: false }
        }

        const response = await fetch(LINE_NOTIFY_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Bearer ${notifyToken}`,
            },
            body: new URLSearchParams({ message }),
        })

        return { success: response.ok }
    } catch (error: any) {
        console.error('❌ Error sending notify:', error.message)
        return { success: false, error: error.message }
    }
}

// ===== Verify Signature =====
export const verifySignature = (signature: string, body: object): boolean => {
    const expectedSignature = crypto
        .createHmac('SHA256', LINE_MESSAGING_CHANNEL_SECRET)
        .update(JSON.stringify(body))
        .digest('base64')

    return signature === expectedSignature
}

// ===== Create Order Receipt Flex Message =====
export const createOrderReceiptFlex = (
    orderNumber: string,
    items: { name: string; quantity: number; price: number }[],
    totalPrice: number,
    userName?: string
): LineFlexMessage => {
    const itemContents = items.map(item => ({
        type: 'box',
        layout: 'horizontal',
        contents: [
            {
                type: 'text',
                text: `${item.name} x${item.quantity}`,
                size: 'sm',
                color: '#555555',
                flex: 0,
            },
            {
                type: 'text',
                text: `฿${(item.price * item.quantity).toLocaleString()}`,
                size: 'sm',
                color: '#111111',
                align: 'end',
            },
        ],
    }))

    return {
        type: 'flex',
        altText: `🧾 ใบเสร็จ #${orderNumber}`,
        contents: {
            type: 'bubble',
            header: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'text',
                        text: '☕ Coffee Shop',
                        weight: 'bold',
                        size: 'xl',
                        color: '#D97706',
                    },
                    {
                        type: 'text',
                        text: 'ใบเสร็จรับเงิน',
                        size: 'sm',
                        color: '#999999',
                    },
                ],
                backgroundColor: '#FEF3C7',
                paddingAll: '20px',
            },
            body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'box',
                        layout: 'horizontal',
                        contents: [
                            { type: 'text', text: 'หมายเลขออเดอร์', size: 'sm', color: '#999999' },
                            { type: 'text', text: `#${orderNumber}`, size: 'sm', color: '#D97706', weight: 'bold', align: 'end' },
                        ],
                    },
                    ...(userName ? [{
                        type: 'box',
                        layout: 'horizontal',
                        margin: 'md',
                        contents: [
                            { type: 'text', text: 'ลูกค้า', size: 'sm', color: '#999999' },
                            { type: 'text', text: userName, size: 'sm', color: '#111111', align: 'end' },
                        ],
                    }] : []),
                    { type: 'separator', margin: 'lg' },
                    {
                        type: 'box',
                        layout: 'vertical',
                        margin: 'lg',
                        spacing: 'sm',
                        contents: itemContents,
                    },
                    { type: 'separator', margin: 'lg' },
                    {
                        type: 'box',
                        layout: 'horizontal',
                        margin: 'lg',
                        contents: [
                            { type: 'text', text: 'รวมทั้งหมด', size: 'md', color: '#111111', weight: 'bold' },
                            { type: 'text', text: `฿${totalPrice.toLocaleString()}`, size: 'lg', color: '#D97706', weight: 'bold', align: 'end' },
                        ],
                    },
                ],
                paddingAll: '20px',
            },
            footer: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    { type: 'text', text: `📅 ${new Date().toLocaleString('th-TH')}`, size: 'xs', color: '#999999', align: 'center' },
                    { type: 'text', text: '🙏 ขอบคุณที่ใช้บริการ', size: 'sm', color: '#D97706', align: 'center', margin: 'sm', weight: 'bold' },
                ],
                backgroundColor: '#FEF3C7',
                paddingAll: '15px',
            },
        },
    }
}

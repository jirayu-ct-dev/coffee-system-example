// server/utils/line.ts
// LINE Messaging API utilities for TypeScript

const LINE_MESSAGING_API = process.env.LINE_MESSAGING_API || 'https://api.line.me/v2/bot'
const LINE_MESSAGING_ACCESS_TOKEN = process.env.LINE_MESSAGING_ACCESS_TOKEN || ''

interface LineTextMessage {
    type: 'text'
    text: string
}

interface LineFlexMessage {
    type: 'flex'
    altText: string
    contents: object
}

type LineMessage = LineTextMessage | LineFlexMessage

/**
 * Push message to a specific user
 * https://developers.line.biz/en/reference/messaging-api/#send-push-message
 */
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
                messages: messages,
            }),
        })

        if (response.ok) {
            console.log(`✅ Push message sent to ${userId}`)
            return { success: true }
        } else {
            const errorData = await response.json()
            console.error('❌ Push message failed:', errorData)
            return { success: false, error: errorData }
        }
    } catch (error) {
        console.error('❌ Error sending push message:', error)
        throw error
    }
}

/**
 * Create Order Receipt Flex Message
 */
export const createOrderReceiptFlex = (
    orderNumber: string,
    items: { name: string; quantity: number; price: number }[],
    totalPrice: number,
    userName?: string
) => {
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

    const flexMessage: LineFlexMessage = {
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
                            {
                                type: 'text',
                                text: `หมายเลขออเดอร์`,
                                size: 'sm',
                                color: '#999999',
                            },
                            {
                                type: 'text',
                                text: `#${orderNumber}`,
                                size: 'sm',
                                color: '#D97706',
                                weight: 'bold',
                                align: 'end',
                            },
                        ],
                    },
                    userName ? {
                        type: 'box',
                        layout: 'horizontal',
                        margin: 'md',
                        contents: [
                            {
                                type: 'text',
                                text: 'ลูกค้า',
                                size: 'sm',
                                color: '#999999',
                            },
                            {
                                type: 'text',
                                text: userName,
                                size: 'sm',
                                color: '#111111',
                                align: 'end',
                            },
                        ],
                    } : null,
                    {
                        type: 'separator',
                        margin: 'lg',
                    },
                    {
                        type: 'box',
                        layout: 'vertical',
                        margin: 'lg',
                        spacing: 'sm',
                        contents: itemContents,
                    },
                    {
                        type: 'separator',
                        margin: 'lg',
                    },
                    {
                        type: 'box',
                        layout: 'horizontal',
                        margin: 'lg',
                        contents: [
                            {
                                type: 'text',
                                text: 'รวมทั้งหมด',
                                size: 'md',
                                color: '#111111',
                                weight: 'bold',
                            },
                            {
                                type: 'text',
                                text: `฿${totalPrice.toLocaleString()}`,
                                size: 'lg',
                                color: '#D97706',
                                weight: 'bold',
                                align: 'end',
                            },
                        ],
                    },
                ].filter(Boolean),
                paddingAll: '20px',
            },
            footer: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'text',
                        text: `📅 ${new Date().toLocaleString('th-TH')}`,
                        size: 'xs',
                        color: '#999999',
                        align: 'center',
                    },
                    {
                        type: 'text',
                        text: '🙏 ขอบคุณที่ใช้บริการ',
                        size: 'sm',
                        color: '#D97706',
                        align: 'center',
                        margin: 'sm',
                        weight: 'bold',
                    },
                ],
                backgroundColor: '#FEF3C7',
                paddingAll: '15px',
            },
        },
    }

    return flexMessage
}

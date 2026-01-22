// server/api/order.post.ts
import { prisma } from '~~/server/utils/db'
import { pushMessage, createOrderReceiptFlex } from '~~/server/utils/line'
import generatePayload from 'promptpay-qr'

interface OrderItem {
    menuId: number
    quantity: number
}

interface OrderRequest {
    userId: string
    userName?: string
    items: OrderItem[]
}

export default defineEventHandler(async (event) => {
    try {
        const body = await readBody<OrderRequest>(event)

        // Validate request
        if (!body.userId) {
            throw createError({
                statusCode: 400,
                statusMessage: 'userId is required',
            })
        }

        if (!body.items || body.items.length === 0) {
            throw createError({
                statusCode: 400,
                statusMessage: 'items are required',
            })
        }

        // Get menu items from database
        const menuIds = body.items.map(item => item.menuId)
        const menus = await prisma.menu.findMany({
            where: {
                id: { in: menuIds },
                isAvailable: true,
            },
        })

        // Create menu lookup map
        const menuMap = new Map(menus.map(menu => [menu.id, menu]))

        // Calculate order details
        const orderItems = body.items
            .filter(item => menuMap.has(item.menuId))
            .map(item => {
                const menu = menuMap.get(item.menuId)!
                return {
                    menuId: menu.id,
                    name: menu.name,
                    price: menu.price,
                    quantity: item.quantity,
                    subtotal: menu.price * item.quantity,
                }
            })

        if (orderItems.length === 0) {
            throw createError({
                statusCode: 400,
                statusMessage: 'No valid menu items found',
            })
        }

        // Calculate total price
        const totalPrice = orderItems.reduce((sum, item) => sum + item.subtotal, 0)

        // Generate order number (timestamp-based)
        const orderNumber = `ORD${Date.now().toString(36).toUpperCase()}`

        // Generate PromptPay QR Code
        // TODO: Change this to your actual PromptPay ID (Mobile or Tax ID)
        const PROMPTPAY_NUMBER = process.env.PROMPTPAY_NUMBER || '0812345678'
        const promptPayPayload = generatePayload(PROMPTPAY_NUMBER, { amount: totalPrice })
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(promptPayPayload)}`

        // Create order receipt Flex Message
        const receiptItems = orderItems.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
        }))

        const receiptMessage = createOrderReceiptFlex(
            orderNumber,
            receiptItems,
            totalPrice,
            body.userName,
            qrCodeUrl
        )

        // Send receipt to user via LINE Push Message
        const pushResult = await pushMessage(body.userId, [receiptMessage])

        if (!pushResult.success) {
            console.error('Failed to send LINE message:', pushResult.error)
        }

        // Return order summary
        return {
            success: true,
            order: {
                orderNumber,
                userId: body.userId,
                userName: body.userName,
                items: orderItems,
                totalPrice,
                createdAt: new Date().toISOString(),
                paymentUrl: qrCodeUrl,
            },
            lineMessageSent: pushResult.success,
        }
    } catch (error: any) {
        console.error('Order API error:', error)
        throw createError({
            statusCode: error.statusCode || 500,
            statusMessage: error.statusMessage || 'Internal server error',
        })
    }
})

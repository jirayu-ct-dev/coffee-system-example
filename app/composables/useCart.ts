// composables/useCart.ts
import type { Menu, CartItem } from '~/types/menu'

const cartItems = ref<CartItem[]>([])

export const useCart = () => {
    const addToCart = (menu: Menu) => {
        const existingItem = cartItems.value.find(item => item.menu.id === menu.id)
        if (existingItem) {
            existingItem.quantity++
        } else {
            cartItems.value.push({ menu, quantity: 1 })
        }
    }

    const removeFromCart = (menuId: number) => {
        const index = cartItems.value.findIndex(item => item.menu.id === menuId)
        if (index > -1) {
            cartItems.value.splice(index, 1)
        }
    }

    const updateQuantity = (menuId: number, quantity: number) => {
        const item = cartItems.value.find(item => item.menu.id === menuId)
        if (item) {
            if (quantity <= 0) {
                removeFromCart(menuId)
            } else {
                item.quantity = quantity
            }
        }
    }

    const clearCart = () => {
        cartItems.value = []
    }

    const totalPrice = computed(() => {
        return cartItems.value.reduce((sum, item) => sum + item.menu.price * item.quantity, 0)
    })

    const totalItems = computed(() => {
        return cartItems.value.reduce((sum, item) => sum + item.quantity, 0)
    })

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('th-TH', {
            style: 'currency',
            currency: 'THB',
            minimumFractionDigits: 0,
        }).format(price)
    }

    const getOrderSummary = () => {
        const lines = cartItems.value.map(
            item => `☕ ${item.menu.name} x${item.quantity} = ${formatPrice(item.menu.price * item.quantity)}`
        )
        lines.push(`\n💰 รวมทั้งหมด: ${formatPrice(totalPrice.value)}`)
        return lines.join('\n')
    }

    return {
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalPrice,
        totalItems,
        formatPrice,
        getOrderSummary,
    }
}

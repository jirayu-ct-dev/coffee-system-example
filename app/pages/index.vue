<script setup lang="ts">
import type { Menu, CartItem } from '~/types/menu'

// ===== DATA FETCHING =====
const { data: menus, pending, error } = await useFetch<Menu[]>('/api/menu')

// ===== CART MANAGEMENT =====
const {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    totalPrice,
    totalItems,
    formatPrice,
    getOrderSummary
} = useCart()

// ===== LIFF INTEGRATION =====
const { isReady, isLoggedIn, userProfile, isInClient, init, sendMessage, closeWindow } = useLiff()

// Init LIFF on client side
onMounted(async () => {
    console.log('📱 Page mounted, initializing LIFF...')
    await init()
    console.log('📱 LIFF init complete, userProfile:', userProfile.value)
})

// ===== COMPUTED: Group menus by category =====
const groupedMenus = computed(() => {
    if (!menus.value) return {}
    return menus.value.reduce((acc: Record<string, Menu[]>, menu: Menu) => {
        const category = menu.category
        if (!acc[category]) {
            acc[category] = []
        }
        acc[category].push(menu)
        return acc
    }, {})
})

// Category display names with icons
const categoryLabels: Record<string, string> = {
    coffee: '☕ กาแฟ',
    tea: '🍵 ชา',
    dessert: '🍰 ของหวาน',
    other: '🍹 อื่นๆ',
}

// ===== UI STATE =====
const isCartOpen = ref(false)
const isSending = ref(false)
const sendSuccess = ref(false)

// ===== CART HELPERS =====
const getItemQuantity = (menuId: number): number => {
    const item = cartItems.value.find((i: CartItem) => i.menu.id === menuId)
    return item?.quantity || 0
}

// ===== ORDER SUBMISSION =====
const orderError = ref<string | null>(null)
const paymentQrUrl = ref<string | null>(null)

const handleOrder = async () => {
    if (cartItems.value.length === 0) return

    // ต้อง login LINE ก่อนถึงจะสั่งได้
    if (!userProfile.value?.userId) {
        orderError.value = 'กรุณาเข้าสู่ระบบผ่าน LINE ก่อนสั่งซื้อ'
        return
    }

    isSending.value = true
    sendSuccess.value = false
    paymentQrUrl.value = null
    orderError.value = null

    try {
        // Prepare order items
        const orderItems = cartItems.value.map((item: CartItem) => ({
            menuId: item.menu.id,
            quantity: item.quantity,
        }))

        // Call order API
        const response = await $fetch('/api/order', {
            method: 'POST',
            body: {
                userId: userProfile.value.userId,
                userName: userProfile.value.displayName,
                items: orderItems,
            },
        })

        isSending.value = false

        if (response.success) {
            sendSuccess.value = true
            paymentQrUrl.value = response.order.paymentUrl
            clearCart()

            // ส่งข้อความยืนยันในแชทด้วย (ถ้าอยู่ใน LIFF)
            if (isInClient.value) {
                await sendMessage(`✅ สั่งซื้อสำเร็จ!\n📋 หมายเลขออเดอร์: #${response.order.orderNumber}\n💰 ยอดรวม: ฿${response.order.totalPrice.toLocaleString()}\n\n📸 กรุณาชำระเงินผ่าน QR Code ในใบเสร็จ และส่งรูปสลิปเพื่อยืนยันครับ`)
            }

            // Close LIFF window after success (only if in LINE app)
            // Delay increased to allow user to see the success screen
            if (isInClient.value) {
                setTimeout(() => {
                    closeWindow()
                }, 5000)
            }
        }
    } catch (error: any) {
        console.error('Order error:', error)
        orderError.value = error.data?.statusMessage || 'เกิดข้อผิดพลาดในการสั่งซื้อ'
        isSending.value = false
    }
}

</script>

<template>
    <div class="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">

        <!-- ===== HEADER ===== -->
        <header class="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-amber-100 shadow-sm">
            <div class="max-w-lg mx-auto px-4 py-3">
                <div class="flex items-center justify-between">
                    <!-- Logo & Title -->
                    <div class="flex items-center gap-3">
                        <div
                            class="w-11 h-11 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-200">
                            <span class="text-white text-2xl">☕</span>
                        </div>
                        <div>
                            <h1
                                class="text-lg font-bold bg-gradient-to-r from-amber-700 to-orange-600 bg-clip-text text-transparent">
                                Coffee Shop
                            </h1>
                            <p class="text-xs text-gray-500">เลือกเมนูที่คุณชอบ</p>
                        </div>
                    </div>

                    <!-- Cart Button -->
                    <UButton icon="i-lucide-shopping-cart" color="primary" variant="soft" size="lg"
                        class="relative shadow-md" @click="isCartOpen = true">
                        <span v-if="totalItems > 0"
                            class="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs min-w-5 h-5 px-1 rounded-full flex items-center justify-center font-bold shadow-lg animate-pulse">
                            {{ totalItems > 99 ? '99+' : totalItems }}
                        </span>
                    </UButton>
                </div>

                <!-- User Profile Badge (if logged in) -->
                <div v-if="userProfile" class="mt-3 flex items-center gap-2">
                    <div class="flex items-center gap-2 bg-green-50 rounded-full px-3 py-1.5 border border-green-100">
                        <img v-if="userProfile.pictureUrl" :src="userProfile.pictureUrl" :alt="userProfile.displayName"
                            class="w-5 h-5 rounded-full ring-2 ring-green-200">
                        <span class="text-xs text-green-700 font-medium">
                            สวัสดี, {{ userProfile.displayName }}
                        </span>
                        <UBadge color="success" variant="subtle" size="xs">LINE</UBadge>
                    </div>
                </div>
            </div>
        </header>

        <!-- ===== LOADING STATE ===== -->
        <div v-if="pending" class="flex items-center justify-center py-20">
            <div class="text-center">
                <div class="relative w-16 h-16 mx-auto mb-4">
                    <div class="absolute inset-0 border-4 border-amber-200 rounded-full"></div>
                    <div
                        class="absolute inset-0 border-4 border-transparent border-t-amber-500 rounded-full animate-spin">
                    </div>
                    <span class="absolute inset-0 flex items-center justify-center text-2xl">☕</span>
                </div>
                <p class="text-gray-500 font-medium">กำลังโหลดเมนู...</p>
            </div>
        </div>

        <!-- ===== ERROR STATE ===== -->
        <div v-else-if="error" class="flex items-center justify-center py-20 px-4">
            <UAlert color="error" variant="soft" title="เกิดข้อผิดพลาด"
                :description="error.message || 'ไม่สามารถโหลดเมนูได้'" icon="i-lucide-alert-circle" class="max-w-sm" />
        </div>

        <!-- ===== MENU CONTENT ===== -->
        <main v-else class="max-w-lg mx-auto px-4 py-6 pb-32">

            <!-- Category Sections -->
            <div v-for="(categoryMenus, category) in groupedMenus" :key="category" class="mb-8">

                <!-- Category Header -->
                <div class="flex items-center gap-3 mb-4">
                    <h2 class="text-lg font-bold text-gray-800">
                        {{ categoryLabels[category as string] || category }}
                    </h2>
                    <UBadge color="neutral" variant="subtle" size="sm">
                        {{ categoryMenus.length }} รายการ
                    </UBadge>
                </div>

                <!-- Menu Grid (2 columns on mobile) -->
                <div class="grid grid-cols-2 gap-3">
                    <div v-for="menu in categoryMenus" :key="menu.id" class="group">
                        <UCard
                            class="h-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-0 bg-white/80 backdrop-blur">
                            <!-- Menu Image -->
                            <div
                                class="relative aspect-square overflow-hidden rounded-xl mb-3 bg-gradient-to-br from-amber-50 to-orange-50">
                                <img v-if="menu.imageUrl" :src="menu.imageUrl" :alt="menu.name"
                                    class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    loading="lazy">
                                <div v-else class="w-full h-full flex items-center justify-center">
                                    <span class="text-5xl opacity-50">☕</span>
                                </div>

                                <!-- Quantity Badge (if in cart) -->
                                <Transition name="pop">
                                    <div v-if="getItemQuantity(menu.id) > 0"
                                        class="absolute top-2 right-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg">
                                        {{ getItemQuantity(menu.id) }} ชิ้น
                                    </div>
                                </Transition>
                            </div>

                            <!-- Menu Info -->
                            <div class="space-y-2">
                                <h3 class="font-semibold text-gray-800 text-sm leading-tight line-clamp-2">
                                    {{ menu.name }}
                                </h3>
                                <p class="text-xs text-gray-400 line-clamp-2 min-h-[2rem]">
                                    {{ menu.description || 'เครื่องดื่มแสนอร่อย' }}
                                </p>

                                <!-- Price & Add Button -->
                                <div class="flex items-center justify-between pt-1">
                                    <span class="text-base font-bold text-amber-600">
                                        {{ formatPrice(menu.price) }}
                                    </span>

                                    <!-- Quantity Controls (if already in cart) -->
                                    <div v-if="getItemQuantity(menu.id) > 0" class="flex items-center gap-1">
                                        <UButton icon="i-lucide-minus" size="xs" color="neutral" variant="soft" square
                                            @click="updateQuantity(menu.id, getItemQuantity(menu.id) - 1)" />
                                        <span class="text-xs font-bold w-5 text-center">{{ getItemQuantity(menu.id)
                                        }}</span>
                                        <UButton icon="i-lucide-plus" size="xs" color="primary" variant="soft" square
                                            @click="addToCart(menu)" />
                                    </div>

                                    <!-- Add Button (if not in cart) -->
                                    <UButton v-else icon="i-lucide-plus" size="xs" color="primary"
                                        @click="addToCart(menu)">
                                        เพิ่ม
                                    </UButton>
                                </div>
                            </div>
                        </UCard>
                    </div>
                </div>
            </div>
        </main>

        <!-- ===== FLOATING CART BUTTON ===== -->
        <Transition name="slide-up">
            <div v-if="totalItems > 0"
                class="fixed bottom-0 inset-x-0 z-50 p-4 bg-gradient-to-t from-white via-white/95 to-transparent pt-10">
                <div class="max-w-lg mx-auto">
                    <UButton block size="xl" color="primary" class="shadow-2xl shadow-amber-200 font-bold"
                        @click="isCartOpen = true">
                        <template #leading>
                            <span class="text-xl animate-bounce">🛒</span>
                        </template>
                        ดูตะกร้า ({{ totalItems }} รายการ) - {{ formatPrice(totalPrice) }}
                    </UButton>
                </div>
            </div>
        </Transition>

        <!-- ===== CART SLIDEOVER (Bottom Sheet) ===== -->
        <USlideover v-model:open="isCartOpen" side="bottom">
            <template #content>
                <div class="flex flex-col h-full max-h-[85vh] bg-white rounded-t-3xl overflow-hidden">

                    <!-- Cart Header -->
                    <div
                        class="flex items-center justify-between p-4 border-b bg-gradient-to-r from-amber-50 to-orange-50">
                        <div class="flex items-center gap-3">
                            <span class="text-2xl">🛒</span>
                            <div>
                                <h2 class="text-lg font-bold text-gray-800">ตะกร้าสินค้า</h2>
                                <p class="text-xs text-gray-500">{{ totalItems }} รายการ</p>
                            </div>
                        </div>
                        <UButton icon="i-lucide-x" variant="ghost" color="neutral" size="lg"
                            @click="isCartOpen = false" />
                    </div>

                    <!-- Cart Items List -->
                    <div class="flex-1 overflow-y-auto p-4 space-y-3">

                        <!-- Empty Cart -->
                        <div v-if="cartItems.length === 0" class="text-center py-12">
                            <div
                                class="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                                <span class="text-4xl opacity-50">🛒</span>
                            </div>
                            <p class="text-gray-400 font-medium">ยังไม่มีสินค้าในตะกร้า</p>
                            <p class="text-gray-300 text-sm mt-1">เลือกเมนูที่คุณชอบได้เลย!</p>
                        </div>

                        <!-- Cart Item Cards -->
                        <div v-for="item in cartItems" :key="item.menu.id"
                            class="flex items-center gap-3 bg-gray-50 rounded-2xl p-3 border border-gray-100">
                            <!-- Item Image -->
                            <div class="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-amber-50">
                                <img v-if="item.menu.imageUrl" :src="item.menu.imageUrl" :alt="item.menu.name"
                                    class="w-full h-full object-cover">
                                <div v-else class="w-full h-full flex items-center justify-center">
                                    <span class="text-2xl">☕</span>
                                </div>
                            </div>

                            <!-- Item Details -->
                            <div class="flex-1 min-w-0">
                                <h3 class="font-semibold text-gray-800 text-sm truncate">{{ item.menu.name }}</h3>
                                <p class="text-amber-600 font-bold text-sm">{{ formatPrice(item.menu.price) }}</p>
                            </div>

                            <!-- Quantity Controls -->
                            <div class="flex items-center gap-2">
                                <UButton icon="i-lucide-minus" size="xs" color="neutral" variant="soft" square
                                    @click="updateQuantity(item.menu.id, item.quantity - 1)" />
                                <span class="text-sm font-bold w-6 text-center">{{ item.quantity }}</span>
                                <UButton icon="i-lucide-plus" size="xs" color="primary" variant="soft" square
                                    @click="addToCart(item.menu)" />
                            </div>

                            <!-- Delete Button -->
                            <UButton icon="i-lucide-trash-2" size="xs" color="error" variant="ghost"
                                @click="removeFromCart(item.menu.id)" />
                        </div>
                    </div>

                    <!-- Cart Footer -->
                    <div class="border-t p-4 space-y-4 bg-white">

                        <!-- Order Summary -->
                        <div v-if="cartItems.length > 0"
                            class="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-4 space-y-2">
                            <div v-for="item in cartItems" :key="item.menu.id" class="flex justify-between text-sm">
                                <span class="text-gray-600 truncate flex-1">{{ item.menu.name }} x{{ item.quantity
                                }}</span>
                                <span class="font-medium text-gray-800 ml-2">{{ formatPrice(item.menu.price *
                                    item.quantity) }}</span>
                            </div>
                            <div class="border-t border-amber-200 pt-3 flex justify-between items-center">
                                <span class="font-bold text-gray-800">รวมทั้งหมด</span>
                                <span
                                    class="text-xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                                    {{ formatPrice(totalPrice) }}
                                </span>
                            </div>
                        </div>

                        <!-- Success Message -->
                        <Transition name="fade">
                            <div v-if="sendSuccess" class="space-y-3">
                                <UAlert color="success" variant="soft" title="🎉 สั่งซื้อสำเร็จ!"
                                    description="กรุณาตรวจสอบใบเสร็จใน LINE เพื่อชำระเงิน"
                                    icon="i-lucide-check-circle" />

                                <div v-if="paymentQrUrl"
                                    class="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center">
                                    <p class="text-xs text-gray-500 mb-2">สแกน QR เพื่อจ่ายเงิน</p>
                                    <img :src="paymentQrUrl" alt="PromptPay QR"
                                        class="w-48 h-48 mx-auto rounded-lg object-contain mb-2 border border-gray-100">
                                    <p class="text-xs font-bold text-amber-600">📸 ส่งสลิปในแชทเพื่อยืนยัน</p>
                                </div>
                            </div>
                        </Transition>

                        <!-- Error Message -->
                        <Transition name="fade">
                            <UAlert v-if="orderError" color="error" variant="soft" :title="orderError"
                                icon="i-lucide-alert-circle" />
                        </Transition>

                        <!-- Action Buttons -->
                        <div class="flex gap-3">
                            <UButton color="neutral" variant="outline" size="lg" class="flex-1"
                                :disabled="isSending || cartItems.length === 0" @click="clearCart">
                                ล้างตะกร้า
                            </UButton>
                            <UButton color="primary" size="lg" class="flex-[2]" :loading="isSending"
                                :disabled="cartItems.length === 0 || !userProfile" @click="handleOrder">
                                <template #leading>
                                    <span v-if="!isSending">📤</span>
                                </template>
                                {{ isSending ? 'กำลังส่ง...' : 'สั่งซื้อ & ส่งใบเสร็จ' }}
                            </UButton>
                        </div>

                        <!-- Hint for not logged in -->
                        <p v-if="!userProfile" class="text-xs text-center text-amber-600 font-medium">
                            ⚠️ กรุณาเปิดใน LINE app เพื่อสั่งซื้อ
                        </p>
                        <p v-else-if="!isInClient" class="text-xs text-center text-gray-400">
                            💡 ใบเสร็จจะถูกส่งไปยัง LINE ของคุณโดยตรง
                        </p>
                    </div>
                </div>
            </template>
        </USlideover>
    </div>
</template>

<style scoped>
/* Slide up animation */
.slide-up-enter-active,
.slide-up-leave-active {
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-up-enter-from,
.slide-up-leave-to {
    transform: translateY(100%);
    opacity: 0;
}

/* Pop animation for badges */
.pop-enter-active {
    animation: pop 0.3s ease-out;
}

.pop-leave-active {
    animation: pop 0.2s ease-in reverse;
}

@keyframes pop {
    0% {
        transform: scale(0);
        opacity: 0;
    }

    50% {
        transform: scale(1.2);
    }

    100% {
        transform: scale(1);
        opacity: 1;
    }
}

/* Fade animation */
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
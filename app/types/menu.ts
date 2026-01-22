// types/menu.ts
export interface Menu {
    id: number
    name: string
    price: number
    description: string | null
    category: string
    imageUrl: string | null
    isAvailable: boolean
    createdAt: string
    updatedAt: string
}

export interface CartItem {
    menu: Menu
    quantity: number
}

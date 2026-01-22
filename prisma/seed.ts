// prisma/seed.ts
import { prisma } from '../server/utils/db'

async function main() {
    console.log('🌱 Starting seeding...')

    // ลบข้อมูลเก่าทิ้งก่อน (Optional) เพื่อไม่ให้ข้อมูลซ้ำเวลา Run หลายรอบ
    // await prisma.orderItem.deleteMany()
    // await prisma.order.deleteMany()
    await prisma.menu.deleteMany()

    // ข้อมูลเมนูเริ่มต้น (Seed Data)
    const menus = [
        // --- หมวดกาแฟ (Coffee) ---
        {
            name: 'Iced Americano',
            description: 'อเมริกาโน่เย็น เข้มข้น ไม่หวาน (เลือกความหวานได้)',
            price: 55,
            category: 'coffee',
            imageUrl: 'https://images.unsplash.com/photo-1517701604599-bb29b5dd73ad?auto=format&fit=crop&w=500&q=60',
            isAvailable: true,
        },
        {
            name: 'Hot Latte',
            description: 'ลาเต้ร้อน ฟองนมนุ่มละมุน เสิร์ฟพร้อมลาย Latte Art',
            price: 60,
            category: 'coffee',
            imageUrl: 'https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?auto=format&fit=crop&w=500&q=60',
            isAvailable: true,
        },
        {
            name: 'Iced Cappuccino',
            description: 'คาปูชิโน่เย็น ฟองนมหนานุ่ม โรยผงโกโก้',
            price: 65,
            category: 'coffee',
            imageUrl: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=500&q=60',
            isAvailable: true,
        },
        {
            name: 'Caramel Macchiato',
            description: 'กาแฟผสมนมสด ราดซอสคาราเมล หอมหวาน',
            price: 75,
            category: 'coffee',
            imageUrl: 'https://images.unsplash.com/photo-1485808191679-5f8c7c860695?auto=format&fit=crop&w=500&q=60',
            isAvailable: true,
        },
        {
            name: 'Es-Yen (Thai Style)',
            description: 'เอสเพรสโซ่เย็น สไตล์ไทย หวานมัน ถึงใจ',
            price: 60,
            category: 'coffee',
            imageUrl: 'https://images.unsplash.com/photo-1599398054066-846f28917f38?auto=format&fit=crop&w=500&q=60',
            isAvailable: true,
        },
        {
            name: 'Iced Mocha',
            description: 'มอคค่าเย็น ผสมผสานกาแฟและช็อกโกแลตอย่างลงตัว',
            price: 70,
            category: 'coffee',
            imageUrl: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=500&q=60',
            isAvailable: true,
        },

        // --- หมวดไม่ใช่กาแฟ (Non-Coffee) ---
        {
            name: 'Iced Matcha Latte',
            description: 'มัจฉะลาเต้เย็น ใช้ผงมัจฉะแท้จากญี่ปุ่น',
            price: 70,
            category: 'tea',
            imageUrl: 'https://images.unsplash.com/photo-1515823664972-6d9028334863?auto=format&fit=crop&w=500&q=60',
            isAvailable: true,
        },
        {
            name: 'Thai Tea',
            description: 'ชาไทยเย็น สีส้ม หอมชาคั่ว สูตรต้นตำรับ',
            price: 50,
            category: 'tea',
            imageUrl: 'https://images.unsplash.com/photo-1626509653294-46b856b7c53e?auto=format&fit=crop&w=500&q=60',
            isAvailable: true,
        },
        {
            name: 'Chocolate Frappe',
            description: 'ช็อกโกแลตปั่น เข้มข้น ท็อปด้วยวิปครีม',
            price: 80,
            category: 'dessert',
            imageUrl: 'https://images.unsplash.com/photo-1577805947697-89e18249d767?auto=format&fit=crop&w=500&q=60',
            isAvailable: true,
        },
        {
            name: 'Lychee Tea',
            description: 'ชาลิ้นจี่ หอมหวานสดชื่น ดับกระหาย',
            price: 55,
            category: 'tea',
            imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=500&q=60',
            isAvailable: true,
        }
    ]

    console.log(`📦 Adding ${menus.length} menu items...`)

    for (const menu of menus) {
        const result = await prisma.menu.create({
            data: menu,
        })
        console.log(`✅ Created menu: ${result.name} (ID: ${result.id})`)
    }

    console.log('✨ Seeding completed.')
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
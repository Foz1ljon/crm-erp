import type { INotification, NotificationCategory, NotificationSeverity } from '@/types/notifications'
import { daysAgo, mulberry32 } from './crm.mock'

const rand = mulberry32(4242)
const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min

interface Template {
  title: string
  message: string
  severity: NotificationSeverity
  category: NotificationCategory
}

const TEMPLATES: Template[] = [
  { title: 'Kam qoldiq haqida ogohlantirish', message: "RFID yorliq rulosi buyurtma chegarasidan pastga tushdi.", severity: 'warning', category: 'inventory' },
  { title: 'Bitim yutildi', message: 'Zarafshon Tekstil — Shartnomani yangilash "Yutilgan" deb belgilandi.', severity: 'success', category: 'deal' },
  { title: "Hisob-faktura muddati o'tdi", message: 'INV-1042 hisob-fakturasi 7 kundan beri kechikmoqda.', severity: 'error', category: 'finance' },
  { title: 'Yangi bitim yaratildi', message: "Andijon Mashinasozlik uchun yangi bitim ochildi.", severity: 'info', category: 'deal' },
  { title: 'Xarid buyurtmasi tasdiqlandi', message: 'PO-2024003 tasdiqlandi va yetkazib beruvchiga yuborildi.', severity: 'success', category: 'inventory' },
  { title: 'Jo\'natma kechikdi', message: "SHP-5004 jo'natmasi yo'lda kechikmoqda.", severity: 'warning', category: 'logistics' },
  { title: 'Yangi xodim ishga qabul qilindi', message: "Sotuv bo'limiga yangi xodim yozuvi qo'shildi.", severity: 'info', category: 'hr' },
  { title: 'Ombor qoldig\'i tugadi', message: "Yuk ko'taruvchi batareyasi B ombori uchun tugagan.", severity: 'error', category: 'inventory' },
  { title: "To'lov qabul qilindi", message: "Oltin Vodiy Savdo uchun 148,000,000 so'm to'lov qayd etildi.", severity: 'success', category: 'finance' },
  { title: "Jo'natma yetkazildi", message: "SHP-5001 jo'natmasi o'z vaqtida yetkazildi.", severity: 'success', category: 'logistics' },
  { title: 'Tizim texnik xizmati', message: 'Rejalashtirilgan texnik xizmat bugun kechqurun soat 2:00 da yakunlanadi.', severity: 'info', category: 'system' },
  { title: "Xodim ta'tilda", message: "Ombor jamoasidan bir xodim ta'tilga chiqdi.", severity: 'info', category: 'hr' },
  { title: 'Yirik bitim xavf ostida', message: "Buxoro Import Kompaniyasi — Ko'p yillik shartnoma 14 kundan beri faolliksiz.", severity: 'warning', category: 'deal' },
  { title: 'Byudjet chegarasiga yetdi', message: "Marketing xarajatlari choraklik byudjetning 90% ga yetdi.", severity: 'warning', category: 'finance' },
]

export function generateNotificationsDataset(): INotification[] {
  return TEMPLATES.map((template, index) => ({
    id: `notif-${index + 1}`,
    title: template.title,
    message: template.message,
    severity: template.severity,
    category: template.category,
    isRead: index >= 5,
    createdAt: daysAgo(randInt(0, 21)),
  })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

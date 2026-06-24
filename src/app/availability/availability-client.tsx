'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import Toast from '@/components/Toast'
import { Clock, Info, ShieldCheck, Check, HelpCircle, XCircle } from 'lucide-react'
import { updateAvailabilitySlot } from '../actions'

interface Profile {
  id: string
  name: string
  email: string
  role: string
  avatar_url: string
}

interface AvailabilitySlot {
  day_of_week: number
  hour: number
  status: 'available' | 'unavailable' | 'maybe'
}

interface AvailabilityClientProps {
  currentProfile: Profile
  initialAvailability: AvailabilitySlot[]
}

const daysOfWeekArabic = [
  'السبت',
  'الأحد',
  'الاثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة'
]

// خريطة لتنسيق خلايا المتاحية لتتلاءم مع المظهر الجديد
const statusStyles = {
  unavailable: 'bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20 text-rose-400',
  available: 'bg-emerald-500 border-emerald-600 text-white shadow-sm',
  maybe: 'bg-amber-400 border-amber-500 text-neutral-900 shadow-sm'
}

const statusLabels = {
  unavailable: 'غير متاح',
  available: 'متاح للعمل',
  maybe: 'متوقع / محتمل'
}

export default function AvailabilityClient({ currentProfile, initialAvailability }: AvailabilityClientProps) {
  // تخزين المتاحية في خريطة مفاتيحها `day-hour` لتسريع الوصول
  const [availabilityMap, setAvailabilityMap] = useState<Record<string, 'available' | 'unavailable' | 'maybe'>>(() => {
    const map: Record<string, 'available' | 'unavailable' | 'maybe'> = {}
    // تعبئة البيانات الأولية
    initialAvailability.forEach(slot => {
      map[`${slot.day_of_week}-${slot.hour}`] = slot.status
    })
    return map
  })

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setToast({ message, type })
  }

  // التبديل الدائري بين الحالات الثلاث عند النقر
  const handleSlotClick = async (day: number, hour: number) => {
    const key = `${day}-${hour}`
    const currentStatus = availabilityMap[key] || 'unavailable'
    
    let nextStatus: 'available' | 'unavailable' | 'maybe' = 'available'
    if (currentStatus === 'available') {
      nextStatus = 'maybe'
    } else if (currentStatus === 'maybe') {
      nextStatus = 'unavailable'
    }

    // تحديث الحالة محلياً فوراً (Optimistic Update) لسرعة بصرية مذهلة
    setAvailabilityMap(prev => ({
      ...prev,
      [key]: nextStatus
    }))

    try {
      await updateAvailabilitySlot(day, hour, nextStatus)
    } catch (err: any) {
      // في حال الفشل، تراجع عن التعديل محلياً وأظهر خطأ
      setAvailabilityMap(prev => ({
        ...prev,
        [key]: currentStatus
      }))
      showToast('فشل تحديث الساعة: ' + err.message, 'error')
    }
  }

  // ملء يوم كامل بحالة معينة دفعة واحدة لتوفير وقت المستخدم
  const fillDayStatus = async (day: number, status: 'available' | 'unavailable' | 'maybe') => {
    const backupMap = { ...availabilityMap }
    const updatedMap = { ...availabilityMap }
    
    for (let hour = 0; hour < 24; hour++) {
      updatedMap[`${day}-${hour}`] = status
    }
    
    setAvailabilityMap(updatedMap)

    try {
      // إرسال التحديثات بشكل متوازي
      await Promise.all(
        Array.from({ length: 24 }).map((_, hour) => 
          updateAvailabilitySlot(day, hour, status)
        )
      )
      showToast(`تم تعيين يوم ${daysOfWeekArabic[day]} بالكامل كـ: ${statusLabels[status]}`, 'success')
    } catch (err: any) {
      setAvailabilityMap(backupMap)
      showToast('فشل تحديث اليوم بالكامل: ' + err.message, 'error')
    }
  }

  return (
    <div className="flex-grow flex flex-col min-h-screen pb-24 md:pb-8">
      <Header user={currentProfile} />

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <section className="space-y-6 animate-modal-in">
          
          <div className="border-b border-theme-border pb-5 text-right">
            <h1 className="text-2xl font-bold text-theme-text">أوقات توفري الأسبوعية</h1>
            <p className="text-xs text-theme-text-muted mt-1">
              حدد ساعات عملك وتواجدك المفضلة خلال الأسبوع. انقر على أي مربع لتغيير حالته، وسيتم الحفظ سحابياً فوراً.
            </p>
          </div>

          {/* دليل الألوان والأزرار السريعة */}
          <div className="bg-theme-panel border border-theme-border rounded-3xl p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-right">
            <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-theme-text">
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-md bg-emerald-500"></span>
                <span>متاح للعمل (أخضر)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-md bg-amber-400"></span>
                <span>متوقع / محتمل (أصفر)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-md bg-rose-500/10 border border-rose-500/20"></span>
                <span>غير متاح (أحمر)</span>
              </span>
            </div>

            <div className="flex items-center gap-2 text-[10px] text-theme-text-muted leading-relaxed max-w-md">
              <Info className="w-4 h-4 text-theme-text-muted shrink-0" />
              <span>ملاحظة: جدول المتاحية هذا ثابت أسبوعياً، ويمكن لمدير النظام الاطلاع عليه في أي وقت لتنسيق المهام والمشاريع.</span>
            </div>
          </div>

          {/* شبكة المتاحية الأسبوعية الفخمة */}
          <div className="bg-theme-panel border border-theme-border rounded-3xl p-6 shadow-sm overflow-x-auto scrollbar-hide">
            <div className="min-w-[800px] space-y-4">
              
              {/* ترويسة الساعات من 00 إلى 23 */}
              <div className="flex items-center text-center text-[10px] text-theme-text-muted font-bold border-b border-theme-border pb-2">
                <div className="w-24 shrink-0 text-right pr-2">اليوم / الساعة</div>
                <div className="flex-grow grid gap-1" style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}>
                  {Array.from({ length: 24 }).map((_, hour) => (
                    <div key={hour} className="py-1">
                      {String(hour).padStart(2, '0')}
                    </div>
                  ))}
                </div>
              </div>

              {/* أسطر الأيام */}
              {daysOfWeekArabic.map((dayName, dayIndex) => (
                <div key={dayIndex} className="flex items-center py-1 group">
                  
                  {/* اسم اليوم وخيارات التعبئة السريعة */}
                  <div className="w-24 shrink-0 text-right flex flex-col justify-center">
                    <span className="text-xs font-bold text-theme-text">{dayName}</span>
                    <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => fillDayStatus(dayIndex, 'available')}
                        className="text-[8px] bg-emerald-950/20 text-emerald-400 hover:bg-emerald-950/40 border border-emerald-500/10 px-1.5 py-0.5 rounded cursor-pointer font-bold transition-colors"
                        title="تعبئة اليوم بالكامل كمتاح"
                      >
                        متاح
                      </button>
                      <button 
                        onClick={() => fillDayStatus(dayIndex, 'unavailable')}
                        className="text-[8px] bg-rose-950/20 text-rose-400 hover:bg-rose-950/40 border border-rose-500/10 px-1.5 py-0.5 rounded cursor-pointer font-bold transition-colors"
                        title="تعبئة اليوم بالكامل كغير متاح"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>

                  {/* مربعات الـ 24 ساعة */}
                  <div className="flex-grow grid gap-1" style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}>
                    {Array.from({ length: 24 }).map((_, hour) => {
                      const key = `${dayIndex}-${hour}`
                      const status = availabilityMap[key] || 'unavailable'
                      const classes = statusStyles[status]
                      
                      return (
                        <button
                          key={hour}
                          onClick={() => handleSlotClick(dayIndex, hour)}
                          className={`aspect-square rounded-lg border text-[9px] font-bold flex items-center justify-center transition-all cursor-pointer select-none active:scale-95 ${classes}`}
                          title={`يوم ${dayName} | الساعة ${String(hour).padStart(2, '0')}:00 - الحالة: ${statusLabels[status]}`}
                        >
                          {status === 'available' ? '✓' : status === 'maybe' ? '؟' : ''}
                        </button>
                      )
                    })}
                  </div>

                </div>
              ))}

            </div>
          </div>

        </section>
      </main>

      {/* عرض التنبيهات */}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
    </div>
  )
}

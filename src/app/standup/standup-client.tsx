'use client'

import { useState, useEffect, useTransition } from 'react'
import Header from '@/components/Header'
import Toast from '@/components/Toast'
import DatePicker from '@/components/DatePicker'
import { 
  MessageSquare, 
  Star, 
  Loader2, 
  Send, 
  User, 
  Users,
  AlertOctagon, 
  CheckCircle2, 
  Calendar, 
  AlertCircle,
  HelpCircle,
  Trash2,
  TrendingUp,
  Bell,
  BellOff
} from 'lucide-react'
import { getDailyStandups, submitDailyStandup, deleteDailyStandup, savePushSubscription, deletePushSubscription } from '../actions'

interface Profile {
  id: string
  name: string
  email: string
  role: string
  avatar_url: string
}

interface Standup {
  id: string
  user_id: string
  date: string
  today_tasks: string
  tomorrow_tasks: string
  blockers: string | null
  mood: 'energetic' | 'stable' | 'tired' | 'stressed'
  progress_rate: 'all' | 'most' | 'half' | 'low'
  productivity_score: number
  created_at: string
  milestone_id?: string | null
  milestone?: {
    id: string
    title: string
  } | null
  user: {
    name: string
    email: string
    avatar_url: string
  }
}

interface Milestone {
  id: string
  title: string
  status: string
}

interface StandupClientProps {
  currentProfile: Profile
  teamProfiles: Profile[]
  initialMilestones: Milestone[]
}

const moodMap = {
  energetic: { label: 'طاقة عالية 🚀', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  stable: { label: 'طبيعي ومستقر 😊', color: 'bg-sky-500/10 text-sky-500 border-sky-500/20' },
  tired: { label: 'متعب 🥱', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  stressed: { label: 'مضغوط جداً 🤯', color: 'bg-rose-500/10 text-rose-500 border-rose-500/20' }
}

const progressMap = {
  all: { label: 'أنجزت كل المخطط 💯', color: 'bg-emerald-500/10 text-emerald-500' },
  most: { label: 'أنجزت معظم المخطط 🔄', color: 'bg-sky-500/10 text-sky-500' },
  half: { label: 'أنجزت نصف المخطط ⏳', color: 'bg-amber-500/10 text-amber-500' },
  low: { label: 'واجهت صعوبات ⚠️', color: 'bg-rose-500/10 text-rose-500' }
}

export default function StandupClient({ currentProfile, teamProfiles, initialMilestones }: StandupClientProps) {
  const [milestones] = useState<Milestone[]>(initialMilestones || [])
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })

  const [standups, setStandups] = useState<Standup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' | 'error' } | null>(null)

  // حالة النموذج
  const [todayTasks, setTodayTasks] = useState('')
  const [tomorrowTasks, setTomorrowTasks] = useState('')
  const [blockers, setBlockers] = useState('')
  const [mood, setMood] = useState<'energetic' | 'stable' | 'tired' | 'stressed'>('stable')
  const [progressRate, setProgressRate] = useState<'all' | 'most' | 'half' | 'low'>('most')
  const [productivityScore, setProductivityScore] = useState(5)
  const [hoveredStar, setHoveredStar] = useState<number | null>(null)
  const [isFormVisible, setIsFormVisible] = useState(false)
  const [hasExistingReport, setHasExistingReport] = useState(false)
  const [milestoneId, setMilestoneId] = useState<string>('')

  // حالات إشعارات الويب اللحظية
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isSubscribing, setIsSubscribing] = useState(false)

  // التحقق من حالة اشتراك الإشعارات للجهاز الحالي عند التحميل
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return
    }

    navigator.serviceWorker.ready.then((registration) => {
      registration.pushManager.getSubscription().then((subscription) => {
        setIsSubscribed(!!subscription)
      })
    })
  }, [])

  // دالة تحويل مفتاح VAPID العام إلى الصيغة الرقمية المناسبة
  function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  // تفعيل أو إلغاء تفعيل الإشعارات
  const handleNotificationToggle = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      showToast('جهازك أو متصفحك الحالي لا يدعم إشعارات الويب اللحظية.', 'warning')
      return
    }

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      showToast('يرجى تمكين صلاحية الإشعارات لموقعنا من إعدادات متصفحك أولاً.', 'warning')
      return
    }

    try {
      setIsSubscribing(true)
      const registration = await navigator.serviceWorker.ready
      
      if (isSubscribed) {
        // إلغاء تفعيل الاشتراك الحالي
        const subscription = await registration.pushManager.getSubscription()
        if (subscription) {
          await subscription.unsubscribe()
          await deletePushSubscription(subscription.endpoint)
        }
        setIsSubscribed(false)
        showToast('تم إلغاء تفعيل إشعارات اللقاء اليومي بنجاح.', 'success')
      } else {
        // تفعيل اشتراك جديد
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        if (!vapidPublicKey) {
          throw new Error('مفتاح إشعارات الويب العام VAPID_PUBLIC_KEY غير متوفر.')
        }

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
        })

        await savePushSubscription(JSON.parse(JSON.stringify(subscription)))
        setIsSubscribed(true)
        showToast('تم تفعيل إشعارات اللقاء اليومي على هذا الجهاز بنجاح! 🔔', 'success')
      }
    } catch (err: any) {
      console.error('فشل معالجة اشتراك الإشعارات:', err)
      showToast('فشل تفعيل الإشعارات: ' + err.message, 'error')
    } finally {
      setIsSubscribing(false)
    }
  }

  const showToast = (message: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setToast({ message, type })
  }

  // جلب تقارير اليوم المختار
  const fetchStandups = async (dateStr: string) => {
    try {
      setIsLoading(true)
      const data = await getDailyStandups(dateStr)
      setStandups(data as Standup[])

      // البحث عن تقرير المستخدم الحالي لتعبئة النموذج تلقائياً
      const myStandup = (data as Standup[]).find(s => s.user_id === currentProfile.id)
      if (myStandup) {
        setTodayTasks(myStandup.today_tasks)
        setTomorrowTasks(myStandup.tomorrow_tasks)
        setBlockers(myStandup.blockers || '')
        setMood(myStandup.mood)
        setProgressRate(myStandup.progress_rate)
        setProductivityScore(myStandup.productivity_score)
        setMilestoneId(myStandup.milestone_id || '')
        setHasExistingReport(true)
      } else {
        // تفريغ النموذج إذا لم يكن هناك تقرير سابق في هذا اليوم
        setTodayTasks('')
        setTomorrowTasks('')
        setBlockers('')
        setMood('stable')
        setProgressRate('most')
        setProductivityScore(5)
        setMilestoneId('')
        setHasExistingReport(false)
      }
    } catch (err: any) {
      showToast('فشل تحميل التقارير: ' + err.message, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchStandups(selectedDate)
  }, [selectedDate])

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!todayTasks.trim() || !tomorrowTasks.trim()) {
      showToast('يرجى ملء الأسئلة الرئيسية للتحديث اليومي', 'warning')
      return
    }

    startTransition(async () => {
      try {
        await submitDailyStandup(
          todayTasks,
          tomorrowTasks,
          blockers,
          mood,
          progressRate,
          productivityScore,
          selectedDate,
          milestoneId || null
        )
        showToast('تم حفظ تحديثك اليومي بنجاح', 'success')
        fetchStandups(selectedDate)
      } catch (err: any) {
        showToast('حدث خطأ أثناء حفظ التحديث: ' + err.message, 'error')
      }
    })
  }

  const handleDeleteReport = () => {
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف تحديثك اليومي لهذا اليوم؟')) {
      return
    }

    startTransition(async () => {
      try {
        await deleteDailyStandup(selectedDate)
        showToast('تم حذف تحديثك اليومي بنجاح', 'success')
        fetchStandups(selectedDate)
      } catch (err: any) {
        showToast('حدث خطأ أثناء حذف التحديث: ' + err.message, 'error')
      }
    })
  }

  // تصفية الأعضاء الذين شاركوا والذين لم يشاركوا
  const participatingIds = standups.map(s => s.user_id)
  const nonParticipants = teamProfiles.filter(p => !participatingIds.includes(p.id))

  return (
    <div className="flex-grow flex flex-col min-h-screen pb-24 md:pb-8">
      <Header user={currentProfile} />

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="space-y-6">
          
          {/* العناوين والتحكم بالتاريخ */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-b border-theme-border pb-5 text-right">
            <div>
              <h1 className="text-2xl font-bold text-theme-text">اللقاء اليومي المكتوب (Standup)</h1>
              <p className="text-xs text-theme-text-muted mt-1">مساحة سريعة لمشاركة الإنجازات اليومية، الخطط القادمة، وتنبيه الفريق بأي عقبات تعيق العمل</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 self-stretch md:self-auto w-full md:w-auto justify-end">
              <button
                type="button"
                onClick={handleNotificationToggle}
                disabled={isSubscribing}
                className={`p-2.5 rounded-xl border transition-all flex items-center justify-center shadow-sm cursor-pointer active:scale-95 ${
                  isSubscribed
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/20'
                    : 'bg-theme-panel border-theme-border text-theme-text-muted hover:text-theme-text hover:bg-theme-bg'
                }`}
                title={isSubscribed ? 'إيقاف الإشعارات اللحظية' : 'تفعيل الإشعارات اللحظية على هذا الجهاز'}
              >
                {isSubscribing ? (
                  <Loader2 className="w-4 h-4 animate-spin text-theme-text-muted" />
                ) : isSubscribed ? (
                  <Bell className="w-4 h-4" />
                ) : (
                  <BellOff className="w-4 h-4" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsFormVisible(!isFormVisible)}
                className={`text-xs font-bold px-4 py-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 ${
                  isFormVisible
                    ? 'bg-theme-text border-theme-text text-theme-panel hover:opacity-90'
                    : 'bg-theme-panel border-theme-border text-theme-text hover:bg-theme-bg'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>{isFormVisible ? 'إخفاء نموذج الإدخال' : 'كتابة تحديثي اليومي'}</span>
              </button>

              <div className="flex items-center gap-2 min-w-[180px]">
                <span className="text-xs font-bold text-theme-text-muted hidden sm:inline whitespace-nowrap">تاريخ التقرير:</span>
                <DatePicker value={selectedDate} onChange={setSelectedDate} className="py-2.5" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* العمود الأيمن: نموذج الكتابة */}
            {isFormVisible && (
              <div className="lg:col-span-5 bg-theme-panel rounded-3xl p-6 border border-theme-border shadow-sm space-y-5 text-right relative overflow-hidden animate-modal-in">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-l from-theme-accent to-theme-accent/40"></div>
              
              <div>
                <h3 className="text-sm font-black text-theme-text flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-theme-accent" />
                  <span>{hasExistingReport ? 'تعديل تحديثك اليومي' : 'تحديثك اليومي السريع'}</span>
                </h3>
                <p className="text-[10px] text-theme-text-muted mt-0.5">اكتب تقرير اليوم للتاريخ المختار ({selectedDate})</p>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-5">
                
                {/* 1. تقييم الإنتاجية الذاتي (1-5 نجوم) */}
                <div className="bg-theme-bg/40 border border-theme-border/60 rounded-2xl p-4 space-y-2">
                  <label className="block text-xs font-bold text-theme-text">1. كيف تقيم إنجازك وإنتاجيتك اليوم؟</label>
                  <div className="flex items-center gap-1.5 justify-start direction-ltr" style={{ direction: 'ltr' }}>
                    {[1, 2, 3, 4, 5].map((star) => {
                      const isLit = hoveredStar !== null ? star <= hoveredStar : star <= productivityScore
                      return (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setProductivityScore(star)}
                          onMouseEnter={() => setHoveredStar(star)}
                          onMouseLeave={() => setHoveredStar(null)}
                          className="p-1 cursor-pointer transition-all duration-150 transform hover:scale-125 focus:outline-none"
                        >
                          <Star 
                            className={`w-6 h-6 ${
                              isLit 
                                ? 'text-amber-500 fill-amber-500 filter drop-shadow-[0_0_2px_rgba(245,158,11,0.4)]' 
                                : 'text-theme-text-muted opacity-40'
                            } transition-colors`}
                          />
                        </button>
                      )
                    })}
                    <span className="text-xs font-bold text-theme-text-muted ml-3 pt-1">
                      {productivityScore} من 5
                    </span>
                  </div>
                </div>

                {/* 2. الحالة المزاجية ومستوى الطاقة */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-theme-text">2. ما هي حالتك المزاجية ومستوى طاقتك اليوم؟</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(moodMap) as Array<keyof typeof moodMap>).map((key) => {
                      const selected = mood === key
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setMood(key)}
                          className={`flex items-center justify-center p-3 rounded-xl border text-xs font-bold transition-all duration-200 cursor-pointer ${
                            selected 
                              ? 'bg-theme-accent text-theme-panel border-theme-accent shadow-sm'
                              : 'bg-theme-bg border-theme-border text-theme-text hover:border-theme-border/80'
                          }`}
                        >
                          {moodMap[key].label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* 3. معدل إنجاز أهداف اليوم */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-theme-text">3. ما مدى تحقيقك لأهداف اليوم المخطط لها؟</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(progressMap) as Array<keyof typeof progressMap>).map((key) => {
                      const selected = progressRate === key
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setProgressRate(key)}
                          className={`flex items-center justify-center p-2.5 rounded-xl border text-[11px] font-bold transition-all duration-200 cursor-pointer ${
                            selected 
                              ? 'bg-theme-accent text-theme-panel border-theme-accent shadow-sm'
                              : 'bg-theme-bg border-theme-border text-theme-text hover:border-theme-border/80'
                          }`}
                        >
                          {progressMap[key].label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* 4. ماذا أنجزت اليوم؟ */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-theme-text">4. ماذا أنجزت اليوم باختصار؟ <span className="text-rose-500">*</span></label>
                  <textarea
                    rows={2}
                    value={todayTasks}
                    onChange={(e) => setTodayTasks(e.target.value)}
                    required
                    placeholder="مثال: أكملت برمجة لوحة التحكم وحل مشاكل الهاتف..."
                    className="w-full bg-theme-input border border-theme-border focus:border-theme-accent focus:bg-theme-panel text-theme-text rounded-xl p-3 text-xs transition-all outline-none resize-none leading-relaxed"
                  />
                </div>

                {/* 5. ماذا ستفعل غداً؟ */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-theme-text">5. ماذا ستقوم بفعله غداً؟ <span className="text-rose-500">*</span></label>
                  <textarea
                    rows={2}
                    value={tomorrowTasks}
                    onChange={(e) => setTomorrowTasks(e.target.value)}
                    required
                    placeholder="مثال: سأبدأ في تصميم صفحة الأرشيف وربط API..."
                    className="w-full bg-theme-input border border-theme-border focus:border-theme-accent focus:bg-theme-panel text-theme-text rounded-xl p-3 text-xs transition-all outline-none resize-none leading-relaxed"
                  />
                </div>

                {/* 6. ربط المحطة الكبرى */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-theme-text flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-theme-accent" />
                    <span>5. عملك اليوم يخدم أي محطة كبرى مباشرة؟</span>
                  </label>
                  <select 
                    value={milestoneId}
                    onChange={(e) => setMilestoneId(e.target.value)}
                    className="w-full bg-theme-input border border-theme-border focus:border-theme-accent focus:bg-theme-panel text-theme-text rounded-xl px-4 py-3 text-xs transition-all outline-none cursor-pointer font-semibold"
                  >
                    <option value="">أعمال عامة / أخرى (خارج المحطات الاستراتيجية)</option>
                    {milestones.filter(m => m.status === 'active').map((m) => (
                      <option key={m.id} value={m.id}>🎯 {m.title}</option>
                    ))}
                  </select>
                </div>

                {/* 7. عقبات أو معوقات؟ */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-rose-500 flex items-center gap-1">
                    <span>6. هل توجد أي عقبة تعطّل عملك حالياً؟ (اختياري)</span>
                  </label>
                  <textarea
                    rows={1.5}
                    value={blockers}
                    onChange={(e) => setBlockers(e.target.value)}
                    placeholder="مثال: أنتظر إرسال ملفات التصميم من شريكي لربط الواجهة..."
                    className="w-full bg-theme-input border border-rose-500/20 focus:border-rose-500 focus:bg-theme-panel text-theme-text rounded-xl p-3 text-xs transition-all outline-none resize-none leading-relaxed"
                  />
                </div>

                {/* زر الحفظ والحذف */}
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="flex-grow bg-theme-accent hover:bg-theme-accent-hover text-theme-panel font-bold py-3.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow active:scale-98"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>جاري الحفظ...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>{hasExistingReport ? 'حفظ التعديلات' : 'إرسال التحديث اليومي'}</span>
                      </>
                    )}
                  </button>
                  
                  {hasExistingReport && (
                    <button
                      type="button"
                      onClick={handleDeleteReport}
                      disabled={isPending}
                      className="px-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 hover:text-rose-600 border border-rose-500/20 font-bold rounded-xl text-xs transition-all flex items-center justify-center cursor-pointer active:scale-95"
                      title="حذف هذا التحديث"
                    >
                      <Trash2 className="w-4.5 h-4.5 animate-modal-in" />
                    </button>
                  )}
                </div>
              </form>
            </div>
            )}

            {/* العمود الأيسر: لوحة تقارير الفريق */}
            <div className={`${isFormVisible ? 'lg:col-span-7' : 'lg:col-span-12'} space-y-6 text-right transition-all duration-300`}>
              
              {/* قسم العنوان الفرعي */}
              <div className="flex items-center justify-between border-b border-theme-border pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-theme-accent"></span>
                  <h2 className="text-sm font-bold text-theme-text">تحديثات الشركاء لليوم المختار</h2>
                </div>
                <span className="text-xs font-bold text-theme-panel bg-theme-accent px-3 py-1 rounded-full">
                  {standups.length} مشارك
                </span>
              </div>

              {isLoading ? (
                <div className="flex flex-col items-center justify-center p-16 text-theme-text-muted">
                  <Loader2 className="w-8 h-8 animate-spin text-theme-accent mb-2" />
                  <span className="text-xs">جاري تحميل تحديثات الشركاء...</span>
                </div>
              ) : standups.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-16 text-center bg-theme-panel rounded-3xl border border-dashed border-theme-border">
                  <AlertCircle className="w-12 h-12 text-theme-text-muted mb-3 opacity-60" />
                  <h3 className="text-sm font-bold text-theme-text">لم يتم نشر أي تحديثات لهذا اليوم بعد</h3>
                  <p className="text-xs text-theme-text-muted max-w-xs mt-1 leading-relaxed">
                    لا تتوفر تقارير Standup مسجلة للأعضاء في هذا التاريخ. كن أول من يكتب تحديثه اليوم!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {standups.map((standup) => {
                    const hasBlockers = !!standup.blockers?.trim()
                    
                    return (
                      <div
                        key={standup.id}
                        className={`bg-theme-panel rounded-2xl p-5 border shadow-sm transition-all duration-200 flex flex-col gap-4 relative overflow-hidden ${
                          hasBlockers 
                            ? 'border-rose-500/30 bg-gradient-to-br from-theme-panel to-rose-500/[0.02]' 
                            : 'border-theme-border'
                        }`}
                      >
                        {/* خط إشارة لوجود عقبة معطلة */}
                        {hasBlockers && (
                          <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-rose-500"></div>
                        )}

                        {/* رأس الكارت: معلومات المستخدم والخيارات التفاعلية */}
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={standup.user.avatar_url}
                              alt={standup.user.name}
                              className="w-10 h-10 rounded-xl object-cover border border-theme-border"
                            />
                            <div>
                              <h4 className="text-xs font-black text-theme-text">{standup.user.name}</h4>
                              {/* عرض النجوم */}
                              <div className="flex items-center gap-0.5 mt-0.5 text-amber-500">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-3 h-3 ${
                                      i < standup.productivity_score 
                                        ? 'fill-amber-500' 
                                        : 'text-theme-text-muted opacity-30'
                                    }`}
                                  />
                                ))}
                                <span className="text-[9px] text-theme-text-muted mr-1.5 font-bold">
                                  {standup.productivity_score}/5
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* شارات الحالة والمزاج */}
                          <div className="flex flex-wrap gap-1.5">
                            {standup.milestone ? (
                              <span className="text-[9px] font-black px-2 py-1 rounded-lg bg-theme-accent text-theme-panel">
                                🎯 {standup.milestone.title}
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold px-2 py-1 rounded-lg bg-theme-bg text-theme-text-muted border border-theme-border/60">
                                ⚙️ أعمال عامة
                              </span>
                            )}
                            <span className={`text-[9px] font-bold px-2 py-1 rounded-lg border ${moodMap[standup.mood]?.color}`}>
                              {moodMap[standup.mood]?.label}
                            </span>
                            <span className="text-[9px] font-bold px-2 py-1 rounded-lg bg-theme-bg text-theme-text border border-theme-border">
                              {progressMap[standup.progress_rate]?.label}
                            </span>
                            {hasBlockers && (
                              <span className="text-[9px] font-black px-2 py-1 rounded-lg bg-rose-500 text-white animate-pulse">
                                🚨 عقبة معطلة
                              </span>
                            )}
                          </div>
                        </div>

                        {/* تفاصيل الأسئلة المكتوبة */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-theme-border/60 pt-4">
                          
                          {/* عمود الإنجاز */}
                          <div className="bg-theme-bg/30 border border-theme-border/40 rounded-xl p-3 space-y-1">
                            <div className="text-[10px] font-black text-theme-text-muted">ماذا أنجز اليوم؟</div>
                            <p className="text-xs text-theme-text leading-relaxed font-medium">
                              {standup.today_tasks}
                            </p>
                          </div>

                          {/* عمود خطة الغد */}
                          <div className="bg-theme-bg/30 border border-theme-border/40 rounded-xl p-3 space-y-1">
                            <div className="text-[10px] font-black text-theme-text-muted">ماذا سيفعل غداً؟</div>
                            <p className="text-xs text-theme-text leading-relaxed font-medium">
                              {standup.tomorrow_tasks}
                            </p>
                          </div>
                        </div>

                        {/* حقل العقبات إذا وجد */}
                        {hasBlockers && (
                          <div className="bg-rose-500/[0.04] border border-rose-500/20 rounded-xl p-3 space-y-1">
                            <div className="text-[10px] font-black text-rose-500 flex items-center gap-1">
                              <AlertOctagon className="w-3.5 h-3.5 shrink-0" />
                              <span>العقبات الحالية (Blockers)</span>
                            </div>
                            <p className="text-xs text-rose-600 dark:text-rose-400 leading-relaxed font-bold">
                              {standup.blockers}
                            </p>
                          </div>
                        )}

                        <div className="text-[9px] text-theme-text-muted self-end">
                          تم النشر في: {new Date(standup.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                        </div>

                      </div>
                    )
                  })}
                </div>
              )}

              {/* قسم غير المشاركين */}
              {!isLoading && nonParticipants.length > 0 && (
                <div className="bg-theme-panel rounded-2xl p-5 border border-theme-border space-y-3">
                  <div className="text-xs font-bold text-theme-text-muted flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    <span>شركاء لم يسجلوا تحديثهم اليوم ({nonParticipants.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-2.5 justify-start">
                    {nonParticipants.map((partner) => (
                      <div
                        key={partner.id}
                        className="flex items-center gap-2 bg-theme-bg hover:bg-theme-border border border-theme-border rounded-xl p-1.5 pr-2.5 transition-colors select-none"
                        title={partner.email}
                      >
                        <img
                          src={partner.avatar_url}
                          alt={partner.name}
                          className="w-6 h-6 rounded-lg object-cover border border-theme-border grayscale opacity-60"
                        />
                        <span className="text-[10px] font-bold text-theme-text-muted">{partner.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

          </div>

        </div>
      </main>

      {/* عرض الرسائل العائمة */}
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

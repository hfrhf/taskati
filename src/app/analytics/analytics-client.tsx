'use client'

import { useState, useTransition } from 'react'
import Header from '@/components/Header'
import Toast from '@/components/Toast'
import { 
  TrendingUp, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  Star, 
  Loader2, 
  User, 
  Users, 
  Award,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { getMonthlyAnalytics } from '../actions'

interface Profile {
  id: string
  name: string
  email: string
  role: string
  avatar_url: string
}

interface UserStat {
  userId: string
  name: string
  email: string
  avatarUrl: string
  role: string
  totalMinutes: number
  totalHours: number
  completedTasksCount: number
  daysLogged: number
  avgProductivity: number
  tasks: string[]
}

interface TeamSummary {
  totalHours: number
  completedTasksCount: number
  avgProductivity: number
}

interface AnalyticsData {
  userStats: UserStat[]
  teamSummary: TeamSummary
}

interface AnalyticsClientProps {
  currentProfile: Profile
  initialData: AnalyticsData
  initialMonth: number
  initialYear: number
}

const months = [
  { value: 1, label: 'يناير' },
  { value: 2, label: 'فبراير' },
  { value: 3, label: 'مارس' },
  { value: 4, label: 'أبريل' },
  { value: 5, label: 'مايو' },
  { value: 6, label: 'يونيو' },
  { value: 7, label: 'يوليو' },
  { value: 8, label: 'أغسطس' },
  { value: 9, label: 'سبتمبر' },
  { value: 10, label: 'أكتوبر' },
  { value: 11, label: 'نوفمبر' },
  { value: 12, label: 'ديسمبر' }
]

const years = [2025, 2026, 2027]

export default function AnalyticsClient({ currentProfile, initialData, initialMonth, initialYear }: AnalyticsClientProps) {
  const [data, setData] = useState<AnalyticsData>(initialData)
  const [month, setMonth] = useState<number>(initialMonth)
  const [year, setYear] = useState<number>(initialYear)
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' | 'error' } | null>(null)
  
  // التحكم في فتح وغلق قائمة مهام كل مستخدم
  const [expandedUsers, setExpandedUsers] = useState<Record<string, boolean>>({})

  const toggleUserExpand = (userId: string) => {
    setExpandedUsers(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }))
  }

  const showToast = (message: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setToast({ message, type })
  }

  const handleFetchData = async (selectedMonth: number, selectedYear: number) => {
    setMonth(selectedMonth)
    setYear(selectedYear)
    startTransition(async () => {
      try {
        const res = await getMonthlyAnalytics(selectedMonth, selectedYear)
        setData(res)
      } catch (err: any) {
        showToast('فشل جلب بيانات التقارير: ' + err.message, 'error')
      }
    })
  }

  // إحصائيات المستخدم الحالي الخاصة
  const myStats = data.userStats.find(s => s.userId === currentProfile.id)

  return (
    <div className="flex-grow flex flex-col min-h-screen pb-24 md:pb-8">
      <Header user={currentProfile} />

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="space-y-6">
          
          {/* الترويسة والتحكم بالفلتر */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-b border-theme-border pb-5 text-right">
            <div>
              <h1 className="text-2xl font-bold text-theme-text">التقارير والإحصائيات الشهرية</h1>
              <p className="text-xs text-theme-text-muted mt-1">تتبع إجمالي ساعات العمل، المهام المكتملة، ومعدلات الأداء الذاتية للفريق والشركاء</p>
            </div>

            <div className="flex items-center gap-3 justify-end">
              {isPending && (
                <Loader2 className="w-5 h-5 animate-spin text-theme-accent" />
              )}
              
              <div className="flex items-center gap-2">
                <select
                  value={month}
                  onChange={(e) => handleFetchData(parseInt(e.target.value), year)}
                  className="bg-theme-panel border border-theme-border focus:border-theme-accent focus:bg-theme-panel text-theme-text rounded-xl px-3 py-2 text-xs transition-all outline-none cursor-pointer font-bold"
                >
                  {months.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>

                <select
                  value={year}
                  onChange={(e) => handleFetchData(month, parseInt(e.target.value))}
                  className="bg-theme-panel border border-theme-border focus:border-theme-accent focus:bg-theme-panel text-theme-text rounded-xl px-3 py-2 text-xs transition-all outline-none cursor-pointer font-bold"
                >
                  {years.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* لوحة مؤشرات الأداء الإجمالية */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* إجمالي ساعات العمل */}
            <div className="bg-theme-panel rounded-2xl p-5 border border-theme-border shadow-sm flex items-center justify-between text-right relative overflow-hidden">
              <div className="absolute top-0 right-0 bottom-0 w-1.5 bg-indigo-500"></div>
              <div className="space-y-1 pr-3">
                <p className="text-xs text-theme-text-muted font-bold">إجمالي ساعات العمل للفريق</p>
                <h3 className="text-2xl font-black text-theme-text flex items-baseline gap-1">
                  <span>{data.teamSummary.totalHours}</span>
                  <span className="text-xs text-theme-text-muted font-bold">ساعة</span>
                </h3>
              </div>
              <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center shrink-0">
                <Clock className="w-6 h-6 text-indigo-400" />
              </div>
            </div>

            {/* إجمالي المهام المكتملة */}
            <div className="bg-theme-panel rounded-2xl p-5 border border-theme-border shadow-sm flex items-center justify-between text-right relative overflow-hidden">
              <div className="absolute top-0 right-0 bottom-0 w-1.5 bg-emerald-500"></div>
              <div className="space-y-1 pr-3">
                <p className="text-xs text-theme-text-muted font-bold">المهام المنجزة بالكامل</p>
                <h3 className="text-2xl font-black text-theme-text flex items-baseline gap-1">
                  <span>{data.teamSummary.completedTasksCount}</span>
                  <span className="text-xs text-theme-text-muted font-bold">مهمة</span>
                </h3>
              </div>
              <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
            </div>

            {/* متوسط تقييم الإنتاجية */}
            <div className="bg-theme-panel rounded-2xl p-5 border border-theme-border shadow-sm flex items-center justify-between text-right relative overflow-hidden">
              <div className="absolute top-0 right-0 bottom-0 w-1.5 bg-amber-500"></div>
              <div className="space-y-1 pr-3">
                <p className="text-xs text-theme-text-muted font-bold">متوسط الإنتاجية اليومية للفريق</p>
                <h3 className="text-2xl font-black text-theme-text flex items-baseline gap-1">
                  <span>{data.teamSummary.avgProductivity}</span>
                  <span className="text-xs text-theme-text-muted font-bold">/ 5</span>
                </h3>
              </div>
              <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center shrink-0">
                <Star className="w-6 h-6 text-amber-500 fill-amber-500/20" />
              </div>
            </div>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* الجزء الأيمن: إحصائياتي الشخصية */}
            <div className="lg:col-span-4 bg-theme-panel rounded-3xl p-6 border border-theme-border shadow-sm space-y-6 text-right relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-l from-theme-accent to-theme-accent/40"></div>
              
              <div>
                <h3 className="text-sm font-black text-theme-text flex items-center gap-2">
                  <Award className="w-4.5 h-4.5 text-theme-accent" />
                  <span>إحصائياتك الشخصية هذا الشهر</span>
                </h3>
                <p className="text-[10px] text-theme-text-muted mt-0.5">ملخص لنشاطك وجهدك الشخصي المسجل خلال الشهر</p>
              </div>

              {myStats ? (
                <div className="space-y-4">
                  
                  {/* ساعات عملك */}
                  <div className="bg-theme-bg/40 border border-theme-border/60 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <span className="block text-[10px] font-bold text-theme-text-muted">ساعات عملك المسجلة</span>
                      <span className="text-lg font-black text-theme-text">{myStats.totalHours} ساعة</span>
                    </div>
                    <Clock className="w-5 h-5 text-indigo-400" />
                  </div>

                  {/* مهامك المكتملة */}
                  <div className="bg-theme-bg/40 border border-theme-border/60 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <span className="block text-[10px] font-bold text-theme-text-muted">مهامك المكتملة بنجاح</span>
                      <span className="text-lg font-black text-theme-text">{myStats.completedTasksCount} مهمة</span>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  </div>

                  {/* متوسط إنتاجيتك */}
                  <div className="bg-theme-bg/40 border border-theme-border/60 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <span className="block text-[10px] font-bold text-theme-text-muted">متوسط إنتاجيتك الذاتية</span>
                      <span className="text-lg font-black text-theme-text flex items-center gap-1">
                        <span>{myStats.avgProductivity}</span>
                        <span className="text-xs text-theme-text-muted font-normal">/ 5</span>
                      </span>
                    </div>
                    <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                  </div>

                  {/* عدد أيام المشاركة */}
                  <div className="bg-theme-bg/40 border border-theme-border/60 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <span className="block text-[10px] font-bold text-theme-text-muted">أيام الحضور والتقرير اليومي</span>
                      <span className="text-lg font-black text-theme-text">{myStats.daysLogged} يوم</span>
                    </div>
                    <Calendar className="w-5 h-5 text-theme-accent" />
                  </div>

                </div>
              ) : (
                <p className="text-xs text-theme-text-muted text-center py-6">لم يتم العثور على سجلات نشاط لك في هذا الشهر.</p>
              )}
            </div>

            {/* الجزء الأيسر: قائمة تقارير ومقارنة الفريق */}
            <div className="lg:col-span-8 space-y-6 text-right">
              
              <div className="flex items-center justify-between border-b border-theme-border pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-theme-accent"></span>
                  <h2 className="text-sm font-bold text-theme-text">لوحة إنجازات الشركاء والموظفين</h2>
                </div>
              </div>

              <div className="space-y-4">
                {data.userStats.map((u) => {
                  const isExpanded = !!expandedUsers[u.userId]
                  const hasTasks = u.tasks.length > 0
                  
                  return (
                    <div 
                      key={u.userId}
                      className="bg-theme-panel border border-theme-border rounded-2xl p-5 flex flex-col gap-4 shadow-sm hover:border-theme-border/80 transition-all duration-200"
                    >
                      {/* معلومات المستخدم العلوية */}
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={u.avatarUrl}
                            alt={u.name}
                            className="w-10 h-10 rounded-xl object-cover border border-theme-border shrink-0"
                          />
                          <div>
                            <h4 className="text-xs font-black text-theme-text flex items-center gap-1">
                              <span>{u.name}</span>
                              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md ${
                                u.role === 'admin' 
                                  ? 'bg-theme-accent/10 text-theme-accent' 
                                  : 'bg-theme-bg text-theme-text-muted border border-theme-border/60'
                              }`}>
                                {u.role === 'admin' ? 'مدير' : 'شريك'}
                              </span>
                            </h4>
                            <p className="text-[10px] text-theme-text-muted">{u.email}</p>
                            <p className="text-[10px] font-bold text-theme-text-muted mt-1.5 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-theme-accent"></span>
                              <span>أيام الحضور والتقرير اليومي: {u.daysLogged} يوم</span>
                            </p>
                          </div>
                        </div>

                        {/* إحصائيات سريعة للسطر */}
                        <div className="flex flex-wrap items-center gap-4 text-center">
                          <div className="bg-theme-bg px-3 py-1.5 rounded-xl border border-theme-border">
                            <span className="block text-[8px] font-bold text-theme-text-muted">إجمالي الساعات</span>
                            <span className="text-xs font-black text-theme-text">{u.totalHours} س</span>
                          </div>
                          
                          <div className="bg-theme-bg px-3 py-1.5 rounded-xl border border-theme-border">
                            <span className="block text-[8px] font-bold text-theme-text-muted">المهام المنجزة</span>
                            <span className="text-xs font-black text-theme-text">{u.completedTasksCount}</span>
                          </div>

                          <div className="bg-theme-bg px-3 py-1.5 rounded-xl border border-theme-border flex flex-col items-center justify-center">
                            <span className="block text-[8px] font-bold text-theme-text-muted">الإنتاجية</span>
                            <span className="text-xs font-black text-theme-text flex items-center gap-0.5 justify-center">
                              <span>{u.avgProductivity}</span>
                              <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* زر استعراض قائمة المهام المكتملة لهذا المستخدم */}
                      {hasTasks && (
                        <div className="border-t border-theme-border/50 pt-3">
                          <button
                            onClick={() => toggleUserExpand(u.userId)}
                            className="w-full flex items-center justify-between text-[10px] font-black text-theme-text-muted hover:text-theme-text transition-colors cursor-pointer"
                          >
                            <span>استعراض المهام المكتملة ({u.completedTasksCount})</span>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-theme-text-muted" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-theme-text-muted" />
                            )}
                          </button>

                          {isExpanded && (
                            <div className="mt-3 bg-theme-bg/50 border border-theme-border/60 rounded-xl p-3 space-y-2 animate-modal-in">
                              <ul className="list-disc pr-4 space-y-1.5">
                                {u.tasks.map((taskTitle, idx) => (
                                  <li key={idx} className="text-xs text-theme-text font-medium leading-relaxed">
                                    {taskTitle}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

            </div>

          </div>

        </div>
      </main>

      {/* تنبيه التوست */}
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

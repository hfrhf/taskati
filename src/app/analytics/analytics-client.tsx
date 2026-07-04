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
  Award,
  ChevronDown,
  BookOpen,
  ArrowUpRight,
  ArrowDownRight,
  PieChart
} from 'lucide-react'
import { getMonthlyAnalytics } from '../actions'

interface Profile {
  id: string
  name: string
  email: string
  role: string
  avatar_url: string
}

interface GroupDist {
  name: string
  color: string
  totalMinutes: number
  totalHours: number
}

interface DailyBreakdownItem {
  date: string
  workMinutes: number
  journalMinutes: number
  tasksCount: number
  productivityScore: number
  mood: string
}

interface AnalyticsData {
  personalSummary: {
    totalJournalHours: number
    totalTaskHours: number
    completedTasksCount: number
    daysLogged: number
    avgProductivity: number
    comparison: {
      hoursDiff: number
      tasksDiff: number
      journalDiff: number
    }
  }
  groupDistribution: GroupDist[]
  dailyBreakdown: DailyBreakdownItem[]
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

const moodMap: Record<string, string> = {
  energetic: 'طاقة عالية 🚀',
  stable: 'مستقر 😊',
  tired: 'متعب 🥱',
  stressed: 'مضغوط 🤯'
}

export default function AnalyticsClient({ currentProfile, initialData, initialMonth, initialYear }: AnalyticsClientProps) {
  const [data, setData] = useState<AnalyticsData>(initialData)
  const [month, setMonth] = useState<number>(initialMonth)
  const [year, setYear] = useState<number>(initialYear)
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' | 'error' } | null>(null)
  
  // حالات المخططات البيانية التفاعلية
  const [hoveredSlice, setHoveredSlice] = useState<number | null>(null)

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

  // إعداد بيانات المخطط
  const chartData = data.groupDistribution.filter(g => g.totalHours > 0)
  const totalHoursSum = chartData.reduce((sum, item) => sum + item.totalHours, 0)

  const formatComparison = (val: number, unit: string) => {
    if (val > 0) {
      return (
        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-md font-bold flex items-center gap-0.5 mt-1 border border-emerald-500/25">
          <ArrowUpRight className="w-3 h-3" />
          <span>+{val} {unit}</span>
        </span>
      )
    } else if (val < 0) {
      return (
        <span className="text-[10px] bg-rose-500/10 text-rose-450 px-2 py-0.5 rounded-md font-bold flex items-center gap-0.5 mt-1 border border-rose-500/25">
          <ArrowDownRight className="w-3 h-3" />
          <span>{val} {unit}</span>
        </span>
      )
    }
    return (
      <span className="text-[10px] bg-theme-bg text-theme-text-muted px-2 py-0.5 rounded-md font-bold flex items-center gap-0.5 mt-1 border border-theme-border/60">
        <span>مستقر</span>
      </span>
    )
  }

  return (
    <div className="flex-grow flex flex-col min-h-screen pb-24 md:pb-8">
      <Header user={currentProfile} />

      <main className="flex-grow max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="space-y-6">
          
          {/* الترويسة والتحكم بالفلتر */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-b border-theme-border pb-5 text-right">
            <div>
              <h1 className="text-2xl font-black text-theme-text flex items-center gap-2 md:justify-start justify-center">
                <span>📈</span>
                <span>تحليل الأداء والإنتاجية الشخصية</span>
              </h1>
              <p className="text-xs text-theme-text-muted mt-1">تتبع إحصائياتك من ساعات العمل، المهام المكتملة، وتوزيع وقتك الشخصي على المشاريع</p>
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            
            {/* ساعات العمل (المهام) */}
            <div className="bg-theme-panel rounded-2xl p-4 border border-theme-border shadow-sm flex flex-col justify-between text-right relative overflow-hidden">
              <div className="absolute top-0 right-0 bottom-0 w-1 bg-indigo-500"></div>
              <div className="flex justify-between items-start">
                <p className="text-[10px] text-theme-text-muted font-bold">ساعات العمل (المهام)</p>
                <Clock className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="mt-3">
                <h3 className="text-xl font-black text-theme-text font-mono">
                  {data.personalSummary.totalTaskHours}س
                </h3>
                {formatComparison(data.personalSummary.comparison.hoursDiff, 'س')}
              </div>
            </div>

            {/* المهام المنجزة */}
            <div className="bg-theme-panel rounded-2xl p-4 border border-theme-border shadow-sm flex flex-col justify-between text-right relative overflow-hidden">
              <div className="absolute top-0 right-0 bottom-0 w-1 bg-emerald-500"></div>
              <div className="flex justify-between items-start">
                <p className="text-[10px] text-theme-text-muted font-bold">المهام المنجزة</p>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="mt-3">
                <h3 className="text-xl font-black text-theme-text font-mono">
                  {data.personalSummary.completedTasksCount}
                </h3>
                {formatComparison(data.personalSummary.comparison.tasksDiff, 'مهمة')}
              </div>
            </div>

            {/* ساعات الجرنال */}
            <div className="bg-theme-panel rounded-2xl p-4 border border-theme-border shadow-sm flex flex-col justify-between text-right relative overflow-hidden">
              <div className="absolute top-0 right-0 bottom-0 w-1 bg-purple-500"></div>
              <div className="flex justify-between items-start">
                <p className="text-[10px] text-theme-text-muted font-bold">ساعات الجرنال المسجلة</p>
                <BookOpen className="w-4 h-4 text-purple-400" />
              </div>
              <div className="mt-3">
                <h3 className="text-xl font-black text-theme-text font-mono">
                  {data.personalSummary.totalJournalHours}س
                </h3>
                {formatComparison(data.personalSummary.comparison.journalDiff, 'س')}
              </div>
            </div>

            {/* متوسط تقييم الإنتاجية */}
            <div className="bg-theme-panel rounded-2xl p-4 border border-theme-border shadow-sm flex flex-col justify-between text-right relative overflow-hidden">
              <div className="absolute top-0 right-0 bottom-0 w-1 bg-amber-500"></div>
              <div className="flex justify-between items-start">
                <p className="text-[10px] text-theme-text-muted font-bold">متوسط الإنتاجية اليومية</p>
                <Star className="w-4 h-4 text-amber-500 fill-amber-500/10" />
              </div>
              <div className="mt-3">
                <h3 className="text-xl font-black text-theme-text font-mono flex items-baseline gap-0.5">
                  <span>{data.personalSummary.avgProductivity}</span>
                  <span className="text-[10px] text-theme-text-muted font-bold">/ 5</span>
                </h3>
                <span className="text-[10px] text-theme-text-muted block mt-1 font-bold">أيام التدوين: {data.personalSummary.daysLogged} يوم</span>
              </div>
            </div>

          </div>

          {/* قسم المخططات والتحليل اليومي */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* الجزء الأيمن: مخطط توزيع الوقت الدائري */}
            <div className="lg:col-span-5 bg-theme-panel rounded-3xl p-6 border border-theme-border shadow-sm text-right flex flex-col">
              <div>
                <h3 className="text-sm font-black text-theme-text flex items-center gap-2">
                  <PieChart className="w-4.5 h-4.5 text-theme-accent" />
                  <span>توزيع الوقت على مجموعات المشاريع</span>
                </h3>
                <p className="text-[10px] text-theme-text-muted mt-0.5">تحليل الساعات المخصصة لكل مجموعة عمل هذا الشهر</p>
              </div>

              <div className="mt-8 flex flex-col items-center justify-center gap-6">
                {/* الدائرة البيانية */}
                <div className="relative w-40 h-40 shrink-0">
                  {totalHoursSum > 0 ? (
                    <svg viewBox="0 0 140 140" className="w-full h-full transform -rotate-90">
                      <circle cx="70" cy="70" r="50" fill="transparent" stroke="var(--theme-border)" strokeWidth="0.5" className="opacity-20" />
                      
                      {(() => {
                        let cumulativePercent = 0
                        return chartData.map((item, idx) => {
                          const pct = item.totalHours / totalHoursSum
                          const strokeDashoffset = 314.16 - (pct * 314.16)
                          const rotation = (cumulativePercent * 360)
                          cumulativePercent += pct

                          const isHovered = hoveredSlice === idx

                          return (
                            <circle
                              key={item.name}
                              cx="70"
                              cy="70"
                              r="50"
                              fill="transparent"
                              stroke={item.color === 'pastel-purple' ? '#a855f7' : item.color === 'pastel-blue' ? '#0ea5e9' : item.color === 'pastel-green' ? '#10b981' : item.color === 'pastel-red' ? '#f43f5e' : item.color === 'pastel-amber' ? '#f59e0b' : 'var(--theme-accent)'}
                              strokeWidth={isHovered ? 14 : 10}
                              strokeDasharray="314.16"
                              strokeDashoffset={strokeDashoffset}
                              transform={`rotate(${rotation - 90} 70 70)`}
                              style={{
                                transition: 'stroke-width 0.2s ease, stroke-dashoffset 0.5s ease',
                                cursor: 'pointer',
                              }}
                              onMouseEnter={() => setHoveredSlice(idx)}
                              onMouseLeave={() => setHoveredSlice(null)}
                            />
                          )
                        })
                      })()}
                      
                      <g transform="rotate(90 70 70)" className="text-center select-none pointer-events-none">
                        {hoveredSlice !== null && chartData[hoveredSlice] ? (
                          <>
                            <text x="70" y="64" textAnchor="middle" className="fill-theme-text text-[8px] font-black">
                              {chartData[hoveredSlice].name}
                            </text>
                            <text x="70" y="78" textAnchor="middle" className="fill-theme-text text-[11px] font-black font-mono">
                              {chartData[hoveredSlice].totalHours} س
                            </text>
                            <text x="70" y="90" textAnchor="middle" className="fill-theme-text-muted text-[7px] font-bold">
                              {((chartData[hoveredSlice].totalHours / totalHoursSum) * 100).toFixed(0)}%
                            </text>
                          </>
                        ) : (
                          <>
                            <text x="70" y="64" textAnchor="middle" className="fill-theme-text-muted text-[8px] font-bold">
                              المجموع
                            </text>
                            <text x="70" y="78" textAnchor="middle" className="fill-theme-text text-[13px] font-black font-mono">
                              {totalHoursSum}س
                            </text>
                            <text x="70" y="90" textAnchor="middle" className="fill-theme-text-muted text-[7px] font-bold">
                              {chartData.length} مجموعة
                            </text>
                          </>
                        )}
                      </g>
                    </svg>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center border-2 border-dashed border-theme-border rounded-full text-[10px] text-theme-text-muted font-bold text-center p-4 leading-normal">
                      لا توجد ساعات عمل مسجلة
                    </div>
                  )}
                </div>

                {/* وسيلة الإيضاح */}
                <div className="w-full space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                  {chartData.map((item, idx) => {
                    const pct = totalHoursSum > 0 ? (item.totalHours / totalHoursSum) * 100 : 0
                    const isHovered = hoveredSlice === idx

                    return (
                      <div
                        key={item.name}
                        className={`flex items-center justify-between text-[11px] p-2 rounded-xl border transition-all duration-150 ${
                          isHovered 
                            ? 'bg-theme-bg border-theme-accent/30 scale-[1.01]' 
                            : 'bg-transparent border-transparent'
                        }`}
                        onMouseEnter={() => setHoveredSlice(idx)}
                        onMouseLeave={() => setHoveredSlice(null)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color === 'pastel-purple' ? '#a855f7' : item.color === 'pastel-blue' ? '#0ea5e9' : item.color === 'pastel-green' ? '#10b981' : item.color === 'pastel-red' ? '#f43f5e' : item.color === 'pastel-amber' ? '#f59e0b' : 'var(--theme-accent)' }}></span>
                          <span className="font-bold text-theme-text">{item.name}</span>
                        </div>
                        <span className="font-black text-theme-text font-mono text-xs">
                          {item.totalHours}س <span className="text-[9px] font-normal text-theme-text-muted">({pct.toFixed(0)}%)</span>
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* الجزء الأيسر: النشاط اليومي التفصيلي */}
            <div className="lg:col-span-7 space-y-4 text-right">
              <div className="flex items-center gap-1.5 border-b border-theme-border pb-3">
                <span className="w-2.5 h-2.5 rounded-full bg-theme-accent"></span>
                <h2 className="text-sm font-black text-theme-text">سجل النشاط اليومي التفصيلي</h2>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {data.dailyBreakdown.length === 0 ? (
                  <p className="text-xs text-theme-text-muted text-center py-10 bg-theme-panel rounded-2xl border border-dashed border-theme-border">
                    لا توجد بيانات مسجلة لهذا الشهر.
                  </p>
                ) : (
                  data.dailyBreakdown.map((item) => {
                    const totalMins = item.workMinutes + item.journalMinutes
                    const hasLogged = totalMins > 0 || item.tasksCount > 0 || item.productivityScore > 0

                    return (
                      <div 
                        key={item.date}
                        className={`bg-theme-panel border rounded-2xl p-4 flex items-center justify-between gap-4 shadow-xs transition-colors ${
                          hasLogged ? 'border-theme-border hover:border-theme-border/80' : 'border-theme-border/40 opacity-55'
                        }`}
                      >
                        {/* التاريخ والحالة المزاجية */}
                        <div className="space-y-1">
                          <span className="text-[11px] font-black text-theme-text font-mono">{item.date}</span>
                          {item.mood && (
                            <span className="block text-[9px] font-bold text-indigo-400 bg-indigo-500/5 px-2 py-0.5 rounded-md border border-indigo-500/10 w-fit">
                              {moodMap[item.mood] || item.mood}
                            </span>
                          )}
                        </div>

                        {/* مؤشرات اليوم */}
                        <div className="flex items-center gap-3 sm:gap-6">
                          {/* الساعات المنجزة */}
                          {totalMins > 0 ? (
                            <div className="text-center">
                              <span className="block text-[8px] font-bold text-theme-text-muted">الوقت الإجمالي</span>
                              <span className="text-xs font-black text-theme-text font-mono">
                                {Math.round((totalMins / 60) * 10) / 10}س
                              </span>
                            </div>
                          ) : null}

                          {/* المهام المكتملة */}
                          {item.tasksCount > 0 ? (
                            <div className="text-center">
                              <span className="block text-[8px] font-bold text-theme-text-muted">المهام المنجزة</span>
                              <span className="text-xs font-black text-emerald-400 font-mono">
                                {item.tasksCount} مهمة
                              </span>
                            </div>
                          ) : null}

                          {/* الإنتاجية */}
                          {item.productivityScore > 0 ? (
                            <div className="flex flex-col items-center">
                              <span className="block text-[8px] font-bold text-theme-text-muted">تقييم اليوم</span>
                              <div className="flex items-center gap-0.5 text-amber-500">
                                <span className="text-xs font-black font-mono">{item.productivityScore}</span>
                                <Star className="w-3.5 h-3.5 fill-amber-500" />
                              </div>
                            </div>
                          ) : (
                            !hasLogged && (
                              <span className="text-[10px] text-theme-text-muted font-bold">لا يوجد نشاط</span>
                            )
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

          </div>

        </div>
      </main>

      {/* توست التنبيهات */}
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

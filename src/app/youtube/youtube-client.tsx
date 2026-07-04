'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import Toast from '@/components/Toast'
import { 
  Play, 
  Plus, 
  Film, 
  Clock, 
  CheckCircle, 
  Loader2, 
  X, 
  BarChart2, 
  Eye, 
  BookOpen, 
  Layers
} from 'lucide-react'
import { createYoutubeVideo } from '../actions'

interface Profile {
  id: string
  name: string
  email: string
  role: string
  avatar_url: string
}

interface YoutubeVideo {
  id: string
  title: string
  description: string
  thumbnail_url: string
  status: 'planning' | 'in_progress' | 'completed' | 'published'
  target_hours: number
  created_at: string
  total_hours?: number
  progress?: number
  total_tasks?: number
  completed_tasks?: number
}

interface Analytics {
  totalVideos: number
  completedVideosCount: number
  totalHours: number
  avgHoursPerVideo: number
  phaseAverages: {
    scripting: number
    recording: number
    editing: number
    publishing: number
  }
  mostTimeConsumingPhase: string
  videoStats: any[]
}

interface YoutubeClientProps {
  currentProfile: Profile
  initialVideos: YoutubeVideo[]
  analytics: Analytics
}

const statusMap = {
  planning: { label: 'تخطيط وتحضير 📝', color: 'bg-neutral-500/10 text-theme-text-muted border-theme-border' },
  in_progress: { label: 'قيد الإنتاج 🎬', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  completed: { label: 'جاهز ومكتمل ✅', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
  published: { label: 'نُشر بالقناة 🚀', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' }
}

export default function YoutubeClient({ currentProfile, initialVideos = [], analytics }: YoutubeClientProps) {
  const [videos, setVideos] = useState<YoutubeVideo[]>(initialVideos)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' | 'error' } | null>(null)

  // نموذج الفيديو الجديد
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newThumbnail, setNewThumbnail] = useState('')
  const [newTargetHours, setNewTargetHours] = useState(20)

  const showToast = (message: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setToast({ message, type })
  }

  const handleCreateVideoSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) {
      showToast('عنوان الفيديو مطلوب', 'warning')
      return
    }

    startTransition(async () => {
      try {
        const created = await createYoutubeVideo(
          newTitle.trim(),
          newDescription.trim(),
          newThumbnail.trim(),
          newTargetHours
        )
        showToast('تمت إضافة الفيديو الجديد بنجاح! 🎬', 'success')
        
        // تحديث القائمة محلياً
        setVideos([created, ...videos])
        
        // تفريغ المدخلات وإغلاق المودال
        setNewTitle('')
        setNewDescription('')
        setNewThumbnail('')
        setNewTargetHours(20)
        setIsCreateModalOpen(false)
      } catch (err: any) {
        showToast('فشل إنشاء الفيديو: ' + err.message, 'error')
      }
    })
  }

  return (
    <div className="flex-grow flex flex-col min-h-screen pb-24 md:pb-8">
      <Header user={currentProfile} />

      <main className="flex-grow max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="space-y-8">
          
          {/* ترويسة الصفحة */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-b border-theme-border pb-5 text-right">
            <div>
              <h1 className="text-2xl font-black text-theme-text flex items-center gap-2 justify-center md:justify-start">
                <span>🎬</span>
                <span>استوديو بارون | Baron Studio</span>
              </h1>
              <p className="text-xs text-theme-text-muted mt-1">تتبع ساعات إنتاج كل فيديو ومقارنة الأداء لتقليل وقت الصنع وجودة أعلى</p>
            </div>
            
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-5 py-3 bg-theme-accent hover:bg-theme-accent-hover text-theme-panel font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer self-stretch md:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة فيديو جديد</span>
            </button>
          </div>

          {/* لوحة المؤشرات العلوية */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* إجمالي الفيديوهات */}
            <div className="bg-theme-panel rounded-2xl p-4 border border-theme-border shadow-sm flex items-center justify-between text-right relative overflow-hidden">
              <div className="absolute top-0 right-0 bottom-0 w-1 bg-rose-500"></div>
              <div className="space-y-0.5 pr-2">
                <p className="text-[10px] text-theme-text-muted font-bold">إجمالي الفيديوهات</p>
                <h3 className="text-xl font-black text-theme-text font-mono">
                  {analytics.totalVideos}
                </h3>
              </div>
              <Film className="w-5 h-5 text-rose-500 shrink-0" />
            </div>

            {/* إجمالي الساعات */}
            <div className="bg-theme-panel rounded-2xl p-4 border border-theme-border shadow-sm flex items-center justify-between text-right relative overflow-hidden">
              <div className="absolute top-0 right-0 bottom-0 w-1 bg-indigo-500"></div>
              <div className="space-y-0.5 pr-2">
                <p className="text-[10px] text-theme-text-muted font-bold">إجمالي ساعات الصنع</p>
                <h3 className="text-xl font-black text-theme-text font-mono">
                  {analytics.totalHours}س
                </h3>
              </div>
              <Clock className="w-5 h-5 text-indigo-400 shrink-0" />
            </div>

            {/* متوسط ساعات الفيديو */}
            <div className="bg-theme-panel rounded-2xl p-4 border border-theme-border shadow-sm flex items-center justify-between text-right relative overflow-hidden">
              <div className="absolute top-0 right-0 bottom-0 w-1 bg-emerald-500"></div>
              <div className="space-y-0.5 pr-2">
                <p className="text-[10px] text-theme-text-muted font-bold">متوسط الساعات / فيديو</p>
                <h3 className="text-xl font-black text-theme-text font-mono">
                  {analytics.avgHoursPerVideo}س
                </h3>
              </div>
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            </div>

            {/* أطول مرحلة وقتاً */}
            <div className="bg-theme-panel rounded-2xl p-4 border border-theme-border shadow-sm flex items-center justify-between text-right relative overflow-hidden">
              <div className="absolute top-0 right-0 bottom-0 w-1 bg-amber-500"></div>
              <div className="space-y-0.5 pr-2 min-w-0">
                <p className="text-[10px] text-theme-text-muted font-bold">المرحلة الأكثر استهلاكاً للوقت</p>
                <h3 className="text-xs font-black text-theme-text truncate">
                  {analytics.mostTimeConsumingPhase}
                </h3>
              </div>
              <BarChart2 className="w-5 h-5 text-amber-500 shrink-0" />
            </div>
          </div>

          {/* لوحة توزيع أوقات المراحل الأربعة لمرحلة الإنتاج */}
          <div className="bg-theme-panel rounded-3xl p-6 border border-theme-border shadow-sm text-right space-y-4">
            <div>
              <h3 className="text-sm font-black text-theme-text flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-theme-accent" />
                <span>متوسط الساعات لكل مرحلة إنتاج (الفيديوهات المنجزة)</span>
              </h3>
              <p className="text-[10px] text-theme-text-muted mt-0.5">تحليل وتوزيع الساعات على الخطوات الأربع لتسهيل خفض الساعات الكلية للفيديو</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2">
              {/* كتابة السيناريو */}
              <div className="bg-theme-bg/40 border border-theme-border/60 rounded-xl p-3.5 space-y-1">
                <span className="text-[10px] font-bold text-theme-text-muted">✍️ السيناريو والكتابة</span>
                <h4 className="text-lg font-black text-theme-text font-mono">{analytics.phaseAverages.scripting}س</h4>
              </div>

              {/* التسجيل والتصوير */}
              <div className="bg-theme-bg/40 border border-theme-border/60 rounded-xl p-3.5 space-y-1">
                <span className="text-[10px] font-bold text-theme-text-muted">🎙️ التصوير والتسجيل</span>
                <h4 className="text-lg font-black text-theme-text font-mono">{analytics.phaseAverages.recording}س</h4>
              </div>

              {/* المونتاج والتحريك */}
              <div className="bg-theme-bg/40 border border-theme-border/60 rounded-xl p-3.5 space-y-1">
                <span className="text-[10px] font-bold text-theme-text-muted">🎬 المونتاج والتحريك</span>
                <h4 className="text-lg font-black text-theme-text font-mono">{analytics.phaseAverages.editing}س</h4>
              </div>

              {/* النشر والترويج */}
              <div className="bg-theme-bg/40 border border-theme-border/60 rounded-xl p-3.5 space-y-1">
                <span className="text-[10px] font-bold text-theme-text-muted">🎨 الغلاف والنشر</span>
                <h4 className="text-lg font-black text-theme-text font-mono">{analytics.phaseAverages.publishing}س</h4>
              </div>
            </div>
          </div>

          {/* شبكة الفيديوهات */}
          <div className="space-y-4">
            <h2 className="text-sm font-black text-theme-text text-right flex items-center gap-1.5">
              <span>📋</span>
              <span>قائمة فيديوهات القناة ({videos.length})</span>
            </h2>

            {videos.length === 0 ? (
              <div className="bg-theme-panel border border-dashed border-theme-border rounded-3xl p-16 text-center">
                <Film className="w-12 h-12 text-theme-text-muted opacity-50 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-theme-text">لا توجد فيديوهات مسجلة حالياً</h3>
                <p className="text-xs text-theme-text-muted mt-1 max-w-xs mx-auto">
                  ابدأ بإنشاء فيديو جديد لمراقبة الساعات المخصصة لإنتاجه بدقة وتقليل وقت الصنع.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {videos.map((video) => {
                  // جلب إحصائيات الفيديو من محلي أو حساب الساعات
                  const target = video.target_hours || 20
                  
                  // العثور على الإحصائيات الفعالة للفيديو من مصفوفة التحليل
                  const stat = analytics.videoStats?.find(s => s.title === video.title)
                  const actualHours = stat ? stat.hours : 0
                  
                  // نسبة تجاوز الساعات
                  const overLimit = actualHours > target

                  return (
                    <Link
                      key={video.id}
                      href={`/youtube/${video.id}`}
                      className="bg-theme-panel border border-theme-border hover:border-theme-accent/30 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 text-right flex flex-col group"
                    >
                      {/* غلاف الفيديو */}
                      <div className="h-40 bg-theme-bg relative overflow-hidden shrink-0">
                        <img 
                          src={video.thumbnail_url} 
                          alt={video.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?q=80&w=300&auto=format&fit=crop'
                          }}
                        />
                        <div className="absolute top-3 right-3">
                          <span className={`text-[9px] font-bold px-2 py-1 rounded-lg border shadow-sm ${statusMap[video.status]?.color} backdrop-blur-xs`}>
                            {statusMap[video.status]?.label}
                          </span>
                        </div>
                      </div>

                      {/* محتوى الكارت */}
                      <div className="p-4 flex-grow flex flex-col justify-between space-y-4">
                        <div>
                          <h4 className="text-xs font-black text-theme-text line-clamp-1 leading-relaxed">
                            {video.title}
                          </h4>
                          <p className="text-[10px] text-theme-text-muted mt-1 line-clamp-2 leading-relaxed">
                            {video.description || 'لا يوجد وصف تفصيلي...'}
                          </p>
                        </div>

                        {/* إحصائيات الساعات والبار */}
                        <div className="space-y-2 border-t border-theme-border/60 pt-3">
                          <div className="flex items-center justify-between text-[10px] font-bold">
                            <span className="text-theme-text-muted">الساعات المستغرق:</span>
                            <span className={`font-mono font-black ${overLimit ? 'text-rose-500' : 'text-indigo-400'}`}>
                              {actualHours} / {target}ساعة
                            </span>
                          </div>

                          {/* شريط الساعات مقارنة بالهدف */}
                          <div className="h-1.5 w-full bg-theme-bg rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                overLimit ? 'bg-rose-500' : 'bg-indigo-500'
                              }`} 
                              style={{ width: `${Math.min(100, (actualHours / target) * 100)}%` }}
                            />
                          </div>

                          {overLimit && (
                            <span className="text-[8px] text-rose-500 font-bold block mt-1">
                              ⚠️ تجاوزت عدد الساعات المستهدفة بـ {(actualHours - target).toFixed(1)}س
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

        </div>
      </main>

      {/* ================== مودال إضافة فيديو جديد ================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setIsCreateModalOpen(false)}></div>
          
          <div className="relative bg-theme-panel w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl border border-theme-border animate-modal-in z-10 text-right space-y-5">
            <div className="flex items-start justify-between gap-4 border-b border-theme-border pb-4">
              <div>
                <h3 className="text-base font-black text-theme-text flex items-center gap-2">
                  <Film className="w-5 h-5 text-theme-accent" />
                  <span>إضافة فيديو جديد للقناة</span>
                </h3>
                <p className="text-[10px] text-theme-text-muted mt-0.5">أدخل تفاصيل الفيديو الذي تخطط لصناعته</p>
              </div>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-theme-text-muted hover:text-theme-text rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateVideoSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-theme-text-muted mb-1.5">عنوان الفيديو</label>
                <input 
                  type="text" 
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                  placeholder="أدخل عنواناً جذاباً للفيديو..."
                  className="w-full bg-theme-input border border-theme-border focus:border-theme-accent focus:bg-theme-panel text-theme-text rounded-xl px-4 py-3 text-xs transition-all outline-none" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-theme-text-muted mb-1.5">وصف ومحتوى الفيديو</label>
                <textarea 
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={3}
                  placeholder="الأفكار الأساسية للسيناريو والنقاط التي سنتحدث عنها..."
                  className="w-full bg-theme-input border border-theme-border focus:border-theme-accent focus:bg-theme-panel text-theme-text rounded-xl px-4 py-3 text-xs transition-all outline-none resize-none leading-relaxed" 
                ></textarea>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-theme-text-muted mb-1.5">ساعات العمل المستهدفة</label>
                  <input 
                    type="number" 
                    value={newTargetHours}
                    onChange={(e) => setNewTargetHours(Math.max(1, parseInt(e.target.value) || 20))}
                    required
                    min="1"
                    className="w-full bg-theme-input border border-theme-border focus:border-theme-accent focus:bg-theme-panel text-theme-text rounded-xl px-4 py-3 text-xs transition-all outline-none font-bold" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-theme-text-muted mb-1.5">رابط غلاف الفيديو (Thumbnail)</label>
                  <input 
                    type="url" 
                    value={newThumbnail}
                    onChange={(e) => setNewThumbnail(e.target.value)}
                    placeholder="رابط الصورة أو اتركها فارغة"
                    className="w-full bg-theme-input border border-theme-border focus:border-theme-accent focus:bg-theme-panel text-theme-text rounded-xl px-4 py-3 text-xs transition-all outline-none font-mono" 
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full bg-theme-accent hover:bg-theme-accent-hover disabled:bg-neutral-300 text-theme-panel font-bold py-3.5 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري إضافة الفيديو...</span>
                    </>
                  ) : (
                    <span>تأكيد وإضافة الفيديو</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

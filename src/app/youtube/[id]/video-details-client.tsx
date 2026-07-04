'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import Toast from '@/components/Toast'
import { 
  ArrowRight, 
  Clock, 
  CheckCircle2, 
  Edit, 
  Trash2, 
  X, 
  Loader2, 
  ListTodo,
  ExternalLink,
  Layers,
  FileText,
  Plus,
  Check,
  Play,
  Square,
  Settings
} from 'lucide-react'
import { updateYoutubeVideo, deleteYoutubeVideo, updateYoutubeVideoSteps } from '../../actions'

interface Profile {
  id: string
  name: string
  email: string
  role: string
  avatar_url: string
}

interface Video {
  id: string
  title: string
  description: string
  thumbnail_url: string
  status: 'planning' | 'in_progress' | 'completed' | 'published'
  target_hours: number
  created_at: string
  completed_at: string | null
  totalHours: number
  totalTasks: number
  completedTasks: number
  progress: number
  steps?: Array<{
    id: string
    title: string
    completed: boolean
    work_minutes: number
    phase: string
  }>
}

interface PhaseDetail {
  name: string
  minutes: number
  hours: number
  tasksCount: number
  completedCount: number
}

interface PhaseBreakdown {
  scripting: PhaseDetail
  recording: PhaseDetail
  editing: PhaseDetail
  publishing: PhaseDetail
  other: PhaseDetail
}

interface VideoTask {
  id: string
  title: string
  status: string
  work_minutes: number
  video_phase: string
  group?: {
    id: string
    name: string
    color: string
  } | null
}

interface VideoDetailsClientProps {
  currentProfile: Profile
  video: Video
  phases: PhaseBreakdown
  initialTasks: VideoTask[]
}

const statusMap = {
  planning: { label: 'تخطيط وتحضير 📝', color: 'bg-neutral-500/10 text-theme-text-muted border-theme-border' },
  in_progress: { label: 'قيد الإنتاج 🎬', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  completed: { label: 'جاهز ومكتمل ✅', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
  published: { label: 'نُشر بالقناة 🚀', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' }
}

const taskStatusMap: Record<string, string> = {
  'not_started': 'لم تبدأ بعد',
  'in_progress': 'قيد التنفيذ',
  'completed': 'مكتمل',
  'late': 'متأخر'
}

export default function VideoDetailsClient({ currentProfile, video: initialVideo, phases, initialTasks = [] }: VideoDetailsClientProps) {
  const router = useRouter()
  const [video, setVideo] = useState<Video>(initialVideo)
  const [tasks] = useState<VideoTask[]>(initialTasks)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' | 'error' } | null>(null)

  // نموذج التعديل
  const [editTitle, setEditTitle] = useState(video.title)
  const [editDescription, setEditDescription] = useState(video.description || '')
  const [editThumbnail, setEditThumbnail] = useState(video.thumbnail_url || '')
  const [editTargetHours, setEditTargetHours] = useState(video.target_hours)
  const [editStatus, setEditStatus] = useState<Video['status']>(video.status)

  // ================== حالات وإجراءات خطوات الإنتاج المرنة ==================
  const [steps, setSteps] = useState<any[]>(video.steps || [])
  const [isTimeModalOpen, setIsTimeModalOpen] = useState(false)
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null)
  const [logHours, setLogHours] = useState(0)
  const [logMinutes, setLogMinutes] = useState(0)

  // إضافة خطوة جديدة
  const [newStepName, setNewStepName] = useState('')
  const [newStepPhase, setNewStepPhase] = useState<'scripting' | 'recording' | 'editing' | 'publishing' | 'other'>('editing')

  // تعديل اسم خطوة
  const [editingStepId, setEditingStepId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')

  const showToast = (message: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setToast({ message, type })
  }

  // دالة حفظ وتحديث الخطوات مع تحديث إحصائيات الفيديو محلياً
  const saveSteps = (updatedSteps: any[]) => {
    setSteps(updatedSteps)
    
    // إعادة حساب تفاصيل الفيديو
    const totalTasks = updatedSteps.length
    const completedTasks = updatedSteps.filter(s => s.completed).length
    const totalMinutes = updatedSteps.reduce((sum, s) => sum + (s.work_minutes || 0), 0)
    const totalHours = Math.round((totalMinutes / 60) * 10) / 10
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    setVideo(prev => ({
      ...prev,
      totalHours,
      totalTasks,
      completedTasks,
      progress,
      steps: updatedSteps
    }))

    startTransition(async () => {
      try {
        await updateYoutubeVideoSteps(video.id, updatedSteps)
      } catch (err: any) {
        showToast('فشل حفظ الخطوات: ' + err.message, 'error')
      }
    })
  }

  const handleToggleStep = (stepId: string) => {
    const updated = steps.map(s => s.id === stepId ? { ...s, completed: !s.completed } : s)
    saveSteps(updated)
  }

  const openTimeModal = (stepId: string) => {
    setSelectedStepId(stepId)
    setLogHours(0)
    setLogMinutes(0)
    setIsTimeModalOpen(true)
  }

  const handleLogTimeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStepId) return

    const addedMinutes = (logHours * 60) + logMinutes
    const updated = steps.map(s => {
      if (s.id === selectedStepId) {
        const current = s.work_minutes || 0
        return { ...s, work_minutes: Math.max(0, current + addedMinutes) }
      }
      return s
    })

    saveSteps(updated)
    setIsTimeModalOpen(false)
    setSelectedStepId(null)
    showToast('تم تسجيل وقت العمل بنجاح ⏱️', 'success')
  }

  const handleDeleteStep = (stepId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الخطوة من الفيديو؟')) return
    const updated = steps.filter(s => s.id !== stepId)
    saveSteps(updated)
  }

  const handleAddStep = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newStepName.trim()) return

    const newStep = {
      id: Date.now().toString(),
      title: newStepName.trim(),
      completed: false,
      work_minutes: 0,
      phase: newStepPhase
    }

    saveSteps([...steps, newStep])
    setNewStepName('')
    showToast('تمت إضافة خطوة جديدة للفيديو ➕', 'success')
  }

  const startEditingStep = (stepId: string, currentTitle: string) => {
    setEditingStepId(stepId)
    setEditingTitle(currentTitle)
  }

  const handleRenameSubmit = (stepId: string) => {
    if (!editingTitle.trim()) return
    const updated = steps.map(s => s.id === stepId ? { ...s, title: editingTitle.trim() } : s)
    saveSteps(updated)
    setEditingStepId(null)
  }

  // =========================================================================

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editTitle.trim()) {
      showToast('عنوان الفيديو مطلوب', 'warning')
      return
    }

    startTransition(async () => {
      try {
        const updated = await updateYoutubeVideo(
          video.id,
          editTitle.trim(),
          editDescription.trim(),
          editThumbnail.trim(),
          editStatus,
          editTargetHours
        )
        showToast('تم تحديث بيانات الفيديو بنجاح', 'success')
        setVideo({
          ...video,
          title: updated.title,
          description: updated.description,
          thumbnail_url: updated.thumbnail_url,
          status: updated.status,
          target_hours: updated.target_hours,
          completed_at: updated.completed_at
        })
        setIsEditModalOpen(false)
      } catch (err: any) {
        showToast('فشل تعديل البيانات: ' + err.message, 'error')
      }
    })
  }

  const handleDelete = () => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الفيديو نهائياً؟ سيتم إلغاء ربطه بكافة المهام المرتبطة به.')) {
      return
    }

    startTransition(async () => {
      try {
        await deleteYoutubeVideo(video.id)
        showToast('تم حذف الفيديو بنجاح', 'success')
        router.push('/youtube')
      } catch (err: any) {
        showToast('فشل حذف الفيديو: ' + err.message, 'error')
      }
    })
  }

  const overLimit = video.totalHours > video.target_hours

  return (
    <div className="flex-grow flex flex-col min-h-screen pb-24 md:pb-8">
      <Header user={currentProfile} />

      <main className="flex-grow max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="space-y-6 animate-modal-in">
          
          {/* Breadcrumb والرجوع */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-theme-border pb-5">
            <div className="flex items-center gap-3 text-right w-full md:w-auto">
              <Link 
                href="/youtube"
                className="p-2.5 bg-theme-panel hover:bg-theme-bg text-theme-text rounded-xl border border-theme-border transition-all flex items-center justify-center shadow-sm cursor-pointer shrink-0"
                title="الرجوع للأستوديو"
              >
                <ArrowRight className="w-4 h-4" />
              </Link>
              <div>
                <div className="flex items-center gap-1.5 text-[10px] text-theme-text-muted font-bold mb-1">
                  <span>الأستوديو</span>
                  <span>/</span>
                  <span>تفاصيل الفيديو</span>
                </div>
                <h1 className="text-xl font-bold text-theme-text">تفاصيل الفيديو ومراقبة الأداء</h1>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <button 
                onClick={() => setIsEditModalOpen(true)}
                className="flex-1 md:flex-initial bg-theme-panel hover:bg-theme-bg border border-theme-border text-theme-text text-xs font-bold px-4 py-3 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5 text-theme-accent" />
                <span>تعديل الفيديو</span>
              </button>

              <button 
                onClick={handleDelete}
                className="flex-1 md:flex-initial bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 text-xs font-bold px-4 py-3 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>حذف</span>
              </button>
            </div>
          </div>

          {/* الكرت الرئيسي لتفاصيل الفيديو */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-theme-panel border border-theme-border rounded-3xl p-6 sm:p-8 shadow-sm text-right">
            
            {/* غلاف الفيديو */}
            <div className="md:col-span-4 h-48 sm:h-full min-h-[180px] bg-theme-bg rounded-2xl overflow-hidden border border-theme-border relative">
              <img 
                src={video.thumbnail_url} 
                alt={video.title} 
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?q=80&w=300&auto=format&fit=crop'
                }}
              />
              <div className="absolute top-3 right-3">
                <span className={`text-[9px] font-bold px-2.5 py-1 rounded-lg border shadow-sm ${statusMap[video.status]?.color} backdrop-blur-xs`}>
                  {statusMap[video.status]?.label}
                </span>
              </div>
            </div>

            {/* تفاصيل النصوص والعدادات */}
            <div className="md:col-span-8 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <h2 className="text-lg font-black text-theme-text leading-relaxed">{video.title}</h2>
                <p className="text-xs text-theme-text-muted leading-relaxed whitespace-pre-line bg-theme-bg/30 border border-theme-border/60 rounded-xl p-4 min-h-[80px]">
                  {video.description || 'لا يوجد تفاصيل إضافية مكتوبة لهذا الفيديو.'}
                </p>
              </div>

              {/* شريط التقدم وساعات الصنع */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-theme-border/60 pt-4">
                
                {/* الساعات المستغرقة */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-theme-text-muted flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      <span>وقت الصنع الإجمالي:</span>
                    </span>
                    <span className={`font-mono font-black ${overLimit ? 'text-rose-500' : 'text-indigo-400'}`}>
                      {video.totalHours} / {video.target_hours} ساعة
                    </span>
                  </div>
                  <div className="h-2 w-full bg-theme-bg rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        overLimit ? 'bg-rose-500' : 'bg-indigo-500'
                      }`} 
                      style={{ width: `${Math.min(100, (video.totalHours / video.target_hours) * 100)}%` }}
                    />
                  </div>
                  {overLimit && (
                    <span className="text-[9px] text-rose-500 font-bold block">
                      ⚠️ تجاوزت الوقت المستهدف بـ {(video.totalHours - video.target_hours).toFixed(1)} ساعة.
                    </span>
                  )}
                </div>

                {/* تقدم إنجاز المهام */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-theme-text-muted flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>تقدم إنجاز مهام الفيديو:</span>
                    </span>
                    <span className="font-mono font-black text-emerald-400">
                      {video.completedTasks} / {video.totalTasks} مهمة ({video.progress}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-theme-bg rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                      style={{ width: `${video.progress}%` }}
                    />
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* ================== لوحة خطوات ومراحل الإنتاج المرنة والسريعة ================== */}
          <div className="bg-theme-panel border border-theme-border rounded-3xl p-6 sm:p-8 shadow-sm text-right space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-theme-border/60 pb-4">
              <div>
                <h3 className="text-sm font-black text-theme-text flex items-center gap-2">
                  <ListTodo className="w-5 h-5 text-theme-accent" />
                  <span>خطوات ومراحل إنتاج الفيديو ({steps.length})</span>
                </h3>
                <p className="text-[10px] text-theme-text-muted mt-1">تتبع خطوات إنتاج الفيديو، وسجل أوقات العمل في كل مرحلة بمرونة كاملة.</p>
              </div>

              {/* إضافة خطوة سريعة */}
              <form onSubmit={handleAddStep} className="flex items-center gap-2 w-full sm:w-auto">
                <input 
                  type="text"
                  value={newStepName}
                  onChange={(e) => setNewStepName(e.target.value)}
                  placeholder="إضافة خطوة مخصصة..."
                  required
                  className="bg-theme-input border border-theme-border focus:border-theme-accent focus:bg-theme-panel text-theme-text rounded-xl px-3 py-2 text-xs transition-all outline-none flex-grow sm:flex-initial"
                />
                <select
                  value={newStepPhase}
                  onChange={(e: any) => setNewStepPhase(e.target.value)}
                  className="bg-theme-input border border-theme-border focus:border-theme-accent focus:bg-theme-panel text-theme-text rounded-xl px-3 py-2 text-[10px] transition-all outline-none font-bold cursor-pointer"
                >
                  <option value="scripting">✍️ سيناريو</option>
                  <option value="recording">🎙️ تسجيل</option>
                  <option value="editing">🎬 مونتاج</option>
                  <option value="publishing">🎨 نشر</option>
                  <option value="other">⚙️ أخرى</option>
                </select>
                <button
                  type="submit"
                  className="p-2 bg-theme-accent hover:opacity-90 text-theme-panel rounded-xl transition-all flex items-center justify-center cursor-pointer shadow-sm active:scale-95 shrink-0"
                  title="إضافة خطوة"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </form>
            </div>

            {steps.length === 0 ? (
              <div className="text-center py-6 text-theme-text-muted text-xs">
                لا توجد خطوات حالياً. استخدم النموذج أعلاه لإضافة خطوات العمل الخاصة بك.
              </div>
            ) : (
              <div className="space-y-2.5">
                {steps.map((step) => {
                  const phaseLabels: Record<string, { label: string, color: string }> = {
                    scripting: { label: '✍️ سيناريو', color: 'bg-purple-500/15 text-purple-400 border-purple-500/20' },
                    recording: { label: '🎙️ تسجيل', color: 'bg-sky-500/15 text-sky-400 border-sky-500/20' },
                    editing: { label: '🎬 مونتاج', color: 'bg-rose-500/15 text-rose-400 border-rose-500/20' },
                    publishing: { label: '🎨 غلاف ونشر', color: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
                    other: { label: '⚙️ أخرى', color: 'bg-neutral-600/15 text-neutral-400 border-neutral-600/20' }
                  }
                  const badge = phaseLabels[step.phase || 'other'] || phaseLabels.other

                  return (
                    <div 
                      key={step.id}
                      className={`group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border transition-all duration-200 ${
                        step.completed 
                          ? 'bg-theme-bg/30 border-theme-border/40 opacity-70' 
                          : 'bg-theme-bg/60 border-theme-border hover:border-theme-border-hover'
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-grow min-w-0">
                        {/* مربع الاختيار المخصص التفاعلي */}
                        <button
                          type="button"
                          onClick={() => handleToggleStep(step.id)}
                          className={`w-5 h-5 rounded-lg border transition-all flex items-center justify-center cursor-pointer shrink-0 ${
                            step.completed
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'bg-theme-input border-theme-border hover:border-theme-accent'
                          }`}
                        >
                          {step.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>

                        {/* عنوان الخطوة (إما عادي أو في وضع التعديل) */}
                        {editingStepId === step.id ? (
                          <div className="flex items-center gap-1.5 flex-grow">
                            <input 
                              type="text"
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              className="bg-theme-input border border-theme-accent text-theme-text rounded-lg px-2 py-1 text-xs outline-none w-full max-w-[280px]"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRenameSubmit(step.id)
                                if (e.key === 'Escape') setEditingStepId(null)
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => handleRenameSubmit(step.id)}
                              className="p-1 hover:bg-theme-bg text-emerald-500 rounded-lg transition-colors cursor-pointer"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingStepId(null)}
                              className="p-1 hover:bg-theme-bg text-rose-500 rounded-lg transition-colors cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 min-w-0">
                            <span 
                              className={`text-xs font-bold leading-relaxed truncate ${
                                step.completed ? 'line-through text-theme-text-muted' : 'text-theme-text'
                              }`}
                            >
                              {step.title}
                            </span>
                            <button
                              type="button"
                              onClick={() => startEditingStep(step.id, step.title)}
                              className="p-1 text-theme-text-muted hover:text-theme-accent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 cursor-pointer"
                              title="تعديل اسم الخطوة"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3 shrink-0 justify-end">
                        {/* تسمية المرحلة */}
                        <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-md border ${badge.color}`}>
                          {badge.label}
                        </span>

                        {/* وقت العمل المنجز في الخطوة */}
                        <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-lg border border-theme-border bg-theme-input ${
                          step.work_minutes > 0 ? 'text-indigo-400' : 'text-theme-text-muted'
                        }`}>
                          ⏱️ {Math.floor((step.work_minutes || 0) / 60)}س { (step.work_minutes || 0) % 60 }د
                        </span>

                        {/* إجراءات سريعة */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openTimeModal(step.id)}
                            className="p-1.5 hover:bg-theme-bg text-theme-text-muted hover:text-indigo-400 rounded-lg transition-colors cursor-pointer border border-theme-border"
                            title="تسجيل ساعات عمل"
                          >
                            <Clock className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteStep(step.id)}
                            className="p-1.5 hover:bg-rose-950/20 text-theme-text-muted hover:text-rose-500 rounded-lg transition-colors cursor-pointer border border-theme-border"
                            title="حذف الخطوة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* توزيع الساعات والمجهود على المراحل الأربعة */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-theme-text text-right flex items-center gap-1.5">
              <Layers className="w-4.5 h-4.5 text-theme-accent" />
              <span>تحليل وتوزيع الساعات على مراحل الإنتاج</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              {Object.entries(phases).map(([key, phase]) => {
                const phasePct = video.totalHours > 0 ? (phase.hours / video.totalHours) * 100 : 0
                return (
                  <div 
                    key={key}
                    className="bg-theme-panel border border-theme-border rounded-2xl p-4 text-right space-y-2 flex flex-col justify-between"
                  >
                    <div>
                      <span className="block text-[9px] font-bold text-theme-text-muted truncate">{phase.name}</span>
                      <h4 className="text-lg font-black text-theme-text mt-1 font-mono">{phase.hours}س</h4>
                    </div>

                    <div className="border-t border-theme-border/40 pt-2 space-y-1">
                      <div className="flex justify-between text-[8px] text-theme-text-muted font-bold">
                        <span>المهام المنجزة:</span>
                        <span>{phase.completedCount} / {phase.tasksCount}</span>
                      </div>
                      {phase.hours > 0 && (
                        <span className="text-[8px] text-theme-accent font-bold block">
                          مساهمة: {phasePct.toFixed(0)}% من الفيديو
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* المهام المرتبطة بالفيديو */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-theme-text text-right flex items-center gap-1.5">
              <ListTodo className="w-4.5 h-4.5 text-theme-accent" />
              <span>المهام والأنشطة المرتبطة بهذا الفيديو ({tasks.length})</span>
            </h3>

            {tasks.length === 0 ? (
              <div className="bg-theme-panel border border-dashed border-theme-border rounded-2xl p-10 text-center">
                <FileText className="w-10 h-10 text-theme-text-muted opacity-50 mx-auto mb-2" />
                <h4 className="text-xs font-bold text-theme-text">لا توجد مهام مرتبطة بهذا الفيديو بعد</h4>
                <p className="text-[10px] text-theme-text-muted mt-0.5">
                  اربط مهامك بالفيديو من لوحة التحكم أو صفحة التفاصيل لتتبع الساعات بدقة.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {tasks.map((task) => (
                  <Link 
                    key={task.id}
                    href={`/task/${task.id}`}
                    className="bg-theme-panel border border-theme-border hover:border-theme-accent/20 rounded-xl p-4 flex items-center justify-between gap-4 transition-all duration-200 text-right hover:shadow-xs"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-theme-text truncate">{task.title}</span>
                        {task.group && (
                          <span 
                            className="text-[8px] font-bold px-1.5 py-0.5 rounded-md border"
                            style={{ 
                              borderColor: task.group.color === 'pastel-purple' ? '#c084fc' : task.group.color === 'pastel-blue' ? '#38bdf8' : 'var(--theme-border)',
                              color: task.group.color === 'pastel-purple' ? '#c084fc' : task.group.color === 'pastel-blue' ? '#38bdf8' : 'currentColor'
                            }}
                          >
                            {task.group.name}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 text-[9px] font-bold text-theme-text-muted">
                        <span>المرحلة:</span>
                        <span className="text-rose-450">
                          {task.video_phase === 'scripting' ? '✍️ سيناريو' : 
                           task.video_phase === 'recording' ? '🎙️ تصوير' : 
                           task.video_phase === 'editing' ? '🎬 مونتاج' : 
                           task.video_phase === 'publishing' ? '🎨 غلاف ونشر' : 'أخرى'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {task.work_minutes > 0 && (
                        <span className="bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-md font-bold text-[9px] font-mono">
                          ⏱️ {Math.floor(task.work_minutes / 60)}س {task.work_minutes % 60}د
                        </span>
                      )}
                      
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${
                        task.status === 'completed' 
                          ? 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20' 
                          : 'bg-theme-bg text-theme-text-muted border-theme-border'
                      }`}>
                        {taskStatusMap[task.status] || task.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

        </div>
      </main>

      {/* ================== مودال تسجيل الساعات للخطوة ================== */}
      {isTimeModalOpen && selectedStepId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={() => { setIsTimeModalOpen(false); setSelectedStepId(null); }}></div>
          
          <div className="relative bg-theme-panel w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-theme-border animate-modal-in z-10 text-right space-y-5">
            <div className="flex items-start justify-between gap-4 border-b border-theme-border pb-4">
              <div>
                <h3 className="text-base font-black text-theme-text flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-400" />
                  <span>تسجيل وقت العمل</span>
                </h3>
                <p className="text-[10px] text-theme-text-muted mt-0.5">سجل الساعات والدقائق التي قضيتها في خطوة: <strong className="text-theme-text">{(steps.find(s => s.id === selectedStepId)?.title)}</strong></p>
              </div>
              <button 
                onClick={() => { setIsTimeModalOpen(false); setSelectedStepId(null); }}
                className="p-1 text-theme-text-muted hover:text-theme-text rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLogTimeSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-theme-text-muted mb-1.5">الساعات</label>
                  <input 
                    type="number" 
                    value={logHours}
                    onChange={(e) => setLogHours(Math.max(0, parseInt(e.target.value) || 0))}
                    min="0"
                    className="w-full bg-theme-input border border-theme-border focus:border-theme-accent focus:bg-theme-panel text-theme-text rounded-xl px-4 py-3 text-xs transition-all outline-none font-bold" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-theme-text-muted mb-1.5">الدقائق</label>
                  <input 
                    type="number" 
                    value={logMinutes}
                    onChange={(e) => setLogMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                    min="0"
                    max="59"
                    className="w-full bg-theme-input border border-theme-border focus:border-theme-accent focus:bg-theme-panel text-theme-text rounded-xl px-4 py-3 text-xs transition-all outline-none font-bold" 
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-98"
                >
                  <span>حفظ وتسجيل الوقت ⏱️</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================== مودال تعديل الفيديو ================== */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setIsEditModalOpen(false)}></div>
          
          <div className="relative bg-theme-panel w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl border border-theme-border animate-modal-in z-10 text-right space-y-5">
            <div className="flex items-start justify-between gap-4 border-b border-theme-border pb-4">
              <div>
                <h3 className="text-base font-black text-theme-text flex items-center gap-2">
                  <Edit className="w-5 h-5 text-theme-accent" />
                  <span>تعديل تفاصيل الفيديو</span>
                </h3>
                <p className="text-[10px] text-theme-text-muted mt-0.5">تحديث معلومات الفيديو الحالي والهدف الزمني</p>
              </div>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 text-theme-text-muted hover:text-theme-text rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-theme-text-muted mb-1.5">عنوان الفيديو</label>
                <input 
                  type="text" 
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                  className="w-full bg-theme-input border border-theme-border focus:border-theme-accent focus:bg-theme-panel text-theme-text rounded-xl px-4 py-3 text-xs transition-all outline-none" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-theme-text-muted mb-1.5">وصف ومحتوى الفيديو</label>
                <textarea 
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={4}
                  className="w-full bg-theme-input border border-theme-border focus:border-theme-accent focus:bg-theme-panel text-theme-text rounded-xl px-4 py-3 text-xs transition-all outline-none resize-none leading-relaxed" 
                ></textarea>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-theme-text-muted mb-1.5">ساعات العمل المستهدفة</label>
                  <input 
                    type="number" 
                    value={editTargetHours}
                    onChange={(e) => setEditTargetHours(Math.max(1, parseInt(e.target.value) || 20))}
                    required
                    min="1"
                    className="w-full bg-theme-input border border-theme-border focus:border-theme-accent focus:bg-theme-panel text-theme-text rounded-xl px-4 py-3 text-xs transition-all outline-none font-bold" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-theme-text-muted mb-1.5">رابط غلاف الفيديو (Thumbnail)</label>
                  <input 
                    type="url" 
                    value={editThumbnail}
                    onChange={(e) => setEditThumbnail(e.target.value)}
                    className="w-full bg-theme-input border border-theme-border focus:border-theme-accent focus:bg-theme-panel text-theme-text rounded-xl px-4 py-3 text-xs transition-all outline-none font-mono" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-theme-text-muted mb-1.5">حالة العمل والإنتاج</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as Video['status'])}
                  className="w-full bg-theme-input border border-theme-border focus:border-theme-accent focus:bg-theme-panel text-theme-text rounded-xl px-4 py-3 text-xs transition-all outline-none cursor-pointer font-bold"
                >
                  <option value="planning">📝 تخطيط وتحضير</option>
                  <option value="in_progress">🎬 قيد التصوير والمونتاج</option>
                  <option value="completed">✅ جاهز ومكتمل للنشر</option>
                  <option value="published">🚀 نُشر بالقناة</option>
                </select>
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
                      <span>جاري حفظ التعديلات...</span>
                    </>
                  ) : (
                    <span>تأكيد وحفظ التعديلات</span>
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

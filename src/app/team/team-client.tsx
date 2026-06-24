'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import Toast from '@/components/Toast'
import { UserPlus, Mail, ShieldAlert, User, ShieldCheck, Loader2, Clock } from 'lucide-react'
import { createTeamUser, getProfiles, getUserAvailability } from '../actions'

interface Profile {
  id: string
  name: string
  email: string
  role: string
  avatar_url: string
}

interface TeamClientProps {
  currentProfile: Profile
  initialTeam: Profile[]
}

export default function TeamClient({ currentProfile, initialTeam }: TeamClientProps) {
  const [team, setTeam] = useState<Profile[]>(initialTeam)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' | 'error' } | null>(null)

  // حالات نافذة عرض المتاحية
  const [selectedUserAvailability, setSelectedUserAvailability] = useState<any[]>([])
  const [selectedUserName, setSelectedUserName] = useState('')
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false)
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false)

  const showToast = (message: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setToast({ message, type })
  }

  const handleCreateUserSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const role = formData.get('role') as 'admin' | 'user'

    try {
      setIsPending(true)
      const res = await createTeamUser(name, email, role)
      
      if (res.success) {
        showToast(`${res.message}`, 'success')
        setIsModalOpen(false)
        form.reset()
        const updatedTeam = await getProfiles()
        setTeam(updatedTeam)
      }
    } catch (err: any) {
      showToast('فشل إضافة العضو: ' + err.message, 'error')
    } finally {
      setIsPending(false)
    }
  }

  // استدعاء وعرض أوقات متاحية الموظف المحدد
  const handleViewAvailability = async (userId: string, userName: string) => {
    setSelectedUserName(userName)
    setIsAvailabilityModalOpen(true)
    setIsLoadingAvailability(true)
    try {
      const data = await getUserAvailability(userId)
      setSelectedUserAvailability(data)
    } catch (err: any) {
      showToast('فشل جلب أوقات التوفر: ' + err.message, 'error')
      setIsAvailabilityModalOpen(false)
    } finally {
      setIsLoadingAvailability(false)
    }
  }

  const isAdmin = currentProfile.role === 'admin'

  return (
    <div className="flex-grow flex flex-col min-h-screen pb-24 md:pb-8">
      <Header user={currentProfile} />

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <section className="space-y-6 animate-modal-in">
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-theme-border pb-5">
            <div className="text-right">
              <h1 className="text-2xl font-bold text-theme-text">أعضاء ومستلمي المهام</h1>
              <p className="text-xs text-theme-text-muted mt-1">قائمة بأعضاء النظام المغلق مع إمكانية إشراك موظفين جدد من قبل الإدارة</p>
            </div>
            
            {isAdmin && (
              <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-theme-accent hover:bg-theme-accent-hover text-theme-panel text-xs font-bold px-5 py-3 rounded-xl transition-all flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>إضافة عضو للفريق</span>
              </button>
            )}
          </div>

          {/* شبكة استعراض الموظفين بمظهر بطاقات فخم */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {team.map((user) => {
              const isUserAdmin = user.role === 'admin'
              return (
                <div 
                  key={user.id}
                  className="bg-theme-panel border border-theme-border rounded-2xl p-5 flex flex-col justify-between gap-4 text-right shadow-sm hover:border-theme-border/80 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-center justify-between gap-4 w-full">
                    <div className="flex items-center gap-3">
                      <img 
                        src={user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=100&auto=format&fit=crop'} 
                        alt={user.name} 
                        className="w-11 h-11 rounded-2xl object-cover shrink-0 border border-theme-border"
                      />
                      <div>
                        <h4 className="text-sm font-bold text-theme-text flex items-center gap-1">
                          <span>{user.name}</span>
                          {isUserAdmin ? (
                            <span title="مدير نظام"><ShieldCheck className="w-3.5 h-3.5 text-theme-accent inline shrink-0" /></span>
                          ) : (
                            <span title="مستلم مهام"><User className="w-3.5 h-3.5 text-theme-text-muted inline shrink-0" /></span>
                          )}
                        </h4>
                        <p className="text-xs text-theme-text-muted mt-0.5">{user.email}</p>
                      </div>
                    </div>
                    <span className={`text-[9px] font-bold px-3 py-1.5 rounded-xl shrink-0 select-none ${
                      isUserAdmin 
                        ? 'bg-theme-accent text-theme-panel' 
                        : 'bg-theme-bg border border-theme-border text-theme-text-muted'
                    }`}>
                      {isUserAdmin ? 'مدير نظام' : 'مستلم مهام'}
                    </span>
                  </div>

                  {/* زر استعراض أوقات توفر هذا العضو */}
                  <button
                    onClick={() => handleViewAvailability(user.id, user.name)}
                    className="w-full bg-theme-bg hover:bg-theme-border text-theme-text border border-theme-border text-[10px] font-bold py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>عرض أوقات التوفر</span>
                  </button>
                </div>
              )
            })}
          </div>

        </section>
      </main>

      {/* ================== النوافذ المنبثقة (Modals) ================== */}

      {/* أ) نافذة إضافة مستخدم جديد (Admin Only) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-theme-panel w-full max-w-md mx-4 rounded-3xl p-6 sm:p-8 shadow-2xl border border-theme-border animate-modal-in z-10 text-right">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-theme-text">إضافة عضو جديد للفريق</h3>
                <p className="text-xs text-theme-text-muted mt-1">قم بتعبئة التفاصيل لإنشاء حساب مغلق للأعضاء الجدد</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-theme-text-muted hover:text-theme-text hover:bg-theme-bg rounded-xl transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUserSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-theme-text-muted mb-1.5">الاسم الكامل</label>
                <input 
                  type="text" 
                  name="name" 
                  required 
                  className="w-full bg-theme-input border border-theme-border focus:border-theme-accent focus:bg-theme-panel text-theme-text rounded-xl px-4 py-3 text-xs transition-all outline-none" 
                  placeholder="مثال: يوسف أحمد"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-theme-text-muted mb-1.5">البريد الإلكتروني</label>
                <input 
                  type="email" 
                  name="email" 
                  required 
                  className="w-full bg-theme-input border border-theme-border focus:border-theme-accent focus:bg-theme-panel text-theme-text rounded-xl px-4 py-3 text-xs transition-all outline-none text-left" 
                  placeholder="yousef@task.com"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-theme-text-muted mb-1.5">الصلاحية والرتبة</label>
                <select 
                  name="role" 
                  required 
                  className="w-full bg-theme-input border border-theme-border focus:border-theme-accent focus:bg-theme-panel text-theme-text rounded-xl px-4 py-3 text-xs transition-all outline-none cursor-pointer"
                >
                  <option value="user">مستخدم عادي (إنجاز المهام المسندة له فقط)</option>
                  <option value="admin">مدير نظام (صلاحية كاملة في إضافة الأعضاء والمهام)</option>
                </select>
              </div>

              <div className="bg-amber-950/20 border border-amber-500/20 rounded-xl p-3 text-[10px] text-amber-400 leading-relaxed flex gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
                <p>
                  سيتم تعيين كلمة مرور افتراضية أولية للمستخدم الجديد وهي <strong>user123</strong>.
                  يمكن للمستخدم تسجيل الدخول بها فوراً وتغييرها من حسابه.
                </p>
              </div>

              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={isPending}
                  className="w-full bg-theme-accent hover:bg-theme-accent-hover disabled:bg-neutral-300 text-theme-panel font-bold py-3.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري الحفظ...</span>
                    </>
                  ) : (
                    <span>حفظ وتأكيد الإضافة</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ب) نافذة عرض المتاحية للمشرف (Modal - Read Only) */}
      {isAvailabilityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setIsAvailabilityModalOpen(false)}></div>
          <div className="relative bg-theme-panel w-full max-w-4xl mx-4 rounded-3xl p-6 sm:p-8 shadow-2xl border border-theme-border animate-modal-in z-10 text-right">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-theme-text">أوقات توفر العضو: {selectedUserName}</h3>
                <p className="text-xs text-theme-text-muted mt-1">مخطط أسبوعي يوضح الساعات المفضلة والنشطة لتسليم المهام</p>
              </div>
              <button 
                onClick={() => setIsAvailabilityModalOpen(false)}
                className="p-1.5 text-theme-text-muted hover:text-theme-text hover:bg-theme-bg rounded-xl transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {isLoadingAvailability ? (
              <div className="flex flex-col items-center justify-center p-12 text-theme-text-muted">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <span className="text-xs">جاري تحميل شبكة التوفر...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {/* دليل الألوان */}
                <div className="flex items-center gap-4 text-[10px] font-bold text-theme-text bg-theme-bg p-3 rounded-xl border border-theme-border">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-emerald-500"></span>
                    <span>متاح للعمل</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-amber-400"></span>
                    <span>محتمل / متوقع</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-rose-500/10 border border-rose-500/20"></span>
                    <span>غير متاح</span>
                  </span>
                </div>

                {/* شبكة الساعات */}
                <div className="overflow-x-auto scrollbar-hide bg-theme-panel border border-theme-border rounded-2xl p-4">
                  <div className="min-w-[700px] space-y-3">
                    
                    {/* ترويسة الساعات */}
                    <div className="flex items-center text-center text-[9px] text-theme-text-muted font-bold border-b border-theme-border pb-1">
                      <div className="w-20 shrink-0 text-right pr-2">اليوم / الساعة</div>
                      <div className="flex-grow grid gap-0.5" style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}>
                        {Array.from({ length: 24 }).map((_, hour) => (
                          <div key={hour}>{String(hour).padStart(2, '0')}</div>
                        ))}
                      </div>
                    </div>

                    {/* الأسطر */}
                    {['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'].map((dayName, dayIndex) => (
                      <div key={dayIndex} className="flex items-center py-0.5">
                        <div className="w-20 shrink-0 text-right text-xs font-bold text-theme-text">{dayName}</div>
                        <div className="flex-grow grid gap-0.5" style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}>
                          {Array.from({ length: 24 }).map((_, hour) => {
                            const slot = selectedUserAvailability.find(s => s.day_of_week === dayIndex && s.hour === hour)
                            const status = slot?.status || 'unavailable'
                            const colorClass = 
                              status === 'available' ? 'bg-emerald-500 border-emerald-600' :
                              status === 'maybe' ? 'bg-amber-400 border-amber-500' :
                              'bg-rose-500/10 border-rose-500/20'
                            
                            return (
                              <div
                                key={hour}
                                className={`aspect-square rounded border transition-all ${colorClass}`}
                                title={`يوم ${dayName} | الساعة ${String(hour).padStart(2, '0')}:00`}
                              />
                            )
                          })}
                        </div>
                      </div>
                    ))}

                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* عرض التنبيهات المنبثقة */}
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

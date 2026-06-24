'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'
import webpush from 'web-push'

if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(
      'https://taskini-murex.vercel.app',
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    )
  } catch (err) {
    console.error('Error setting VAPID details:', err)
  }
}

// جلب معلومات المستخدم الحالي وملف تعريفه
export async function getCurrentUserProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile
}

// جلب قائمة المستخدمين (للإسناد ولتبويب فريق العمل)
export async function getProfiles() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('name', { ascending: true })

  if (error) throw new Error(error.message)
  return data || []
}

// جلب مجموعات العمل لتاريخ محدد مع إحصائيات المهام
export async function getGroups(dateString: string) {
  const supabase = await createClient()
  const profile = await getCurrentUserProfile()
  if (!profile) throw new Error('غير مصرح بالدخول')

  let query = supabase
    .from('task_groups')
    .select(`
      *,
      creator:profiles!task_groups_created_by_fkey(name, email, avatar_url),
      assignee:profiles!task_groups_assigned_to_fkey(name, email, avatar_url)
    `)
    .or(`date.eq.${dateString},is_permanent.eq.true`)

  // إذا لم يكن مسؤولاً، يرى فقط المجموعات التي أنشأها أو أسندت إليه
  if (profile.role !== 'admin') {
    query = query.or(`created_by.eq.${profile.id},assigned_to.eq.${profile.id}`)
  }

  const { data: groups, error } = await query.order('created_at', { ascending: true })
  if (error) throw new Error(error.message)

  // جلب إحصائيات المهام لكل مجموعة
  const groupsWithStats = await Promise.all(
    (groups || []).map(async (group) => {
      let tasksQuery = supabase
        .from('tasks')
        .select('id, status, assigned_to')
        .eq('group_id', group.id)

      // إذا كانت المجموعة دائمة، نقوم بحساب الإحصائيات لليوم المحدد فقط
      if (group.is_permanent) {
        tasksQuery = tasksQuery.eq('due_date', dateString)
      }

      // للمستخدم العادي: نعد فقط المهام الخاصة به في هذه المجموعة
      if (profile.role !== 'admin') {
        tasksQuery = tasksQuery.eq('assigned_to', profile.id)
      }

      const { data: tasks } = await tasksQuery
      const total = tasks?.length || 0
      const completed = tasks?.filter(t => t.status === 'completed').length || 0
      const pending = total - completed

      return {
        ...group,
        totalTasks: total,
        completedTasks: completed,
        pendingTasks: pending
      }
    })
  )

  return groupsWithStats
}

// إنشاء مجموعة جديدة
export async function createGroup(name: string, color: string, date: string, assignedTo?: string, isPermanent: boolean = false) {
  const supabase = await createClient()
  const profile = await getCurrentUserProfile()
  if (!profile) throw new Error('غير مصرح بالدخول')

  const newGroup = {
    name,
    color,
    date,
    created_by: profile.id,
    assigned_to: profile.role === 'admin' ? (assignedTo || profile.id) : profile.id,
    is_permanent: isPermanent
  }

  const { data, error } = await supabase
    .from('task_groups')
    .insert(newGroup)
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/')
  return data
}

// حذف مجموعة عمل
export async function deleteGroup(groupId: string) {
  const supabase = await createClient()
  const profile = await getCurrentUserProfile()
  if (!profile) throw new Error('غير مصرح بالدخول')

  let query = supabase
    .from('task_groups')
    .delete()
    .eq('id', groupId)

  // إذا لم يكن مشرفاً، لا يمكنه حذف المجموعات إلا التي أنشأها بنفسه
  if (profile.role !== 'admin') {
    query = query.eq('created_by', profile.id)
  }

  const { error } = await query
  if (error) throw new Error(error.message)

  revalidatePath('/')
  return { success: true }
}

// تعديل مجموعة عمل
export async function updateGroup(
  groupId: string,
  name: string,
  color: string,
  isPermanent: boolean,
  assignedTo?: string
) {
  const supabase = await createClient()
  const profile = await getCurrentUserProfile()
  if (!profile) throw new Error('غير مصرح بالدخول')

  // التأكد من الصلاحية (منشئ المجموعة أو مسؤول)
  const { data: group } = await supabase
    .from('task_groups')
    .select('created_by')
    .eq('id', groupId)
    .single()

  if (!group) throw new Error('المجموعة غير موجودة')
  if (profile.role !== 'admin' && group.created_by !== profile.id) {
    throw new Error('ليست لديك الصلاحية لتعديل هذه المجموعة')
  }

  const updateData: any = {
    name,
    color,
    is_permanent: isPermanent
  }

  if (profile.role === 'admin') {
    updateData.assigned_to = assignedTo || null
  }

  const { data, error } = await supabase
    .from('task_groups')
    .update(updateData)
    .eq('id', groupId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/')
  return data
}

// جلب المهام التابعة لمجموعة عمل مع الفرز بالتاريخ للمجموعات الدائمة
export async function getTasks(groupId: string, statusFilter: string = 'all', dateString?: string) {
  const supabase = await createClient()
  const profile = await getCurrentUserProfile()
  if (!profile) throw new Error('غير مصرح بالدخول')

  // جلب تفاصيل المجموعة لمعرفة ما إذا كانت دائمة
  const { data: group } = await supabase
    .from('task_groups')
    .select('is_permanent')
    .eq('id', groupId)
    .single()

  let query = supabase
    .from('tasks')
    .select(`
      *,
      assignee:profiles!tasks_assigned_to_fkey(name, email, avatar_url),
      milestone:project_milestones(id, title)
    `)
    .eq('group_id', groupId)

  if (group?.is_permanent && dateString) {
    query = query.eq('due_date', dateString)
  }

  // الفرز حسب حالة المهمة
  if (statusFilter === 'pending') {
    query = query.neq('status', 'completed')
  } else if (statusFilter === 'completed') {
    query = query.eq('status', 'completed')
  }

  // إذا لم يكن مسؤولاً، يرى فقط مهامه المسندة إليه
  if (profile.role !== 'admin') {
    query = query.eq('assigned_to', profile.id)
  }

  const { data: tasks, error } = await query.order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return tasks || []
}

// إضافة مهمة جديدة وإسنادها
export async function addTask(
  title: string,
  description: string,
  groupId: string,
  assignedTo: string,
  dueDate: string,
  color: string,
  milestoneId?: string | null
) {
  const supabase = await createClient()
  const profile = await getCurrentUserProfile()
  if (!profile) throw new Error('غير مصرح بالدخول')

  const newTask = {
    group_id: groupId,
    title,
    description,
    assigned_to: profile.role === 'admin' ? assignedTo : profile.id,
    due_date: dueDate,
    color,
    status: 'not_started',
    milestone_id: milestoneId || null
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert(newTask)
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/')
  revalidatePath('/roadmap')
  return data
}

// تعديل حالة مهمة
export async function updateTaskStatus(taskId: string, newStatus: string) {
  const supabase = await createClient()
  const profile = await getCurrentUserProfile()
  if (!profile) throw new Error('غير مصرح بالدخول')

  // التأكد من الصلاحية (أن المهمة مسندة للمستخدم أو أنه مسؤول)
  const { data: task } = await supabase
    .from('tasks')
    .select('assigned_to')
    .eq('id', taskId)
    .single()

  if (!task) throw new Error('المهمة غير موجودة')
  if (profile.role !== 'admin' && task.assigned_to !== profile.id) {
    throw new Error('ليست لديك الصلاحية لتعديل حالة هذه المهمة')
  }

  const todayStr = new Date().toISOString().split('T')[0]
  const updateData = {
    status: newStatus,
    completed_date: newStatus === 'completed' ? todayStr : null
  }

  const { data, error } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', taskId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/')
  revalidatePath('/roadmap')
  return data
}

// تعديل نصوص وتفاصيل مهمة
export async function updateTaskDetails(
  taskId: string,
  title: string,
  description: string,
  milestoneId?: string | null,
  assignedTo?: string | null,
  dueDate?: string | null,
  color?: string | null
) {
  const supabase = await createClient()
  const profile = await getCurrentUserProfile()
  if (!profile) throw new Error('غير مصرح بالدخول')

  const updateData: any = {
    title,
    description,
    milestone_id: milestoneId || null
  }

  if (assignedTo !== undefined) updateData.assigned_to = assignedTo || null
  if (dueDate !== undefined) updateData.due_date = dueDate
  if (color !== undefined) updateData.color = color

  const { error } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', taskId)

  if (error) throw new Error(error.message)
  revalidatePath('/')
  revalidatePath('/roadmap')
  return { success: true }
}

// حذف مهمة (Admin Only)
export async function deleteTask(taskId: string) {
  const supabase = await createClient()
  const profile = await getCurrentUserProfile()
  if (!profile || profile.role !== 'admin') throw new Error('صلاحيات غير كافية')

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)

  if (error) throw new Error(error.message)
  revalidatePath('/')
  return { success: true }
}

// ترحيل المهام غير المكتملة لليوم التالي
export async function migrateTasks(groupId: string) {
  const supabase = await createClient()
  const profile = await getCurrentUserProfile()
  if (!profile) throw new Error('غير مصرح بالدخول')

  // 1. جلب بيانات المجموعة الحالية
  const { data: group } = await supabase
    .from('task_groups')
    .select('*')
    .eq('id', groupId)
    .single()

  if (!group) throw new Error('المجموعة غير موجودة')

  // 2. جلب المهام غير المكتملة
  let tasksQuery = supabase
    .from('tasks')
    .select('*')
    .eq('group_id', groupId)
    .neq('status', 'completed')

  // للمستخدم العادي: ترحيل مهامه الخاصة فقط
  if (profile.role !== 'admin') {
    tasksQuery = tasksQuery.eq('assigned_to', profile.id)
  }

  const { data: unfinishedTasks, error: tasksError } = await tasksQuery
  if (tasksError) throw new Error(tasksError.message)
  if (!unfinishedTasks || unfinishedTasks.length === 0) {
    return { success: false, message: 'لا توجد مهام غير مكتملة لترحيلها.' }
  }

  // 3. تحديد تاريخ الغد
  const currentDate = new Date(group.date)
  currentDate.setDate(currentDate.getDate() + 1)
  const tomorrowStr = currentDate.toISOString().split('T')[0]

  // 4. البحث عن مجموعة الغد أو إنشائها
  let nextGroupId = ''
  const { data: nextGroup } = await supabase
    .from('task_groups')
    .select('id')
    .eq('name', group.name)
    .eq('date', tomorrowStr)
    .single()

  if (nextGroup) {
    nextGroupId = nextGroup.id
  } else {
    // إنشاء مجموعة جديدة للغد
    const { data: newGroup, error: groupCreateError } = await supabase
      .from('task_groups')
      .insert({
        name: group.name,
        color: group.color,
        date: tomorrowStr,
        created_by: group.created_by,
        assigned_to: group.assigned_to
      })
      .select()
      .single()

    if (groupCreateError) throw new Error(groupCreateError.message)
    nextGroupId = newGroup.id
  }

  // 5. تحديث المجموعات للمهام المترحلة
  const taskIds = unfinishedTasks.map(t => t.id)
  const { error: updateTasksError } = await supabase
    .from('tasks')
    .update({
      group_id: nextGroupId,
      migrated_from_date: group.date
    })
    .in('id', taskIds)

  if (updateTasksError) throw new Error(updateTasksError.message)

  revalidatePath('/')
  return { success: true, message: 'تم ترحيل المهام بنجاح!' }
}

// إنشاء حساب مستخدم جديد (Admin Only)
export async function createTeamUser(name: string, email: string, role: 'admin' | 'user') {
  const adminProfile = await getCurrentUserProfile()
  if (!adminProfile || adminProfile.role !== 'admin') {
    throw new Error('صلاحيات غير كافية لإنشاء مستخدمين')
  }

  // استخدام Admin Client لتفادي تفعيل تسجيل الدخول التلقائي أو إرسال تأكيد بالبريد الإلكتروني
  const adminSupabase = createAdminClient()

  // كلمة مرور افتراضية مبدئية: اسم المستخدم + 123
  const defaultPassword = 'user123'

  const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
    email,
    password: defaultPassword,
    email_confirm: true,
    user_metadata: {
      name,
      role
    }
  })

  if (authError) throw new Error(authError.message)

  // ملاحظة: جدول profiles سيتم تعبئته تلقائياً من خلال المحفّز (trigger) الذي أنشأناه في قاعدة البيانات.
  
  revalidatePath('/team')
  return { 
    success: true, 
    user: authData.user, 
    message: `تم إنشاء الحساب بنجاح. كلمة المرور الافتراضية هي: ${defaultPassword}` 
  }
}

// جلب المهام المنجزة في تاريخ محدد (لسجل الإنجاز)
export async function getArchiveTasks(dateString: string) {
  const supabase = await createClient()
  const profile = await getCurrentUserProfile()
  if (!profile) throw new Error('غير مصرح بالدخول')

  let query = supabase
    .from('tasks')
    .select(`
      *,
      group:task_groups(name, color),
      assignee:profiles!tasks_assigned_to_fkey(name, email, avatar_url)
    `)
    .eq('status', 'completed')
    .eq('completed_date', dateString)

  // إذا لم يكن مسؤولاً، يرى فقط مهامه المكتملة هو بنفسه
  if (profile.role !== 'admin') {
    query = query.eq('assigned_to', profile.id)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data || []
}

// جلب الملفات المرفقة لمهمة محددة
export async function getTaskFiles(taskId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('task_files')
    .select('*')
    .eq('task_id', taskId)
    .order('uploaded_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data || []
}

// حذف ملف مرفق لمهمة
export async function deleteTaskFile(fileId: string, filePath: string) {
  const supabase = await createClient()
  const profile = await getCurrentUserProfile()
  if (!profile) throw new Error('غير مصرح بالدخول')

  // 1. حذف الملف من مخزن Supabase Storage السحابي
  const { error: storageError } = await supabase.storage
    .from('task-attachments')
    .remove([filePath])

  if (storageError) throw new Error(storageError.message)

  // 2. حذف مسار الملف من جدول task_files لقاعدة البيانات
  const { error: dbError } = await supabase
    .from('task_files')
    .delete()
    .eq('id', fileId)

  if (dbError) throw new Error(dbError.message)

  return { success: true }
}

// رفع ملف مرفق لمهمة سحابياً إلى Supabase Storage
export async function uploadTaskFile(taskId: string, formData: FormData) {
  const supabase = await createClient()
  const profile = await getCurrentUserProfile()
  if (!profile) throw new Error('غير مصرح بالدخول')

  const file = formData.get('task_file') as File
  if (!file || file.size === 0) throw new Error('الملف المختار غير صالح')

  // تحويل الملف لـ ArrayBuffer للرفع السحابي
  const arrayBuffer = await file.arrayBuffer()
  const buffer = new Uint8Array(arrayBuffer)
  
  // تنظيف اسم الملف لتفادي المشاكل الأمنية ومشاكل المسارات
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
  const storagePath = `${taskId}/${Date.now()}_${cleanFileName}`

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('task-attachments')
    .upload(storagePath, buffer, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false
    })

  if (uploadError) throw new Error(uploadError.message)

  const { error: dbError } = await supabase
    .from('task_files')
    .insert({
      task_id: taskId,
      file_name: file.name,
      file_path: storagePath,
      uploaded_by: profile.id
    })

  if (dbError) {
    // التراجع عن رفع الملف السحابي في حال فشل الإدخال بقاعدة البيانات
    await supabase.storage.from('task-attachments').remove([storagePath])
    throw new Error(dbError.message)
  }

  revalidatePath(`/task/${taskId}`)
  return { success: true }
}

// تحديث بيانات الملف الشخصي (الاسم والأفاتار) للمستخدم الحالي
export async function updateProfile(name: string, formData?: FormData, newPassword?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('غير مصرح بالدخول')

  if (newPassword && newPassword.trim().length > 0) {
    if (newPassword.trim().length < 6) {
      throw new Error('يجب أن تكون كلمة المرور 6 أحرف على الأقل')
    }
    const { error: passError } = await supabase.auth.updateUser({
      password: newPassword
    })
    if (passError) throw new Error(passError.message)
  }

  let avatarUrl = null
  
  if (formData) {
    const file = formData.get('avatar_file') as File
    if (file && file.size > 0) {
      const arrayBuffer = await file.arrayBuffer()
      const buffer = new Uint8Array(arrayBuffer)
      
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const storagePath = `avatars/${user.id}/${Date.now()}_${cleanFileName}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('task-attachments')
        .upload(storagePath, buffer, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) throw new Error(uploadError.message)

      avatarUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/task-attachments/${storagePath}`
    }
  }

  const updateData: any = { name }
  if (avatarUrl) {
    updateData.avatar_url = avatarUrl
  }

  // تحديث جدول profiles
  const { error: dbError } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', user.id)

  if (dbError) throw new Error(dbError.message)

  // تحديث بيانات Auth metadata
  const { error: authError } = await supabase.auth.updateUser({
    data: { 
      name, 
      ...(avatarUrl ? { avatar_url: avatarUrl } : {}) 
    }
  })

  if (authError) throw new Error(authError.message)

  revalidatePath('/')
  return { success: true, avatarUrl }
}

// جلب شبكة المتاحية للمستخدم المحدد
export async function getUserAvailability(userId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('user_availability')
    .select('*')
    .eq('user_id', userId)

  if (error) throw new Error(error.message)
  return data || []
}

// تحديث حالة ساعة معينة في جدول المتاحية للمستخدم الحالي
export async function updateAvailabilitySlot(dayOfWeek: number, hour: number, status: 'available' | 'unavailable' | 'maybe') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('غير مصرح بالدخول')

  const { data, error } = await supabase
    .from('user_availability')
    .upsert({
      user_id: user.id,
      day_of_week: dayOfWeek,
      hour: hour,
      status: status,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,day_of_week,hour'
    })

  if (error) throw new Error(error.message)
  return { success: true }
}

// جلب تقارير اليوميات (daily standup) لتاريخ محدد
export async function getDailyStandups(dateString: string) {
  const supabase = await createClient()
  const profile = await getCurrentUserProfile()
  if (!profile) throw new Error('غير مصرح بالدخول')

  const { data, error } = await supabase
    .from('daily_standups')
    .select(`
      *,
      user:profiles(name, email, avatar_url),
      milestone:project_milestones(id, title)
    `)
    .eq('date', dateString)

  if (error) throw new Error(error.message)
  return data || []
}

// حفظ أو تحديث التقرير اليومي للمستخدم الحالي
export async function submitDailyStandup(
  todayTasks: string,
  tomorrowTasks: string,
  blockers: string,
  mood: 'energetic' | 'stable' | 'tired' | 'stressed',
  progressRate: 'all' | 'most' | 'half' | 'low',
  productivityScore: number,
  dateString: string,
  milestoneId?: string | null,
  workMinutes: number = 0
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('غير مصرح بالدخول')

  const { data, error } = await supabase
    .from('daily_standups')
    .upsert({
      user_id: user.id,
      date: dateString,
      today_tasks: todayTasks,
      tomorrow_tasks: tomorrowTasks,
      blockers: blockers || null,
      mood,
      progress_rate: progressRate,
      productivity_score: productivityScore,
      milestone_id: milestoneId || null,
      work_minutes: workMinutes,
      created_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,date'
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  // إرسال إشعار لحظي لبقية أعضاء الفريق
  try {
    const profile = await getCurrentUserProfile()
    const userName = profile?.name || 'زميل لك'

    // جلب كافة اشتراكات أعضاء الفريق الآخرين
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('id, user_id, subscription')
      .neq('user_id', user.id)

    if (subscriptions && subscriptions.length > 0) {
      const payload = JSON.stringify({
        title: 'تحديث يومي جديد 🚀',
        body: `قام ${userName} بكتابة تحديثه اليومي في اللقاء السريع.`,
        url: '/standup'
      })

      // إرسال الإشعارات بالتوازي وانتظارها لحل مشكلة Serverless timeout
      const pushPromises = subscriptions.map(async (subRecord: any) => {
        try {
          await webpush.sendNotification(subRecord.subscription, payload)
        } catch (pushErr: any) {
          // إذا كان الاشتراك منتهي أو تم إلغاؤه (410 أو 404)، نظف قاعدة البيانات منه
          if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
            console.log(`حذف اشتراك منتهي للمستخدم: ${subRecord.user_id}`)
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('id', subRecord.id)
          } else {
            console.error('فشل إرسال إشعار Push لجهاز:', pushErr)
          }
        }
      })

      await Promise.allSettled(pushPromises)
    }
  } catch (pushGeneralErr) {
    console.error('خطأ عام أثناء معالجة الإشعارات اللحظية:', pushGeneralErr)
  }

  revalidatePath('/standup')
  return data
}

// حذف التقرير اليومي للمستخدم الحالي للتاريخ المحدد
export async function deleteDailyStandup(dateString: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('غير مصرح بالدخول')

  const { error } = await supabase
    .from('daily_standups')
    .delete()
    .eq('user_id', user.id)
    .eq('date', dateString)

  if (error) throw new Error(error.message)
  revalidatePath('/standup')
  return { success: true }
}

// جلب المحطات الكبرى (milestones) مع المهام التابعة لحساب التقدم
export async function getMilestones() {
  const supabase = await createClient()
  const profile = await getCurrentUserProfile()
  if (!profile) throw new Error('غير مصرح بالدخول')

  // استعلام أمثل للأداء: جلب المحطات مع حقول id و status فقط من المهام المرتبطة
  const { data, error } = await supabase
    .from('project_milestones')
    .select(`
      *,
      tasks(id, status)
    `)
    .order('due_date', { ascending: true })

  if (error) throw new Error(error.message)

  // حساب نسبة التقدم لكل محطة
  const milestonesWithProgress = (data || []).map((milestone: any) => {
    const total = milestone.tasks?.length || 0
    const completed = milestone.tasks?.filter((t: any) => t.status === 'completed').length || 0
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0
    
    return {
      ...milestone,
      totalTasks: total,
      completedTasks: completed,
      progress
    }
  })

  return milestonesWithProgress
}

// إنشاء محطة كبرى جديدة (Admin Only)
export async function createMilestone(title: string, description: string, dueDate: string) {
  const supabase = await createClient()
  const profile = await getCurrentUserProfile()
  if (!profile || profile.role !== 'admin') throw new Error('صلاحيات غير كافية')

  const { data, error } = await supabase
    .from('project_milestones')
    .insert({
      title,
      description,
      due_date: dueDate,
      status: 'active'
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/roadmap')
  return data
}

// تعديل محطة كبرى (Admin Only)
export async function updateMilestone(id: string, title: string, description: string, dueDate: string, status: 'active' | 'completed' | 'delayed') {
  const supabase = await createClient()
  const profile = await getCurrentUserProfile()
  if (!profile || profile.role !== 'admin') throw new Error('صلاحيات غير كافية')

  const { data, error } = await supabase
    .from('project_milestones')
    .update({
      title,
      description,
      due_date: dueDate,
      status
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/roadmap')
  return data
}

// حذف محطة كبرى (Admin Only)
export async function deleteMilestone(id: string) {
  const supabase = await createClient()
  const profile = await getCurrentUserProfile()
  if (!profile || profile.role !== 'admin') throw new Error('صلاحيات غير كافية')

  const { error } = await supabase
    .from('project_milestones')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/roadmap')
  return { success: true }
}

// حفظ اشتراك إشعارات ويب لحظية للمستخدم الحالي
export async function savePushSubscription(subscription: any) {
  const supabase = await createClient()
  const profile = await getCurrentUserProfile()
  if (!profile) throw new Error('غير مصرح بالدخول')

  // حفظ الاشتراك في جدول push_subscriptions مع تجنب التكرار
  const { data, error } = await supabase
    .from('push_subscriptions')
    .upsert({
      user_id: profile.id,
      subscription: subscription,
      created_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,subscription'
    })

  if (error) throw new Error(error.message)
  return { success: true }
}

// حذف اشتراك إشعارات ويب لحظية
export async function deletePushSubscription(endpoint: string) {
  const supabase = await createClient()
  const profile = await getCurrentUserProfile()
  if (!profile) throw new Error('غير مصرح بالدخول')

  // حذف الاشتراك بناءً على رابط الـ endpoint
  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', profile.id)
    .eq('subscription->>endpoint', endpoint)

  if (error) throw new Error(error.message)
  return { success: true }
}

// جلب التقارير والإحصائيات الشهرية للأعضاء والفريق بالكامل
export async function getMonthlyAnalytics(month: number, year: number) {
  const supabase = await createClient()
  const profile = await getCurrentUserProfile()
  if (!profile) throw new Error('غير مصرح بالدخول')

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  // 1. جلب كافة الأعضاء
  const { data: teamProfiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, name, email, avatar_url, role')
    .order('name', { ascending: true })

  if (profilesError) throw new Error(profilesError.message)

  // 2. جلب كافة التقارير اليومية للشهر المحدد
  const { data: standups, error: standupsError } = await supabase
    .from('daily_standups')
    .select('user_id, date, work_minutes, productivity_score')
    .gte('date', startDate)
    .lte('date', endDate)

  if (standupsError) throw new Error(standupsError.message)

  // 3. جلب كافة المهام المكتملة في هذا الشهر
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('assigned_to, completed_date, title')
    .eq('status', 'completed')
    .gte('completed_date', startDate)
    .lte('completed_date', endDate)

  if (tasksError) throw new Error(tasksError.message)

  // 4. تجميع البيانات لكل موظف
  const userStats = (teamProfiles || []).map((u) => {
    const userStandups = (standups || []).filter((s) => s.user_id === u.id)
    const userTasks = (tasks || []).filter((t) => t.assigned_to === u.id)

    const totalMinutes = userStandups.reduce((sum, s) => sum + (s.work_minutes || 0), 0)
    const totalDays = userStandups.length
    const avgProductivity = totalDays > 0 
      ? Math.round((userStandups.reduce((sum, s) => sum + s.productivity_score, 0) / totalDays) * 10) / 10
      : 0

    return {
      userId: u.id,
      name: u.name,
      email: u.email,
      avatarUrl: u.avatar_url,
      role: u.role,
      totalMinutes,
      totalHours: Math.round((totalMinutes / 60) * 10) / 10,
      completedTasksCount: userTasks.length,
      daysLogged: totalDays,
      avgProductivity,
      tasks: userTasks.map(t => t.title)
    }
  })

  // 5. حساب إجمالي الفريق
  const teamTotalMinutes = userStats.reduce((sum, u) => sum + u.totalMinutes, 0)
  const teamCompletedTasks = userStats.reduce((sum, u) => sum + u.completedTasksCount, 0)
  const loggedUsersCount = userStats.filter(u => u.daysLogged > 0).length
  const teamAvgProductivity = loggedUsersCount > 0
    ? Math.round((userStats.filter(u => u.daysLogged > 0).reduce((sum, u) => sum + u.avgProductivity, 0) / loggedUsersCount) * 10) / 10
    : 0

  return {
    userStats,
    teamSummary: {
      totalHours: Math.round((teamTotalMinutes / 60) * 10) / 10,
      completedTasksCount: teamCompletedTasks,
      avgProductivity: teamAvgProductivity
    }
  }
}





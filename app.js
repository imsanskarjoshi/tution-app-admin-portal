/* ==========================================================================
   Educator HQ Command Console Controller
   ========================================================================== */

// Appwrite SDK bindings fallback
const { Client, Account, Databases, Query, ID } = window.Appwrite || {};

// ==========================================================================
// 1. STATE MANAGEMENT & ENVIRONMENT CONFIG
// ==========================================================================
const AppState = {
  isMockMode: false,
  currentUser: null,
  activeView: 'view-dashboard',
  
  // Cache storage lists
  batches: [],
  students: [],
  teachers: [],
  materials: [],
  chats: [],
  courses: [],
  enrollments: [],
  announcements: [],
  transactions: [],
  coupons: [],

  // Chart instances
  trendChart: null,
  pieChart: null
};

const AppwriteConfig = window.AppwriteConfig || {
  endpoint: 'https://fra.cloud.appwrite.io/v1',
  projectId: '',
  databaseId: '',
  collections: {
    users: 'users',
    batches: 'batches',
    materials: 'materials',
    chats: 'chats',
    courses: 'courses',
    enrollments: 'enrollments',
    announcements: 'announcements',
    transactions: 'transactions',
    coupons: 'coupons'
  }
};

let appwriteClient = null;
let appwriteAccount = null;
let appwriteDatabases = null;

// ==========================================================================
// 2. MOCK DATABASE ENGINE (LocalStorage Persistence)
// ==========================================================================
const MockDB = {
  initialize() {
    if (!localStorage.getItem('hq_mock_batches')) {
      localStorage.setItem('hq_mock_batches', JSON.stringify([
        { batchId: 'b_1', name: 'Physics Honors 2026', subject: 'Physics', code: 'PHY101', teacherId: 'admin_hq', teacherName: 'Sanskar Admin', createdAt: '2026-01-15T10:00:00Z', description: 'Advanced electromagnetic theory and kinematics.', schedule: 'Mon, Wed, Fri - 4:00 PM', isAccessEnabled: true },
        { batchId: 'b_2', name: 'Calculus Advanced', subject: 'Mathematics', code: 'MAT202', teacherId: 't_1', teacherName: 'Prof. Verma', createdAt: '2026-02-10T12:00:00Z', description: 'Differential equations, integrations, and limits.', schedule: 'Tue, Thu - 5:00 PM', isAccessEnabled: true },
        { batchId: 'b_3', name: 'Organic Chemistry Fundamentals', subject: 'Chemistry', code: 'CHE303', teacherId: 't_2', teacherName: 'Dr. Mehta', createdAt: '2026-03-01T14:30:00Z', description: 'Hydrocarbon reactions, IUPAC naming, and synthesis.', schedule: 'Sat, Sun - 10:00 AM', isAccessEnabled: false }
      ]));
    } else {
      let currentBatches = JSON.parse(localStorage.getItem('hq_mock_batches') || '[]');
      let updated = false;
      const b2 = currentBatches.find(b => b.batchId === 'b_2');
      if (b2 && b2.teacherId === 'admin_hq') {
        b2.teacherId = 't_1';
        updated = true;
      }
      const b3 = currentBatches.find(b => b.batchId === 'b_3');
      if (b3 && b3.teacherId === 'admin_hq') {
        b3.teacherId = 't_2';
        updated = true;
      }
      if (updated) {
        localStorage.setItem('hq_mock_batches', JSON.stringify(currentBatches));
      }
    }
    if (!localStorage.getItem('hq_mock_users')) {
      localStorage.setItem('hq_mock_users', JSON.stringify([
        { userId: 'admin_hq', name: 'Sanskar Admin', email: 'sanskar@tuitionapp.com', role: 'admin', joinedAt: '2025-12-01T09:00:00Z', isBanned: false },
        { userId: 'std_1', name: 'John Doe', email: 'john.doe@gmail.com', role: 'student', joinedAt: '2026-01-20T11:00:00Z', isBanned: false },
        { userId: 'std_2', name: 'Jane Smith', email: 'jane.smith@gmail.com', role: 'student', joinedAt: '2026-02-15T09:30:00Z', isBanned: false },
        { userId: 'std_3', name: 'Robert Chen', email: 'robert.chen@gmail.com', role: 'student', joinedAt: '2026-03-10T15:00:00Z', isBanned: true },
        { userId: 'std_4', name: 'Emily Davis', email: 'emily.davis@gmail.com', role: 'student', joinedAt: '2026-04-05T10:00:00Z', isBanned: false },
        { userId: 'std_madhav', name: 'Madhav Sharma', email: 'madhav@gmail.com', role: 'student', joinedAt: '2026-05-01T10:00:00Z', isBanned: false },
        { userId: 't_1', name: 'Prof. Verma', email: 'verma@tuitionapp.com', role: 'teacher', joinedAt: '2026-01-15T10:00:00Z', isBanned: false },
        { userId: 't_2', name: 'Dr. Mehta', email: 'mehta@tuitionapp.com', role: 'teacher', joinedAt: '2026-02-10T12:00:00Z', isBanned: false }
      ]));
    } else {
      let currentUsers = JSON.parse(localStorage.getItem('hq_mock_users') || '[]');
      let updated = false;
      if (!currentUsers.some(u => u.userId === 'admin_hq')) {
        currentUsers.push({ userId: 'admin_hq', name: 'Sanskar Admin', email: 'sanskar@tuitionapp.com', role: 'admin', joinedAt: '2025-12-01T09:00:00Z', isBanned: false });
        updated = true;
      }
      if (!currentUsers.some(u => u.userId === 'std_madhav')) {
        currentUsers.push({ userId: 'std_madhav', name: 'Madhav Sharma', email: 'madhav@gmail.com', role: 'student', joinedAt: '2026-05-01T10:00:00Z', isBanned: false });
        updated = true;
      }
      if (!currentUsers.some(u => u.userId === 't_1')) {
        currentUsers.push({ userId: 't_1', name: 'Prof. Verma', email: 'verma@tuitionapp.com', role: 'teacher', joinedAt: '2026-01-15T10:00:00Z', isBanned: false });
        updated = true;
      }
      if (!currentUsers.some(u => u.userId === 't_2')) {
        currentUsers.push({ userId: 't_2', name: 'Dr. Mehta', email: 'mehta@tuitionapp.com', role: 'teacher', joinedAt: '2026-02-10T12:00:00Z', isBanned: false });
        updated = true;
      }
      if (updated) {
        localStorage.setItem('hq_mock_users', JSON.stringify(currentUsers));
      }
    }
    if (!localStorage.getItem('hq_mock_enrollments')) {
      localStorage.setItem('hq_mock_enrollments', JSON.stringify([
        { id: 'e_1', batchId: 'b_1', studentId: 'std_1', joinedAt: '2026-01-21T10:00:00Z', subscriptionExpiresAt: '2026-09-01T23:59:59Z', subscriptionPlan: '3_months' },
        { id: 'e_2', batchId: 'b_1', studentId: 'std_2', joinedAt: '2026-02-16T12:00:00Z', subscriptionExpiresAt: '2026-05-15T23:59:59Z', subscriptionPlan: 'expired' },
        { id: 'e_3', batchId: 'b_2', studentId: 'std_3', joinedAt: '2026-03-11T16:00:00Z', subscriptionExpiresAt: '2026-12-01T23:59:59Z', subscriptionPlan: '6_months' },
        { id: 'e_4', batchId: 'b_3', studentId: 'std_4', joinedAt: '2026-04-06T11:00:00Z', subscriptionExpiresAt: '2026-06-10T23:59:59Z', subscriptionPlan: 'expired' },
        { id: 'e_madhav_1', batchId: 'b_1', studentId: 'std_madhav', joinedAt: '2026-05-01T10:15:00Z', subscriptionExpiresAt: '2026-09-01T23:59:59Z', subscriptionPlan: '3_months' },
        { id: 'e_madhav_2', batchId: 'b_2', studentId: 'std_madhav', joinedAt: '2026-05-01T10:20:00Z', subscriptionExpiresAt: '2026-06-01T23:59:59Z', subscriptionPlan: 'expired' }
      ]));
    } else {
      // Ensure Madhav's enrollments exist even if hq_mock_enrollments is already in localStorage
      let currentEnrollments = JSON.parse(localStorage.getItem('hq_mock_enrollments') || '[]');
      if (!currentEnrollments.some(e => e.studentId === 'std_madhav')) {
        currentEnrollments.push(
          { id: 'e_madhav_1', batchId: 'b_1', studentId: 'std_madhav', joinedAt: '2026-05-01T10:15:00Z', subscriptionExpiresAt: '2026-09-01T23:59:59Z', subscriptionPlan: '3_months' },
          { id: 'e_madhav_2', batchId: 'b_2', studentId: 'std_madhav', joinedAt: '2026-05-01T10:20:00Z', subscriptionExpiresAt: '2026-06-01T23:59:59Z', subscriptionPlan: 'expired' }
        );
        localStorage.setItem('hq_mock_enrollments', JSON.stringify(currentEnrollments));
      }
    }
    if (!localStorage.getItem('hq_mock_materials')) {
      localStorage.setItem('hq_mock_materials', JSON.stringify([
        { materialId: 'm_1', batchId: 'b_1', title: 'Electromagnetism Lecture 1', description: 'Coulomb Law and static charges overview', fileUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', fileType: 'video', createdAt: '2026-01-22T09:00:00Z', viewsCount: 142, isDraft: false, tags: 'Core NCERT' },
        { materialId: 'm_2', batchId: 'b_2', title: 'Calculus derivatives cheat sheet', description: 'Standard derivative formulas with practice templates', fileUrl: 'https://pdfobject.com/pdf/sample.pdf', fileType: 'pdf', createdAt: '2026-02-12T14:00:00Z', viewsCount: 89, isDraft: false, tags: 'Revision Summary' },
        { materialId: 'm_3', batchId: 'b_3', title: 'Alkane & Alkene Synthesis Notes', description: 'Review summary of reaction triggers', fileUrl: 'https://pdfobject.com/pdf/sample.pdf', fileType: 'pdf', createdAt: '2026-03-05T10:00:00Z', viewsCount: 12, isDraft: true, tags: 'Advanced Organic' }
      ]));
    }
    if (!localStorage.getItem('hq_mock_chats')) {
      localStorage.setItem('hq_mock_chats', JSON.stringify([
        { messageId: 'c_1', batchId: 'b_1', senderId: 'std_1', senderName: 'John Doe', senderRole: 'student', content: 'Is the assignment due by Friday night or Saturday morning?', createdAt: '2026-06-15T12:00:00Z' },
        { messageId: 'c_2', batchId: 'b_1', senderId: 'admin_hq', senderName: 'Sanskar Admin', senderRole: 'admin', content: 'Please submit it before Friday 5:00 PM to ensure grading.', createdAt: '2026-06-15T12:05:00Z' },
        { messageId: 'c_3', batchId: 'b_1', senderId: 'std_2', senderName: 'Jane Smith', senderRole: 'student', content: 'Got it, thanks! Ready to upload.', createdAt: '2026-06-15T12:15:00Z' },
        { messageId: 'c_4', batchId: 'b_2', senderId: 'std_3', senderName: 'Robert Chen', senderRole: 'student', content: 'Can anyone help explain derivative index rule #4?', createdAt: '2026-06-16T09:00:00Z' }
      ]));
    }
    if (!localStorage.getItem('hq_mock_courses')) {
      localStorage.setItem('hq_mock_courses', JSON.stringify([
        { courseId: 'crs_1', title: 'Organic Chemistry Masterclass', description: 'A complete video syllabus teaching carbon pathways, IUPAC formatting, and synthesis formulas.', coverImage: 'https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?w=450', price: 49.99, teacherId: 'admin_hq', contentSummary: '15 lectures • 4 mock tests • syllabus notes', createdAt: '2026-02-01T10:00:00Z', isDraft: false },
        { courseId: 'crs_2', title: 'High School Physics Boot Camp', description: 'Quick revision course for mechanics, kinematics, and circuit electricity models.', coverImage: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=450', price: 39.99, teacherId: 'admin_hq', contentSummary: '10 lectures • 3 quizzes', createdAt: '2026-02-15T11:00:00Z', isDraft: false }
      ]));
    }
    if (!localStorage.getItem('hq_mock_transactions')) {
      localStorage.setItem('hq_mock_transactions', JSON.stringify([
        { id: 'tx_1', studentName: 'John Doe', studentEmail: 'john.doe@gmail.com', courseTitle: 'Organic Chemistry Masterclass', amount: 49.99, promoApplied: 'NONE', timestamp: '2026-06-14T10:00:00Z' },
        { id: 'tx_2', studentName: 'Jane Smith', studentEmail: 'jane.smith@gmail.com', courseTitle: 'High School Physics Boot Camp', amount: 19.99, promoApplied: 'HALFPRICE', timestamp: '2026-06-15T15:30:00Z' }
      ]));
    }
    if (!localStorage.getItem('hq_mock_coupons')) {
      localStorage.setItem('hq_mock_coupons', JSON.stringify([
        { id: 'cp_1', code: 'HALFPRICE', discount: 50, isActive: true },
        { id: 'cp_2', code: 'WELCOME10', discount: 10, isActive: true },
        { id: 'cp_3', code: 'EXPIRED20', discount: 20, isActive: false }
      ]));
    }
    if (!localStorage.getItem('hq_mock_teacher_attendance')) {
      const today = new Date().toISOString().split('T')[0];
      localStorage.setItem('hq_mock_teacher_attendance', JSON.stringify([
        { teacherId: 't_1', teacherName: 'Prof. Verma', date: today, status: 'present', notes: 'Checked in at 9:00 AM' },
        { teacherId: 't_2', teacherName: 'Dr. Mehta', date: today, status: 'late', notes: '15 mins late' }
      ]));
    }
  },

  get(key) {
    return JSON.parse(localStorage.getItem(`hq_mock_${key}`) || '[]');
  },

  set(key, data) {
    localStorage.setItem(`hq_mock_${key}`, JSON.stringify(data));
  }
};

// ==========================================================================
// 3. TOAST MESSENGER SYSTEM
// ==========================================================================
const Toast = {
  show(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-check-circle';
    if (type === 'danger') icon = 'fa-exclamation-triangle';
    if (type === 'warning') icon = 'fa-bell';

    toast.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px;">
        <i class="fa-solid ${icon}"></i>
        <span>${message}</span>
      </div>
      <button class="toast-close"><i class="fa-solid fa-xmark"></i></button>
    `;

    container.appendChild(toast);

    toast.querySelector('.toast-close').addEventListener('click', () => {
      toast.remove();
    });

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
};

// ==========================================================================
// 4. LIVE APPWRITE DATABASE BRIDGE
// ==========================================================================
function initAppwrite() {
  if (!window.Appwrite) {
    console.error('Appwrite SDK not found');
    return false;
  }
  if (!AppwriteConfig.projectId) {
    console.warn('Appwrite Project ID is not configured. Live DB functions will not work.');
    return false;
  }
  try {
    appwriteClient = new Client()
      .setEndpoint(AppwriteConfig.endpoint)
      .setProject(AppwriteConfig.projectId);
    
    appwriteAccount = new Account(appwriteClient);
    appwriteDatabases = new Databases(appwriteClient);
    return true;
  } catch (e) {
    console.error('Appwrite initialization error:', e);
    return false;
  }
}

// Helper: safe wrapper for DB calls
async function callLiveDB(action, ...args) {
  try {
    return await action(...args);
  } catch (e) {
    console.error('Database connection error:', e);
    Toast.show(`Live Database Error: ${e.message || e}`, 'danger');
    throw e;
  }
}

// Helper: Generates a custom unique ID locally to synchronize Auth and DB accounts
function generateUniqueID() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 20; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Helper: Creates a user account in Appwrite Auth as a guest fetch request to avoid current session lockout
async function createAppwriteAuthAccount(userId, email, password, name) {
  try {
    const response = await fetch(`${AppwriteConfig.endpoint}/account`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': AppwriteConfig.projectId
      },
      credentials: 'omit',
      body: JSON.stringify({
        userId: userId,
        email: email,
        password: password,
        name: name
      })
    });
    
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || 'Failed to register authentication account.');
    }
    return await response.json();
  } catch (err) {
    console.error('Appwrite Auth registration failed:', err);
    throw err;
  }
}

// Resilient Appwrite Document Creation Helper (automatically omits unknown schema attributes dynamically)
async function resilientCreate(collectionId, documentId, data) {
  let payload = { ...data };
  while (true) {
    try {
      return await appwriteDatabases.createDocument(
        AppwriteConfig.databaseId,
        collectionId,
        documentId,
        payload
      );
    } catch (err) {
      if (err.message && err.message.includes('Unknown attribute')) {
        const match = err.message.match(/attribute:\s*"?([^"\s]+)"?/i);
        if (match && match[1]) {
          const attr = match[1].replace(/['"]/g, '').trim();
          delete payload[attr];
          console.warn(`Omitted unknown attribute "${attr}" and retrying Appwrite creation...`);
          continue;
        }
      }
      throw err;
    }
  }
}

// Resilient Appwrite Document Update Helper (automatically omits unknown schema attributes dynamically)
async function resilientUpdate(collectionId, documentId, data) {
  let payload = { ...data };
  while (true) {
    try {
      return await appwriteDatabases.updateDocument(
        AppwriteConfig.databaseId,
        collectionId,
        documentId,
        payload
      );
    } catch (err) {
      if (err.message && err.message.includes('Unknown attribute')) {
        const match = err.message.match(/attribute:\s*"?([^"\s]+)"?/i);
        if (match && match[1]) {
          const attr = match[1].replace(/['"]/g, '').trim();
          delete payload[attr];
          console.warn(`Omitted unknown attribute "${attr}" and retrying Appwrite update...`);
          continue;
        }
      }
      throw err;
    }
  }
}

// ==========================================================================
// 5. LIVE & MOCK DATA CONTROLLER METHODS
// ==========================================================================
const DB = {
  // Login Authentication
  async authenticate(email, password) {
    if (AppState.isMockMode) {
      // Mock Login
      const users = MockDB.get('users');
      let found = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.role === 'admin');
      if (!found) {
        // Auto-create a mock admin profile on any valid authentication input for dev convenience
        const namePart = email.split('@')[0];
        const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1) + ' Admin';
        found = {
          userId: 'admin_' + Date.now(),
          name: formattedName,
          email: email.toLowerCase(),
          role: 'admin',
          joinedAt: new Date().toISOString(),
          isBanned: false
        };
        users.push(found);
        MockDB.set('users', users);
      }
      AppState.currentUser = found;
      return found;
    } else {
      // Appwrite Login
      if (!appwriteClient && !initAppwrite()) {
        throw new Error('Appwrite could not be initialized. Please configure config.js first.');
      }
      
      // Clear current sessions
      try {
        await appwriteAccount.deleteSession('current');
      } catch (_) {}

      // Login trigger
      let session;
      if (typeof appwriteAccount.createEmailPasswordSession === 'function') {
        session = await appwriteAccount.createEmailPasswordSession(email, password);
      } else {
        session = await appwriteAccount.createEmailSession(email, password);
      }

      // Check role
      const user = await appwriteAccount.get();
      const profile = await appwriteDatabases.getDocument(
        AppwriteConfig.databaseId,
        AppwriteConfig.collections.users,
        user.$id
      );

      if (profile.role !== 'admin') {
        await appwriteAccount.deleteSession('current');
        throw new Error('Access denied. This dashboard is reserved for Admins only.');
      }

      AppState.currentUser = {
        userId: profile.$id,
        name: profile.name,
        email: profile.email,
        role: profile.role,
        joinedAt: profile.joinedAt
      };
      return AppState.currentUser;
    }
  },

  // Logout
  async signout() {
    if (!AppState.isMockMode && appwriteAccount) {
      try {
        await appwriteAccount.deleteSession('current');
      } catch (e) {
        console.error('Session delete error', e);
      }
    }
    AppState.currentUser = null;
    localStorage.removeItem('hq_session_is_mock');
    localStorage.removeItem('hq_session_user');
    document.body.className = 'auth-mode';
    Toast.show('Session closed successfully.', 'info');
  },

  // Pull All Data for Cache synchronization
  async syncAllData() {
    if (AppState.isMockMode) {
      AppState.batches = MockDB.get('batches');
      
      const rawStudents = MockDB.get('users').filter(u => u.role === 'student');
      const studentMap = new Map();
      rawStudents.forEach(s => {
        const key = (s.userId || s.email || '').toLowerCase();
        if (!studentMap.has(key)) studentMap.set(key, s);
      });
      AppState.students = Array.from(studentMap.values());

      AppState.teachers = MockDB.get('users').filter(u => u.role === 'teacher');
      AppState.materials = MockDB.get('materials');
      AppState.chats = MockDB.get('chats');
      AppState.courses = MockDB.get('courses');

      const rawEnrollments = MockDB.get('enrollments');
      const enrollMap = new Map();
      rawEnrollments.forEach(e => {
        const key = `${e.studentId}_${e.batchId}`;
        if (!enrollMap.has(key)) {
          enrollMap.set(key, e);
        } else {
          const existing = enrollMap.get(key);
          const existingTime = new Date(existing.subscriptionExpiresAt || existing.joinedAt || 0).getTime();
          const newTime = new Date(e.subscriptionExpiresAt || e.joinedAt || 0).getTime();
          if (newTime > existingTime) enrollMap.set(key, e);
        }
      });
      AppState.enrollments = Array.from(enrollMap.values());

      AppState.announcements = MockDB.get('announcements');
      AppState.transactions = MockDB.get('transactions');
      AppState.coupons = MockDB.get('coupons');
      AppState.teacherAttendance = MockDB.get('teacher_attendance');
    } else {
      // Fetch Live collections
      const promises = [
        appwriteDatabases.listDocuments(AppwriteConfig.databaseId, AppwriteConfig.collections.batches),
        appwriteDatabases.listDocuments(AppwriteConfig.databaseId, AppwriteConfig.collections.users, [Query.equal('role', 'student')]),
        appwriteDatabases.listDocuments(AppwriteConfig.databaseId, AppwriteConfig.collections.users, [Query.equal('role', 'teacher')]),
        appwriteDatabases.listDocuments(AppwriteConfig.databaseId, AppwriteConfig.collections.materials),
        appwriteDatabases.listDocuments(AppwriteConfig.databaseId, AppwriteConfig.collections.chats),
        appwriteDatabases.listDocuments(AppwriteConfig.databaseId, AppwriteConfig.collections.courses),
        appwriteDatabases.listDocuments(AppwriteConfig.databaseId, AppwriteConfig.collections.enrollments),
        appwriteDatabases.listDocuments(AppwriteConfig.databaseId, AppwriteConfig.collections.announcements)
      ];

      // Dynamic collection checks to avoid crashing if transactions/coupons collections don't exist
      const txPromise = appwriteDatabases.listDocuments(AppwriteConfig.databaseId, AppwriteConfig.collections.transactions)
        .catch(err => {
          console.warn('Transactions collection not found or accessible in Appwrite database.', err);
          return { documents: [] };
        });
      const cpPromise = appwriteDatabases.listDocuments(AppwriteConfig.databaseId, AppwriteConfig.collections.coupons)
        .catch(err => {
          console.warn('Coupons collection not found or accessible in Appwrite database.', err);
          return { documents: [] };
        });
      const taPromise = appwriteDatabases.listDocuments(AppwriteConfig.databaseId, 'teacher_attendance')
        .catch(err => {
          console.warn('teacher_attendance collection not found or accessible in Appwrite database.', err);
          return { documents: [] };
        });

      promises.push(txPromise, cpPromise, taPromise);

      const [
        batchesDoc, studentsDoc, teachersDoc, materialsDoc, chatsDoc, coursesDoc, enrollmentsDoc, announcementsDoc, transactionsDoc, couponsDoc, teacherAttendanceDoc
      ] = await Promise.all(promises);

      // Map doc entries with deduplication
      AppState.batches = batchesDoc.documents.map(d => ({ ...d, batchId: d.$id }));
      
      const studentMap = new Map();
      studentsDoc.documents.forEach(d => {
        const item = { ...d, userId: d.$id };
        if (!item.isDeleted && item.role !== 'deleted') {
          const key = (item.userId || item.email || '').toLowerCase();
          if (!studentMap.has(key)) studentMap.set(key, item);
        }
      });
      AppState.students = Array.from(studentMap.values());

      AppState.teachers = teachersDoc.documents.map(d => ({ ...d, userId: d.$id })).filter(t => !t.isDeleted && t.role !== 'deleted');
      AppState.materials = materialsDoc.documents.map(d => ({ ...d, materialId: d.$id }));
      AppState.chats = chatsDoc.documents.map(d => ({ ...d, messageId: d.$id }));
      AppState.courses = coursesDoc.documents.map(d => ({ ...d, courseId: d.$id }));
      
      const enrollMap = new Map();
      enrollmentsDoc.documents.forEach(d => {
        const item = { ...d, id: d.$id };
        const key = `${item.studentId}_${item.batchId}`;
        if (!enrollMap.has(key)) {
          enrollMap.set(key, item);
        } else {
          const existing = enrollMap.get(key);
          const existingTime = new Date(existing.subscriptionExpiresAt || existing.joinedAt || 0).getTime();
          const newTime = new Date(item.subscriptionExpiresAt || item.joinedAt || 0).getTime();
          if (newTime > existingTime) enrollMap.set(key, item);
        }
      });
      AppState.enrollments = Array.from(enrollMap.values());

      AppState.announcements = announcementsDoc.documents.map(d => ({ ...d, announcementId: d.$id }));
      AppState.transactions = transactionsDoc.documents.map(d => ({ ...d, id: d.$id }));
      AppState.coupons = couponsDoc.documents.map(d => ({ ...d, id: d.$id }));
      AppState.teacherAttendance = teacherAttendanceDoc.documents.map(d => ({ ...d, id: d.$id }));
    }
  },

  // CRUD: Create Batch
  async createBatch(name, subject, description, code, schedule = '', teacherId = '', teacherName = '') {
    if (AppState.isMockMode) {
      const batches = MockDB.get('batches');
      if (batches.some(b => b.code.toUpperCase() === code.toUpperCase())) {
        throw new Error('A batch with this enrollment code already exists.');
      }
      const newBatch = {
        batchId: 'b_' + Date.now(),
        name,
        subject,
        description,
        code: code.toUpperCase(),
        teacherId: teacherId || (AppState.currentUser ? AppState.currentUser.userId : 'admin_hq'),
        teacherName: teacherName || (AppState.currentUser ? AppState.currentUser.name : 'Sanskar Admin'),
        schedule: schedule || 'TBD',
        isAccessEnabled: true,
        createdAt: new Date().toISOString()
      };
      batches.push(newBatch);
      MockDB.set('batches', batches);
      return newBatch;
    } else {
      const id = ID.unique();
      const payload = {
        name,
        description,
        subject,
        code: code.toUpperCase(),
        teacherId: teacherId || (AppState.currentUser ? AppState.currentUser.userId : 'admin_hq'),
        teacherName: teacherName || (AppState.currentUser ? AppState.currentUser.name : 'Sanskar Admin'),
        schedule: schedule || 'TBD',
        isAccessEnabled: true,
        createdAt: new Date().toISOString()
      };
      return await resilientCreate(AppwriteConfig.collections.batches, id, payload);
    }
  },

  // CRUD: Update Batch
  async updateBatch(batchId, name, subject, description, code, schedule = '', teacherId = '', teacherName = '') {
    const payload = {
      name,
      description,
      subject,
      code: code.toUpperCase(),
      schedule,
      teacherId: teacherId || (AppState.currentUser ? AppState.currentUser.userId : 'admin_hq'),
      teacherName: teacherName || (AppState.currentUser ? AppState.currentUser.name : 'Sanskar Admin')
    };
    if (AppState.isMockMode) {
      const batches = MockDB.get('batches');
      const idx = batches.findIndex(b => b.batchId === batchId);
      if (idx !== -1) {
        batches[idx] = { ...batches[idx], ...payload };
        MockDB.set('batches', batches);
      }
    } else {
      await resilientUpdate(AppwriteConfig.collections.batches, batchId, payload);
    }
  },

  // CRUD: Delete Batch
  async deleteBatch(batchId) {
    if (AppState.isMockMode) {
      let batches = MockDB.get('batches');
      batches = batches.filter(b => b.batchId !== batchId);
      MockDB.set('batches', batches);
    } else {
      await appwriteDatabases.deleteDocument(
        AppwriteConfig.databaseId,
        AppwriteConfig.collections.batches,
        batchId
      );
    }
  },

  // CRUD: Toggle Batch Access (Enable/Disable access for all students in the batch)
  async toggleBatchAccess(batchId, targetState) {
    if (AppState.isMockMode) {
      const batches = MockDB.get('batches');
      const idx = batches.findIndex(b => b.batchId === batchId);
      if (idx !== -1) {
        batches[idx].isAccessEnabled = targetState;
        MockDB.set('batches', batches);
      }
    } else {
      try {
        await resilientUpdate(
          AppwriteConfig.collections.batches,
          batchId,
          { isAccessEnabled: targetState }
        );
      } catch (e) {
        console.error('Failed to toggle live batch access', e);
        Toast.show('Failed to toggle live batch access. Make sure the "isAccessEnabled" boolean attribute is added to the "batches" collection in Appwrite Console settings.', 'danger');
        throw e;
      }
    }
  },

  // CRUD: Update Student Access Plan
  async updateStudentAccess(batchId, studentId, isEnabled, plan, expiryDate) {
    if (AppState.isMockMode) {
      const enrollments = MockDB.get('enrollments');
      const idx = enrollments.indexWhere ? enrollments.indexWhere(e => e.batchId === batchId && e.studentId === studentId) : enrollments.findIndex(e => e.batchId === batchId && e.studentId === studentId);
      
      const formattedExpiry = isEnabled 
        ? new Date(expiryDate).toISOString() 
        : new Date(Date.now() - 86400000).toISOString(); // Expired yesterday

      if (idx !== -1) {
        enrollments[idx].subscriptionExpiresAt = formattedExpiry;
        enrollments[idx].subscriptionPlan = isEnabled ? plan : 'expired';
      } else {
        enrollments.push({
          id: 'e_' + Date.now(),
          batchId,
          studentId,
          joinedAt: new Date().toISOString(),
          subscriptionExpiresAt: formattedExpiry,
          subscriptionPlan: isEnabled ? plan : 'expired'
        });
      }
      MockDB.set('enrollments', enrollments);
    } else {
      // Find existing enrollment document
      const queryRes = await appwriteDatabases.listDocuments(
        AppwriteConfig.databaseId,
        AppwriteConfig.collections.enrollments,
        [Query.equal('batchId', batchId), Query.equal('studentId', studentId)]
      );

      const formattedExpiry = isEnabled 
        ? new Date(expiryDate).toISOString() 
        : new Date(Date.now() - 86400000).toISOString();

      const subPlan = isEnabled ? plan : 'expired';

      if (queryRes.documents.length > 0) {
        const docId = queryRes.documents[0].$id;
        await resilientUpdate(
          AppwriteConfig.collections.enrollments,
          docId,
          {
            subscriptionExpiresAt: formattedExpiry,
            subscriptionPlan: subPlan
          }
        );
      } else {
        await resilientCreate(
          AppwriteConfig.collections.enrollments,
          ID.unique(),
          {
            batchId,
            studentId,
            joinedAt: new Date().toISOString(),
            subscriptionExpiresAt: formattedExpiry,
            subscriptionPlan: subPlan
          }
        );
      }
    }
  },

  // CRUD: Create Student Profile
  async createStudent(name, email, password) {
    if (AppState.isMockMode) {
      const users = MockDB.get('users');
      if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        throw new Error('A student with this email address already exists.');
      }
      const newStudent = {
        userId: 'std_' + Date.now(),
        name,
        email,
        role: 'student',
        joinedAt: new Date().toISOString(),
        isBanned: false
      };
      users.push(newStudent);
      MockDB.set('users', users);
      return newStudent;
    } else {
      const id = generateUniqueID();
      // First register in Appwrite Auth
      await createAppwriteAuthAccount(id, email, password, name);

      const payload = {
        userId: id,
        name,
        email,
        role: 'student',
        joinedAt: new Date().toISOString(),
        isBanned: false
      };
      return await resilientCreate(AppwriteConfig.collections.users, id, payload);
    }
  },

  // CRUD: Update Student Profile (Name and Email)
  async updateStudentProfile(studentId, name, email) {
    if (AppState.isMockMode) {
      const users = MockDB.get('users');
      const idx = users.findIndex(u => u.userId === studentId);
      if (idx !== -1) {
        users[idx].name = name;
        users[idx].email = email;
        MockDB.set('users', users);
      }
    } else {
      await resilientUpdate(
        AppwriteConfig.collections.users,
        studentId,
        { name, email }
      );
    }
  },

  // CRUD: Wipe Student Profile and Enrollments
  async deleteStudent(studentId) {
    if (AppState.isMockMode) {
      let users = MockDB.get('users');
      users = users.filter(u => u.userId !== studentId);
      MockDB.set('users', users);

      let enrollments = MockDB.get('enrollments');
      enrollments = enrollments.filter(e => e.studentId !== studentId);
      MockDB.set('enrollments', enrollments);
    } else {
      await resilientUpdate(
        AppwriteConfig.collections.users,
        studentId,
        { role: 'deleted', isBanned: true }
      );

      try {
        const queryRes = await appwriteDatabases.listDocuments(
          AppwriteConfig.databaseId,
          AppwriteConfig.collections.enrollments,
          [Query.equal('studentId', studentId)]
        );
        for (const doc of queryRes.documents) {
          await appwriteDatabases.deleteDocument(
            AppwriteConfig.databaseId,
            AppwriteConfig.collections.enrollments,
            doc.$id
          );
        }
      } catch (e) {
        console.warn('Wiping enrollments failed or collection is empty', e);
      }
    }
  },

  // CRUD: Create Teacher Profile
  async createTeacher(name, email, password) {
    if (AppState.isMockMode) {
      const users = MockDB.get('users');
      if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        throw new Error('An educator with this email address already exists.');
      }
      const newTeacher = {
        userId: 't_' + Date.now(),
        name,
        email,
        role: 'teacher',
        joinedAt: new Date().toISOString(),
        isBanned: false
      };
      users.push(newTeacher);
      MockDB.set('users', users);
      return newTeacher;
    } else {
      const id = generateUniqueID();
      // First register in Appwrite Auth
      await createAppwriteAuthAccount(id, email, password, name);

      const payload = {
        userId: id,
        name,
        email,
        role: 'teacher',
        joinedAt: new Date().toISOString(),
        isBanned: false
      };
      return await resilientCreate(AppwriteConfig.collections.users, id, payload);
    }
  },

  // CRUD: Update Teacher Profile & Status
  async updateTeacher(teacherId, name, email, isBanned) {
    if (AppState.isMockMode) {
      const users = MockDB.get('users');
      const idx = users.findIndex(u => u.userId === teacherId);
      if (idx !== -1) {
        users[idx].name = name;
        users[idx].email = email;
        users[idx].isBanned = isBanned;
        MockDB.set('users', users);

        let batches = MockDB.get('batches');
        let updated = false;
        batches.forEach(b => {
          if (b.teacherId === teacherId) {
            b.teacherName = name;
            updated = true;
          }
        });
        if (updated) {
          MockDB.set('batches', batches);
        }
      }
    } else {
      const payload = {
        name,
        email,
        isBanned
      };
      await resilientUpdate(AppwriteConfig.collections.users, teacherId, payload);

      try {
        const queryRes = await appwriteDatabases.listDocuments(
          AppwriteConfig.databaseId,
          AppwriteConfig.collections.batches,
          [Query.equal('teacherId', teacherId)]
        );
        for (const doc of queryRes.documents) {
          await resilientUpdate(
            AppwriteConfig.collections.batches,
            doc.$id,
            { teacherName: name }
          );
        }
      } catch (e) {
        console.warn('Cascading teacherName updates failed', e);
      }
    }
  },

  // CRUD: Delete Teacher Profile (Cascades batches taught by them to default TBD values)
  async deleteTeacher(teacherId) {
    if (AppState.isMockMode) {
      let users = MockDB.get('users');
      users = users.filter(u => u.userId !== teacherId);
      MockDB.set('users', users);

      let batches = MockDB.get('batches');
      let updated = false;
      batches.forEach(b => {
        if (b.teacherId === teacherId) {
          b.teacherId = 'admin_hq';
          b.teacherName = 'TBD';
          updated = true;
        }
      });
      if (updated) {
        MockDB.set('batches', batches);
      }
    } else {
      await resilientUpdate(
        AppwriteConfig.collections.users,
        teacherId,
        { role: 'deleted', isBanned: true }
      );

      try {
        const queryRes = await appwriteDatabases.listDocuments(
          AppwriteConfig.databaseId,
          AppwriteConfig.collections.batches,
          [Query.equal('teacherId', teacherId)]
        );
        for (const doc of queryRes.documents) {
          await resilientUpdate(
            AppwriteConfig.collections.batches,
            doc.$id,
            {
              teacherId: 'admin_hq',
              teacherName: 'TBD'
            }
          );
        }
      } catch (e) {
        console.warn('Cascading teacher deletion in batches failed', e);
      }
    }
  },

  // CRUD: Publish Study Material
  async createMaterial(batchId, title, description, fileUrl, fileType, tags = '', isDraft = false) {
    if (AppState.isMockMode) {
      const materials = MockDB.get('materials');
      const newMat = {
        materialId: 'm_' + Date.now(),
        batchId,
        title,
        description,
        fileUrl,
        fileType,
        tags,
        isDraft,
        viewsCount: 0,
        createdAt: new Date().toISOString()
      };
      materials.push(newMat);
      MockDB.set('materials', materials);
      return newMat;
    } else {
      const id = ID.unique();
      const payload = {
        batchId,
        title,
        description,
        fileUrl,
        fileType,
        tags,
        isDraft,
        viewsCount: 0,
        createdAt: new Date().toISOString()
      };
      return await resilientCreate(
        AppwriteConfig.collections.materials,
        id,
        payload
      );
    }
  },

  // CRUD: Delete Material
  async deleteMaterial(materialId) {
    if (AppState.isMockMode) {
      let materials = MockDB.get('materials');
      materials = materials.filter(m => m.materialId !== materialId);
      MockDB.set('materials', materials);
    } else {
      await appwriteDatabases.deleteDocument(
        AppwriteConfig.databaseId,
        AppwriteConfig.collections.materials,
        materialId
      );
    }
  },

  // CRUD: Update Study Material
  async updateMaterial(materialId, batchId, title, description, fileUrl, fileType, tags = '', isDraft = false) {
    const payload = {
      batchId,
      title,
      description,
      fileUrl,
      fileType,
      tags,
      isDraft
    };
    if (AppState.isMockMode) {
      const materials = MockDB.get('materials');
      const idx = materials.findIndex(m => m.materialId === materialId);
      if (idx !== -1) {
        materials[idx] = { ...materials[idx], ...payload };
        MockDB.set('materials', materials);
      }
    } else {
      await resilientUpdate(
        AppwriteConfig.collections.materials,
        materialId,
        payload
      );
    }
  },

  // CRUD: Toggle Material Draft state quickly
  async toggleMaterialDraftState(materialId, isDraft) {
    if (AppState.isMockMode) {
      const materials = MockDB.get('materials');
      const idx = materials.findIndex(m => m.materialId === materialId);
      if (idx !== -1) {
        materials[idx].isDraft = isDraft;
        MockDB.set('materials', materials);
      }
    } else {
      await resilientUpdate(
        AppwriteConfig.collections.materials,
        materialId,
        { isDraft }
      );
    }
  },

  // CRUD: Increment Resource View Counter
  async incrementResourceViews(materialId) {
    if (AppState.isMockMode) {
      const materials = MockDB.get('materials');
      const idx = materials.findIndex(m => m.materialId === materialId);
      if (idx !== -1) {
        materials[idx].viewsCount = (materials[idx].viewsCount || 0) + 1;
        MockDB.set('materials', materials);
      }
    } else {
      try {
        const mat = AppState.materials.find(m => m.materialId === materialId);
        if (mat) {
          await resilientUpdate(
            AppwriteConfig.collections.materials,
            materialId,
            { viewsCount: (mat.viewsCount || 0) + 1 }
          );
        }
      } catch (_) {}
    }
  },

  // CRUD: Update Student Global Ban State
  async updateStudentBanState(studentId, isBanned) {
    if (AppState.isMockMode) {
      const users = MockDB.get('users');
      const idx = users.findIndex(u => u.userId === studentId);
      if (idx !== -1) {
        users[idx].isBanned = isBanned;
        MockDB.set('users', users);
      }
    } else {
      try {
        await resilientUpdate(
          AppwriteConfig.collections.users,
          studentId,
          { isBanned }
        );
      } catch (e) {
        console.error('Failed to update live user ban status', e);
        Toast.show('Failed to toggle ban status. If in Live Mode, make sure the "isBanned" boolean attribute exists on your "users" collection in Appwrite.', 'danger');
        throw e;
      }
    }
  },

  // CRUD: Create Promo Coupon
  async createCoupon(code, discount) {
    const uppercaseCode = code.toUpperCase();
    if (AppState.isMockMode) {
      const coupons = MockDB.get('coupons');
      if (coupons.some(c => c.code === uppercaseCode)) {
        throw new Error('A coupon with this code already exists.');
      }
      const newCp = {
        id: 'cp_' + Date.now(),
        code: uppercaseCode,
        discount: parseFloat(discount),
        isActive: true
      };
      coupons.push(newCp);
      MockDB.set('coupons', coupons);
      return newCp;
    } else {
      try {
        return await resilientCreate(
          AppwriteConfig.collections.coupons,
          ID.unique(),
          {
            code: uppercaseCode,
            discount: parseFloat(discount),
            isActive: true
          }
        );
      } catch (err) {
        console.error('Failed to create live coupon', err);
        Toast.show('Failed to save coupon in Live Mode. Make sure the "coupons" collection exists and has code/discount/isActive attributes.', 'danger');
        throw err;
      }
    }
  },

  // CRUD: Delete Promo Coupon
  async deleteCoupon(couponId) {
    if (AppState.isMockMode) {
      let coupons = MockDB.get('coupons');
      coupons = coupons.filter(c => c.id !== couponId);
      MockDB.set('coupons', coupons);
    } else {
      await appwriteDatabases.deleteDocument(
        AppwriteConfig.databaseId,
        AppwriteConfig.collections.coupons,
        couponId
      );
    }
  },

  // CRUD: Toggle Coupon Active State
  async toggleCouponState(couponId, isActive) {
    if (AppState.isMockMode) {
      const coupons = MockDB.get('coupons');
      const idx = coupons.findIndex(c => c.id === couponId);
      if (idx !== -1) {
        coupons[idx].isActive = isActive;
        MockDB.set('coupons', coupons);
      }
    } else {
      await resilientUpdate(
        AppwriteConfig.collections.coupons,
        couponId,
        { isActive }
      );
    }
  },

  // CRUD: Log Transaction checkout
  async logTransaction(studentName, studentEmail, courseTitle, amount, promoApplied = 'NONE') {
    if (AppState.isMockMode) {
      const transactions = MockDB.get('transactions');
      const newTx = {
        id: 'tx_' + Date.now(),
        studentName,
        studentEmail,
        courseTitle,
        amount: parseFloat(amount),
        promoApplied,
        timestamp: new Date().toISOString()
      };
      transactions.push(newTx);
      MockDB.set('transactions', transactions);
      return newTx;
    } else {
      try {
        return await resilientCreate(
          AppwriteConfig.collections.transactions,
          ID.unique(),
          {
            studentName,
            studentEmail,
            courseTitle,
            amount: parseFloat(amount),
            promoApplied,
            timestamp: new Date().toISOString()
          }
        );
      } catch (err) {
        console.warn('Could not save transaction log in Live Mode database.', err);
      }
    }
  },

  // CRUD: Delete Chat Message (Moderation)
  async deleteChatMessage(messageId) {
    if (AppState.isMockMode) {
      let chats = MockDB.get('chats');
      chats = chats.filter(c => c.messageId !== messageId);
      MockDB.set('chats', chats);
    } else {
      await appwriteDatabases.deleteDocument(
        AppwriteConfig.databaseId,
        AppwriteConfig.collections.chats,
        messageId
      );
    }
  },

  // CRUD: Create Announcement (Notice)
  async createAnnouncement(batchId, title, content) {
    const payload = {
      batchId,
      title,
      content,
      createdAt: new Date().toISOString()
    };

    if (AppState.isMockMode) {
      const announcements = MockDB.get('announcements');
      payload.announcementId = 'ann_' + Date.now();
      announcements.push(payload);
      MockDB.set('announcements', announcements);
      return payload;
    } else {
      const id = ID.unique();
      return await resilientCreate(
        AppwriteConfig.collections.announcements,
        id,
        payload
      );
    }
  },

  // CRUD: Delete Announcement (Notice)
  async deleteAnnouncement(announcementId) {
    if (AppState.isMockMode) {
      let announcements = MockDB.get('announcements');
      announcements = announcements.filter(a => a.announcementId !== announcementId);
      MockDB.set('announcements', announcements);
    } else {
      await appwriteDatabases.deleteDocument(
        AppwriteConfig.databaseId,
        AppwriteConfig.collections.announcements,
        announcementId
      );
    }
  },

  // CRUD: Update Announcement (Notice)
  async updateAnnouncement(announcementId, batchId, title, content) {
    const payload = {
      batchId,
      title,
      content
    };
    if (AppState.isMockMode) {
      const announcements = MockDB.get('announcements');
      const idx = announcements.findIndex(a => a.announcementId === announcementId);
      if (idx !== -1) {
        announcements[idx] = { ...announcements[idx], ...payload };
        MockDB.set('announcements', announcements);
      }
    } else {
      await resilientUpdate(
        AppwriteConfig.collections.announcements,
        announcementId,
        payload
      );
    }
  },

  // CRUD: Create or Edit Retail Course Store Item
  async upsertCourse(courseId, title, price, description, coverImage, contentSummary, isDraft = false) {
    const payload = {
      title,
      price: parseFloat(price) || 0.0,
      description,
      coverImage: coverImage || 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=450',
      contentSummary,
      isDraft,
      teacherId: AppState.currentUser.userId,
      createdAt: new Date().toISOString()
    };

    if (AppState.isMockMode) {
      const courses = MockDB.get('courses');
      if (courseId) {
        // Edit mode
        const idx = courses.findIndex(c => c.courseId === courseId);
        if (idx !== -1) {
          courses[idx] = { ...courses[idx], ...payload };
        }
      } else {
        // Create mode
        payload.courseId = 'crs_' + Date.now();
        courses.push(payload);
      }
      MockDB.set('courses', courses);
    } else {
      if (courseId) {
        await resilientUpdate(
          AppwriteConfig.collections.courses,
          courseId,
          payload
        );
      } else {
        await resilientCreate(
          AppwriteConfig.collections.courses,
          ID.unique(),
          payload
        );
      }
    }
  },

  // CRUD: Delete Retail Course Store Item
  async deleteCourse(courseId) {
    if (AppState.isMockMode) {
      let courses = MockDB.get('courses');
      courses = courses.filter(c => c.courseId !== courseId);
      MockDB.set('courses', courses);
    } else {
      await appwriteDatabases.deleteDocument(
        AppwriteConfig.databaseId,
        AppwriteConfig.collections.courses,
        courseId
      );
    }
  },

  // CRUD: Toggle Course Draft state
  async toggleCourseDraftState(courseId, isDraft) {
    if (AppState.isMockMode) {
      const courses = MockDB.get('courses');
      const idx = courses.findIndex(c => c.courseId === courseId);
      if (idx !== -1) {
        courses[idx].isDraft = isDraft;
        MockDB.set('courses', courses);
      }
    } else {
      try {
        await resilientUpdate(
          AppwriteConfig.collections.courses,
          courseId,
          { isDraft }
        );
      } catch (e) {
        console.error('Failed to toggle live course draft state', e);
        Toast.show('Failed to toggle draft status. Make sure the "isDraft" boolean attribute exists on your "courses" collection in Appwrite.', 'danger');
        throw e;
      }
    }
  },

  // Log Teacher Attendance
  async logTeacherAttendance(teacherId, date, status, notes = '') {
    if (AppState.isMockMode) {
      const attendance = MockDB.get('teacher_attendance');
      // Filter out existing matching records to update
      const filtered = attendance.filter(a => !(a.teacherId === teacherId && a.date === date));
      const teacher = AppState.teachers.find(t => t.userId === teacherId);
      const teacherName = teacher ? teacher.name : 'Tutor';
      
      filtered.push({
        teacherId,
        teacherName,
        date,
        status,
        notes
      });
      MockDB.set('teacher_attendance', filtered);
    } else {
      try {
        const queryRes = await appwriteDatabases.listDocuments(
          AppwriteConfig.databaseId,
          'teacher_attendance',
          [Query.equal('teacherId', teacherId), Query.equal('date', date)]
        );
        
        const payload = {
          teacherId,
          teacherName: AppState.teachers.find(t => t.userId === teacherId)?.name || 'Tutor',
          date,
          status,
          notes
        };
        
        if (queryRes.documents.length > 0) {
          await resilientUpdate(
            'teacher_attendance',
            queryRes.documents[0].$id,
            payload
          );
        } else {
          await resilientCreate(
            'teacher_attendance',
            ID.unique(),
            payload
          );
        }
      } catch (err) {
        console.error('Failed to log Appwrite teacher attendance:', err);
        throw err;
      }
    }
  }
};

// ==========================================================================
// 6. UI VIEW DRAWING & CHARTING CONTROLLER
// ==========================================================================
const UI = {
  // Populate Teacher Dropdown list for Batch Forms
  populateTeacherDropdown(selectedTeacherVal = '') {
    const select = document.getElementById('batch-teacher-name');
    if (!select) return;
    select.innerHTML = '';
    
    // Add default admin/TBD option if no teachers exist
    if (AppState.teachers.length === 0) {
      const option = document.createElement('option');
      option.value = AppState.currentUser ? AppState.currentUser.userId : 'admin_hq';
      option.text = AppState.currentUser ? AppState.currentUser.name : 'Sanskar Admin';
      select.appendChild(option);
      return;
    }
    
    AppState.teachers.forEach(teacher => {
      const option = document.createElement('option');
      option.value = teacher.userId;
      option.text = teacher.name + ` (${teacher.email})`;
      if (selectedTeacherVal && (teacher.userId === selectedTeacherVal || teacher.name.toLowerCase() === selectedTeacherVal.toLowerCase())) {
        option.selected = true;
      }
      select.appendChild(option);
    });
  },

  // Pack day selections and time input into the schedule string
  updateScheduleString() {
    const timeEl = document.getElementById('batch-time-picker');
    const scheduleEl = document.getElementById('batch-schedule');
    if (!timeEl || !scheduleEl) return;
    
    const selectedDays = [];
    document.querySelectorAll('.day-btn.active').forEach(btn => {
      selectedDays.push(btn.getAttribute('data-day'));
    });
    
    const timeVal = timeEl.value;
    if (selectedDays.length === 0 || !timeVal) {
      scheduleEl.value = '';
      return;
    }
    
    const [hours, minutes] = timeVal.split(':');
    let hh = parseInt(hours, 10);
    const ampm = hh >= 12 ? 'PM' : 'AM';
    hh = hh % 12;
    hh = hh ? hh : 12;
    const hhStr = hh < 10 ? '0' + hh : hh;
    const formattedTime = `${hhStr}:${minutes} ${ampm}`;
    
    scheduleEl.value = `${selectedDays.join(', ')} - ${formattedTime}`;
  },

  // Unpack schedule string back into day selections and time picker
  unpackScheduleString(scheduleStr) {
    document.querySelectorAll('.day-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    const timeEl = document.getElementById('batch-time-picker');
    const scheduleEl = document.getElementById('batch-schedule');
    if (timeEl) timeEl.value = '';
    if (scheduleEl) scheduleEl.value = scheduleStr || '';
    
    if (!scheduleStr) {
      if (timeEl) {
        ['Mon', 'Wed', 'Fri'].forEach(day => {
          const btn = document.querySelector(`.day-btn[data-day="${day}"]`);
          if (btn) btn.classList.add('active');
        });
        timeEl.value = '16:00';
        UI.updateScheduleString();
      }
      return;
    }
    
    const parts = scheduleStr.split(' - ');
    if (parts.length < 2) return;
    
    const days = parts[0].split(', ').map(d => d.trim());
    const time12h = parts[1].trim();
    
    days.forEach(day => {
      const btn = document.querySelector(`.day-btn[data-day="${day}"]`);
      if (btn) {
        btn.classList.add('active');
      }
    });
    
    const timeMatch = time12h.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (timeMatch && timeEl) {
      let hh = parseInt(timeMatch[1], 10);
      const mm = timeMatch[2];
      const ampm = timeMatch[3].toUpperCase();
      
      if (ampm === 'PM' && hh < 12) hh += 12;
      if (ampm === 'AM' && hh === 12) hh = 0;
      
      const hhStr = hh < 10 ? '0' + hh : hh;
      timeEl.value = `${hhStr}:${mm}`;
    }
  },

  // Navigation Routing Switcher
  switchView(viewId) {
    AppState.activeView = viewId;
    document.querySelectorAll('.content-view').forEach(view => {
      view.classList.remove('active');
    });
    const activeViewEl = document.getElementById(viewId);
    if (activeViewEl) activeViewEl.classList.add('active');

    document.querySelectorAll('.nav-item').forEach(item => {
      if (item.getAttribute('data-view') === viewId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    UI.renderActiveView();
  },

  // Render view router target
  renderActiveView() {
    switch (AppState.activeView) {
      case 'view-dashboard':
        UI.renderDashboard();
        break;
      case 'view-batches':
        UI.renderBatches();
        break;
      case 'view-students':
        UI.renderStudents();
        break;
      case 'view-materials':
        UI.renderMaterials();
        break;
      case 'view-moderation':
        UI.renderModeration();
        break;
      case 'view-notices':
        UI.renderNotices();
        break;
      case 'view-courses':
        UI.renderCourses();
        break;
      case 'view-teachers':
        UI.renderTeachers();
        break;
      case 'view-attendance':
        UI.renderAttendance();
        break;
    }
  },

  // Render: Main Analytics view
  renderDashboard() {
    // Stat numbers
    document.getElementById('stat-students').innerText = AppState.students.length;
    document.getElementById('stat-teachers').innerText = AppState.teachers.length;
    document.getElementById('stat-batches').innerText = AppState.batches.length;
    document.getElementById('stat-materials').innerText = AppState.materials.length;
    
    // Revenue calculator: active enrollment subscription plan pricing + store transactions checkout sum
    const planPrices = {
      '3_months': 1500,
      '5_months': 2200,
      '6_months': 2500,
      '1_year': 4500,
      'expired': 0
    };
    const enrollmentRev = AppState.enrollments
      .filter(e => e.subscriptionPlan !== 'expired')
      .reduce((sum, e) => sum + (planPrices[e.subscriptionPlan] || 0), 0);
      
    const transactionRev = AppState.transactions.reduce((sum, tx) => sum + (parseFloat(tx.amount) || 0), 0);
    const estimatedRev = enrollmentRev + transactionRev;
    document.getElementById('stat-revenue').innerText = `INR ${estimatedRev.toFixed(2)}`;

    // Draw Dashboard Charts
    UI.drawEnrollmentChart();
    UI.drawSubjectChart();

    // Render schedules list
    const scheduleListEl = document.getElementById('dashboard-schedule-list');
    if (scheduleListEl) {
      scheduleListEl.innerHTML = '';
      const batchesWithSchedules = AppState.batches.filter(b => b.schedule);
      if (batchesWithSchedules.length === 0) {
        scheduleListEl.innerHTML = `<p class="text-secondary text-center" style="font-size:12px;margin-top:20px;">No class schedules defined.</p>`;
      } else {
        batchesWithSchedules.forEach(batch => {
          const card = document.createElement('div');
          card.className = 'schedule-card';
          card.innerHTML = `
            <span class="schedule-title">${escapeHTML(batch.name)}</span>
            <span class="schedule-time"><i class="fa-regular fa-clock"></i> ${escapeHTML(batch.schedule)}</span>
            <span class="schedule-teacher"><i class="fa-regular fa-user"></i> ${escapeHTML(batch.teacherName || 'Educator')}</span>
          `;
          scheduleListEl.appendChild(card);
        });
      }
    }

    // Render Recent logs table (Unified Feed)
    const tbody = document.querySelector('#dashboard-recent-table tbody');
    if (tbody) {
      tbody.innerHTML = '';

      const eventLogs = [];

      // Add materials events
      AppState.materials.forEach(m => {
        eventLogs.push({
          type: 'material',
          title: m.title,
          batchId: m.batchId,
          createdAt: m.createdAt,
          fileType: m.fileType,
          isDraft: m.isDraft,
          publisher: 'RK Tutorial Admin'
        });
      });

      // Add notices events
      AppState.announcements.forEach(a => {
        eventLogs.push({
          type: 'notice',
          title: a.title,
          batchId: a.batchId,
          createdAt: a.createdAt,
          publisher: 'Broadcaster'
        });
      });

      // Add transactions events
      AppState.transactions.forEach(t => {
        eventLogs.push({
          type: 'transaction',
          title: `Purchased: ${t.courseTitle} (${t.studentName})`,
          batchId: 'store_checkout',
          createdAt: t.timestamp,
          amount: t.amount,
          publisher: `Promo: ${t.promoApplied || 'NONE'}`
        });
      });

      // Sort and slice
      const recentLogs = eventLogs
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);

      if (recentLogs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;" class="text-secondary">No recent system events logged.</td></tr>`;
        return;
      }

      recentLogs.forEach(item => {
        const batchName = item.batchId === 'store_checkout' 
          ? 'Store Checkout' 
          : (AppState.batches.find(b => b.batchId === item.batchId)?.name || 'General');
        
        const row = document.createElement('tr');
        const timeStr = new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        if (item.type === 'material') {
          row.innerHTML = `
            <td>
              <div style="display:flex; align-items:center; gap:8px;">
                <i class="fa-solid ${item.fileType === 'video' ? 'fa-circle-play text-amber' : 'fa-file-pdf text-red'}"></i>
                <strong>${escapeHTML(item.title)}</strong>
              </div>
            </td>
            <td>${escapeHTML(batchName)}</td>
            <td>${escapeHTML(item.publisher)}</td>
            <td>${timeStr}</td>
            <td><span class="badge ${item.isDraft ? 'badge-warning-glow' : 'badge-success'}">${item.isDraft ? 'Draft' : 'Published'}</span></td>
          `;
        } else if (item.type === 'notice') {
          row.innerHTML = `
            <td>
              <div style="display:flex; align-items:center; gap:8px;">
                <i class="fa-solid fa-bullhorn text-indigo"></i>
                <strong>Notice: ${escapeHTML(item.title)}</strong>
              </div>
            </td>
            <td>${escapeHTML(batchName)}</td>
            <td>${escapeHTML(item.publisher)}</td>
            <td>${timeStr}</td>
            <td><span class="badge badge-info">Broadcast</span></td>
          `;
        } else if (item.type === 'transaction') {
          row.innerHTML = `
            <td>
              <div style="display:flex; align-items:center; gap:8px;">
                <i class="fa-solid fa-wallet text-green"></i>
                <strong>${escapeHTML(item.title)}</strong>
              </div>
            </td>
            <td>Store Checkout</td>
            <td>${escapeHTML(item.publisher)}</td>
            <td>${timeStr}</td>
            <td><span class="badge badge-success">Paid (INR ${item.amount.toFixed(2)})</span></td>
          `;
        }
        tbody.appendChild(row);
      });
    }
  },

  // Draw Charts helpers
  drawEnrollmentChart() {
    const ctx = document.getElementById('enrollmentTrendChart');
    if (!ctx) return;

    if (AppState.trendChart) AppState.trendChart.destroy();

    // Aggregate enrollments by monthly join dates
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const counts = Array(12).fill(0);

    AppState.enrollments.forEach(e => {
      const mIdx = new Date(e.joinedAt).getMonth();
      counts[mIdx]++;
    });

    // Make smooth continuous scale helper
    let runningSum = 0;
    const trendData = counts.map(val => {
      runningSum += val;
      return runningSum;
    });

    AppState.trendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: months.slice(0, new Date().getMonth() + 1),
        datasets: [{
          label: 'Total Enrollments',
          data: trendData.slice(0, new Date().getMonth() + 1),
          borderColor: '#6366F1',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          fill: true,
          tension: 0.4,
          borderWidth: 3,
          pointRadius: 4,
          pointBackgroundColor: '#6366F1'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#9CA3AF' } },
          x: { grid: { display: false }, ticks: { color: '#9CA3AF' } }
        }
      }
    });
  },

  drawSubjectChart() {
    const ctx = document.getElementById('subjectPieChart');
    if (!ctx) return;

    if (AppState.pieChart) AppState.pieChart.destroy();

    const subjectsMap = {};
    AppState.batches.forEach(b => {
      const sub = b.subject || 'Other';
      subjectsMap[sub] = (subjectsMap[sub] || 0) + 1;
    });

    const labels = Object.keys(subjectsMap);
    const data = Object.values(subjectsMap);

    AppState.pieChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: ['#6366F1', '#06B6D4', '#F59E0B', '#10B981', '#EF4444', '#EC4899'],
          borderColor: '#151E2E',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#F3F4F6', boxWidth: 12 } }
        }
      }
    });
  },

  // Render: Batches List
  renderBatches() {
    const tbody = document.querySelector('#batches-table tbody');
    tbody.innerHTML = '';

    const filterVal = document.getElementById('search-batches').value.toLowerCase();
    const filtered = AppState.batches.filter(b => {
      return b.name.toLowerCase().includes(filterVal) ||
             b.subject.toLowerCase().includes(filterVal) ||
             b.code.toLowerCase().includes(filterVal);
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;" class="text-muted">No classes matching query found.</td></tr>`;
      return;
    }

    filtered.forEach(batch => {
      const row = document.createElement('tr');
      const timeStr = new Date(batch.createdAt).toLocaleDateString();
      const isAccessEnabled = batch.isAccessEnabled !== false;
      const statusBadge = isAccessEnabled 
        ? `<span class="badge badge-success">Enabled</span>` 
        : `<span class="badge badge-danger">Disabled</span>`;

      const teacherObj = AppState.teachers.find(t => t.userId === batch.teacherId);
      const displayTeacherName = teacherObj 
        ? teacherObj.name 
        : (batch.teacherId === (AppState.currentUser ? AppState.currentUser.userId : 'admin_hq') 
           ? (AppState.currentUser ? AppState.currentUser.name : 'Sanskar Admin') 
           : (batch.teacherName || 'TBD'));

      row.innerHTML = `
        <td><strong>${escapeHTML(batch.name)}</strong></td>
        <td><span class="badge badge-info">${escapeHTML(batch.subject)}</span></td>
        <td><code style="color:var(--secondary);font-size:14px;font-weight:700;">${escapeHTML(batch.code)}</code></td>
        <td><strong style="color:var(--text-primary);">${escapeHTML(displayTeacherName)}</strong></td>
        <td>${timeStr}</td>
        <td>${statusBadge}</td>
        <td>
          <div class="action-row-buttons">
            <button class="btn btn-secondary btn-mini btn-copy-code" data-code="${escapeHTML(batch.code)}">
              <i class="fa-solid fa-copy"></i> Join Link
            </button>
            <button class="btn ${isAccessEnabled ? 'btn-danger' : 'btn-success'} btn-mini btn-toggle-batch-access" 
                    data-id="${batch.batchId}" 
                    data-enabled="${isAccessEnabled ? 'false' : 'true'}"
                    title="${isAccessEnabled ? 'Suspend access for all students' : 'Restore access for all students'}">
              <i class="fa-solid ${isAccessEnabled ? 'fa-ban' : 'fa-circle-check'}"></i> 
              ${isAccessEnabled ? 'Suspend' : 'Resume'}
            </button>
            <button class="btn btn-primary btn-mini btn-edit-batch" 
                    data-id="${batch.batchId}" 
                    data-name="${escapeHTML(batch.name)}" 
                    data-subject="${escapeHTML(batch.subject)}" 
                    data-desc="${escapeHTML(batch.description || '')}" 
                    data-schedule="${escapeHTML(batch.schedule || '')}"
                    data-teacher-id="${escapeHTML(batch.teacherId || '')}"
                    data-teacher-name="${escapeHTML(displayTeacherName)}"
                    data-code="${escapeHTML(batch.code)}">
              <i class="fa-solid fa-pen"></i> Edit
            </button>
            <button class="btn btn-danger btn-mini btn-delete-batch" 
                    data-id="${batch.batchId}" 
                    data-name="${escapeHTML(batch.name)}">
              <i class="fa-solid fa-trash-can"></i> WIPE
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(row);
    });
  },

  renderStudents() {
    const tbody = document.querySelector('#students-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const searchVal = document.getElementById('search-students').value.toLowerCase();
    const filterPlan = document.getElementById('filter-students-plan').value;
    const filterStatus = document.getElementById('filter-students-status').value;

    const filtered = AppState.students.filter(student => {
      // Name or email filter
      const matchesSearch = student.name.toLowerCase().includes(searchVal) || student.email.toLowerCase().includes(searchVal);
      if (!matchesSearch) return false;

      // Status filter
      const isBanned = student.isBanned === true;
      if (filterStatus === 'active' && isBanned) return false;
      if (filterStatus === 'banned' && !isBanned) return false;

      // Access plan filter
      if (filterPlan === 'all') return true;

      // Find any batch enrollment for this student
      const userEnrollments = AppState.enrollments.filter(e => e.studentId === student.userId);
      const hasActive = userEnrollments.some(e => {
        const isExpired = new Date(e.subscriptionExpiresAt) < new Date();
        return e.subscriptionPlan !== 'expired' && !isExpired;
      });

      if (filterPlan === 'active') return hasActive;
      if (filterPlan === 'expired') return !hasActive || userEnrollments.length === 0;

      return true;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;" class="text-muted">No students matching parameters.</td></tr>`;
      return;
    }

    filtered.forEach(student => {
      // Find batch enrollments and deduplicate by batchId
      const rawEnrollments = AppState.enrollments.filter(e => e.studentId === student.userId);
      const enrollMap = new Map();
      rawEnrollments.forEach(e => {
        if (!enrollMap.has(e.batchId)) {
          enrollMap.set(e.batchId, e);
        } else {
          const existing = enrollMap.get(e.batchId);
          const existingTime = new Date(existing.subscriptionExpiresAt || existing.joinedAt || 0).getTime();
          const newTime = new Date(e.subscriptionExpiresAt || e.joinedAt || 0).getTime();
          if (newTime > existingTime) enrollMap.set(e.batchId, e);
        }
      });
      const studentEnrollments = Array.from(enrollMap.values());
      
      const accountStatusBadge = student.isBanned 
        ? `<span class="badge badge-danger-glow"><i class="fa-solid fa-user-slash"></i> Suspended</span>` 
        : `<span class="badge badge-success"><i class="fa-solid fa-user-check"></i> Active</span>`;

      if (studentEnrollments.length === 0) {
        // Render student without active batch
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>
            <div class="student-row-profile">
              <div class="avatar-circle">${student.name.substring(0, 1)}</div>
              <div class="info">
                <span class="name">${escapeHTML(student.name)}</span>
                <span class="joined">Joined: ${new Date(student.joinedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </td>
          <td>${escapeHTML(student.email)}</td>
          <td><span class="text-muted">No Batch Joined</span></td>
          <td><span class="badge badge-danger">Unenrolled</span></td>
          <td>--</td>
          <td>${accountStatusBadge}</td>
          <td>
            <div class="action-row-buttons">
              <button class="btn btn-secondary btn-mini btn-enroll-student-direct" data-student-id="${student.userId}">
                <i class="fa-solid fa-link"></i> Enroll to Batch
              </button>
              <button class="btn btn-primary btn-mini btn-edit-access" 
                      data-student-id="${student.userId}" 
                      data-batch-id="" 
                      data-name="${escapeHTML(student.name)}" 
                      data-email="${escapeHTML(student.email)}" 
                      data-plan="expired" 
                      data-expiry=""
                      data-banned="${student.isBanned ? 'true' : 'false'}"
                      data-enabled="false">
                <i class="fa-solid fa-user-gear"></i> Edit / Plan
              </button>
            </div>
          </td>
        `;
        tbody.appendChild(row);
        return;
      }

      studentEnrollments.forEach(enroll => {
        const batchName = AppState.batches.find(b => b.batchId === enroll.batchId)?.name || 'Classroom';
        const isExpired = new Date(enroll.subscriptionExpiresAt) < new Date();
        const plan = enroll.subscriptionPlan || 'expired';
        const expiryStr = new Date(enroll.subscriptionExpiresAt).toLocaleDateString();

        const statusBadge = (isExpired || plan === 'expired') 
          ? `<span class="badge badge-danger">Expired</span>` 
          : `<span class="badge badge-success">${plan.replace('_', ' ')}</span>`;

        const row = document.createElement('tr');
        row.innerHTML = `
          <td>
            <div class="student-row-profile">
              <div class="avatar-circle">${student.name.substring(0, 1)}</div>
              <div class="info">
                <span class="name">${escapeHTML(student.name)}</span>
                <span class="joined">Joined: ${new Date(student.joinedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </td>
          <td>${escapeHTML(student.email)}</td>
          <td><strong>${escapeHTML(batchName)}</strong></td>
          <td>${statusBadge}</td>
          <td>${isExpired ? `<span class="text-danger">${expiryStr}</span>` : `<span class="text-success">${expiryStr}</span>`}</td>
          <td>${accountStatusBadge}</td>
          <td>
            <div class="action-row-buttons">
              <button class="btn btn-primary btn-mini btn-edit-access" 
                      data-student-id="${student.userId}" 
                      data-batch-id="${enroll.batchId}" 
                      data-name="${escapeHTML(student.name)}" 
                      data-email="${escapeHTML(student.email)}" 
                      data-plan="${plan}" 
                      data-expiry="${enroll.subscriptionExpiresAt.split('T')[0]}"
                      data-banned="${student.isBanned ? 'true' : 'false'}"
                      data-enabled="${!(isExpired || plan === 'expired')}">
                <i class="fa-solid fa-user-gear"></i> Edit / Plan
              </button>
            </div>
          </td>
        `;
        tbody.appendChild(row);
      });
    });
  },

  renderTeachers() {
    const tbody = document.querySelector('#teachers-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const searchVal = document.getElementById('search-teachers').value.toLowerCase();

    const filtered = AppState.teachers.filter(teacher => {
      return teacher.name.toLowerCase().includes(searchVal) || teacher.email.toLowerCase().includes(searchVal);
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;" class="text-muted">No teachers found.</td></tr>`;
      return;
    }

    filtered.forEach(teacher => {
      // Find classes taught
      const teacherBatches = AppState.batches.filter(b => b.teacherId === teacher.userId);
      const classesHtml = teacherBatches.length > 0
        ? teacherBatches.map(b => `<span class="tag-badge" style="background:var(--primary-light);color:var(--primary);border:1px solid rgba(99, 102, 241, 0.3); font-size:10px; margin-right:4px;">${escapeHTML(b.name)}</span>`).join('')
        : `<span class="badge badge-warning">No Classes Assigned</span>`;

      const accountStatusBadge = teacher.isBanned 
        ? `<span class="badge badge-danger-glow"><i class="fa-solid fa-user-slash"></i> Suspended</span>` 
        : `<span class="badge badge-success"><i class="fa-solid fa-user-check"></i> Active</span>`;

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>
          <div class="student-row-profile">
            <div class="avatar-circle" style="background:linear-gradient(135deg, var(--secondary) 0%, var(--primary) 100%);">${teacher.name.substring(0, 1).toUpperCase()}</div>
            <div class="info">
              <span class="name">${escapeHTML(teacher.name)}</span>
              <span class="joined">Joined: ${new Date(teacher.joinedAt).toLocaleDateString()}</span>
            </div>
          </div>
        </td>
        <td>${escapeHTML(teacher.email)}</td>
        <td><div style="display:flex; flex-wrap:wrap; gap:4px;">${classesHtml}</div></td>
        <td>${accountStatusBadge}</td>
        <td>
          <div class="action-row-buttons">
            <button class="btn btn-primary btn-mini btn-edit-teacher" 
                    data-id="${teacher.userId}" 
                    data-name="${escapeHTML(teacher.name)}" 
                    data-email="${escapeHTML(teacher.email)}"
                    data-banned="${teacher.isBanned ? 'true' : 'false'}">
              <i class="fa-solid fa-pen"></i> Edit Profile
            </button>
            <button class="btn btn-danger btn-mini btn-delete-teacher" 
                    data-id="${teacher.userId}" 
                    data-name="${escapeHTML(teacher.name)}">
              <i class="fa-solid fa-trash-can"></i> WIPE
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(row);
    });
  },

  renderMaterials() {
    const tbody = document.querySelector('#materials-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const searchVal = document.getElementById('search-materials').value.toLowerCase();
    const typeFilter = document.getElementById('filter-materials-type').value;

    const filtered = AppState.materials.filter(m => {
      const batchName = AppState.batches.find(b => b.batchId === m.batchId)?.name || '';
      const matchesSearch = m.title.toLowerCase().includes(searchVal) || batchName.toLowerCase().includes(searchVal);
      
      if (!matchesSearch) return false;
      if (typeFilter === 'all') return true;
      return m.fileType === typeFilter;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;" class="text-muted">No lectures published yet.</td></tr>`;
      return;
    }

    filtered.forEach(mat => {
      const batchName = AppState.batches.find(b => b.batchId === mat.batchId)?.name || 'Unknown Batch';
      const timeStr = new Date(mat.createdAt).toLocaleDateString();
      const typeBadge = mat.fileType === 'video'
        ? `<span class="badge badge-warning"><i class="fa-solid fa-play"></i> Video</span>`
        : `<span class="badge badge-info"><i class="fa-solid fa-file-pdf"></i> PDF</span>`;

      // Render tags dynamically
      const tagsHtml = mat.tags 
        ? mat.tags.split(',').map(t => `<span class="tag-badge">${escapeHTML(t.trim())}</span>`).join('') 
        : '';

      const statusBadge = mat.isDraft 
        ? `<span class="badge badge-warning-glow">Draft</span>` 
        : `<span class="badge badge-success">Published</span>`;

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>
          <strong>${escapeHTML(mat.title)}</strong>
          <div class="text-secondary" style="font-size:11px;margin-top:2px;">${escapeHTML(mat.description)}</div>
          <div style="margin-top:6px;">${tagsHtml}</div>
        </td>
        <td>${escapeHTML(batchName)}</td>
        <td><a href="${escapeHTML(mat.fileUrl)}" target="_blank" style="text-decoration:none;">${typeBadge}</a></td>
        <td><i class="fa-regular fa-eye" style="margin-right:4px;"></i> ${mat.viewsCount || 0}</td>
        <td>${statusBadge}</td>
        <td>${timeStr}</td>
        <td>
          <div class="action-row-buttons">
            <button class="btn btn-secondary btn-mini btn-toggle-material-draft" 
                    data-id="${mat.materialId}" 
                    data-draft="${mat.isDraft ? 'false' : 'true'}"
                    title="${mat.isDraft ? 'Publish Material' : 'Save as Draft'}">
              <i class="fa-solid ${mat.isDraft ? 'fa-eye' : 'fa-eye-slash'}"></i> 
              ${mat.isDraft ? 'Publish' : 'Draft'}
            </button>
            <button class="btn btn-primary btn-mini btn-edit-material" 
                    data-id="${mat.materialId}" 
                    data-batch-id="${mat.batchId}" 
                    data-title="${escapeHTML(mat.title)}" 
                    data-desc="${escapeHTML(mat.description)}" 
                    data-type="${mat.fileType}" 
                    data-tags="${escapeHTML(mat.tags || '')}"
                    data-draft="${mat.isDraft ? 'true' : 'false'}"
                    data-url="${escapeHTML(mat.fileUrl)}">
              <i class="fa-solid fa-pen"></i> Edit
            </button>
            <button class="btn btn-danger btn-mini btn-delete-material" data-id="${mat.materialId}" data-title="${escapeHTML(mat.title)}">
              <i class="fa-solid fa-trash-can"></i> WIPE
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(row);
    });
  },

  renderModeration() {
    const listUl = document.getElementById('mod-batches-ul');
    if (!listUl) return;
    listUl.innerHTML = '';

    if (AppState.batches.length === 0) {
      listUl.innerHTML = `<li style="text-align:center;color:var(--text-muted);">No batches active.</li>`;
      return;
    }

    AppState.batches.forEach(b => {
      const count = AppState.chats.filter(c => c.batchId === b.batchId).length;
      const li = document.createElement('li');
      li.setAttribute('data-id', b.batchId);
      li.innerHTML = `
        <span class="list-title">${escapeHTML(b.name)}</span>
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span class="list-sub">${escapeHTML(b.subject)}</span>
          <span class="badge badge-info">${count} logs</span>
        </div>
      `;
      
      li.addEventListener('click', () => {
        listUl.querySelectorAll('li').forEach(item => item.classList.remove('active'));
        li.classList.add('active');
        UI.loadModerationChat(b);
      });
      listUl.appendChild(li);
    });

    // Render flagged moderation queue
    UI.renderFlaggedMessages();
  },

  reloadActiveChat() {
    const activeLi = document.querySelector('#mod-batches-ul li.active');
    if (activeLi) {
      const activeBatchId = activeLi.getAttribute('data-id');
      const batch = AppState.batches.find(b => b.batchId === activeBatchId);
      if (batch) {
        UI.loadModerationChat(batch);
      }
    }
  },

  // Load chat logs inside moderation panel
  loadModerationChat(batch) {
    document.getElementById('mod-active-batch-name').innerText = batch.name;
    const codeEl = document.getElementById('mod-active-batch-code');
    codeEl.innerText = batch.code;
    codeEl.className = 'badge badge-info';

    const scroller = document.getElementById('chat-logs-scroller');
    if (!scroller) return;
    scroller.innerHTML = '';

    const searchInput = document.getElementById('chat-search-input');
    const searchQuery = searchInput ? searchInput.value.toLowerCase() : '';

    let messages = AppState.chats.filter(c => c.batchId === batch.batchId);

    if (searchQuery) {
      messages = messages.filter(msg => 
        (msg.content || '').toLowerCase().includes(searchQuery) || 
        (msg.senderName || '').toLowerCase().includes(searchQuery)
      );
    }

    messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    if (messages.length === 0) {
      scroller.innerHTML = `
        <div class="chat-empty-state">
          <i class="fa-regular fa-comment-dots"></i>
          <p>${searchQuery ? 'No messages match search query.' : 'No chat history recorded in this batch yet.'}</p>
        </div>
      `;
      return;
    }

    messages.forEach(msg => {
      const card = document.createElement('div');
      card.className = `mod-message-card ${msg.senderRole === 'admin' || msg.senderRole === 'teacher' ? 'teacher-message' : ''}`;
      
      const timeStr = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const roleBadge = (msg.senderRole === 'admin' || msg.senderRole === 'teacher')
        ? `<span class="badge badge-info" style="font-size:8px;padding:2px 6px;">Educator</span>` 
        : '';

      card.innerHTML = `
        <div class="msg-meta">
          <div class="msg-user-row">
            <span class="msg-user">${escapeHTML(msg.senderName)}</span>
            ${roleBadge}
            <span class="msg-time">${timeStr}</span>
          </div>
          <p class="msg-content">${escapeHTML(msg.content)}</p>
        </div>
        <button class="btn-mod-delete" data-msg-id="${msg.messageId}" title="Delete Message">
          <i class="fa-solid fa-trash"></i>
        </button>
      `;
      scroller.appendChild(card);
    });

    // Auto scroll bottom
    scroller.scrollTop = scroller.scrollHeight;
  },

  renderFlaggedMessages() {
    const flaggedUl = document.getElementById('mod-flagged-ul');
    if (!flaggedUl) return;
    flaggedUl.innerHTML = '';

    AppState.dismissedFlaggedMessageIds = AppState.dismissedFlaggedMessageIds || [];

    const flaggedKeywords = ['spam', 'scam', 'fuck', 'shit', 'cheat', 'hack', 'leak', 'idiot', 'stupid', 'abusive'];
    const flaggedChats = AppState.chats.filter(c => {
      if (AppState.dismissedFlaggedMessageIds.includes(c.messageId)) return false;
      const contentLower = (c.content || '').toLowerCase();
      return flaggedKeywords.some(kw => contentLower.includes(kw));
    });

    if (flaggedChats.length === 0) {
      flaggedUl.innerHTML = `<li style="text-align:center;color:var(--text-muted);font-size:12px;padding:20px 0;">No flagged messages in queue.</li>`;
      return;
    }

    flaggedChats.forEach(msg => {
      const li = document.createElement('li');
      li.className = 'flagged-item-card';
      li.innerHTML = `
        <div class="flagged-sender">
          <span>${escapeHTML(msg.senderName)}</span>
          <span style="font-size:10px;color:var(--danger);text-transform:uppercase;font-weight:700;"><i class="fa-solid fa-triangle-exclamation"></i> Flagged</span>
        </div>
        <p class="flagged-text">"${escapeHTML(msg.content)}"</p>
        <div class="flagged-actions">
          <button class="btn btn-danger btn-mini btn-mod-wipe" data-msg-id="${msg.messageId}" style="flex:1;padding:4px;font-size:10px;">
            <i class="fa-solid fa-trash-can"></i> Wipe
          </button>
          <button class="btn btn-secondary btn-mini btn-mod-dismiss" data-msg-id="${msg.messageId}" style="flex:1;padding:4px;font-size:10px;">
            <i class="fa-solid fa-xmark"></i> Dismiss
          </button>
          <button class="btn btn-danger btn-mini btn-mod-ban" data-student-id="${msg.senderId}" data-name="${escapeHTML(msg.senderName)}" style="flex:1;padding:4px;font-size:10px;">
            <i class="fa-solid fa-ban"></i> Ban
          </button>
        </div>
      `;
      flaggedUl.appendChild(li);
    });
  },

  renderCourses() {
    // 1. Render store catalog
    const grid = document.getElementById('courses-grid-container');
    if (grid) {
      grid.innerHTML = '';
      if (AppState.courses.length === 0) {
        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-secondary);" class="bg-glass">No courses listed in store. Publish your first Retail syllabus package.</div>`;
      } else {
        AppState.courses.forEach(course => {
          const card = document.createElement('div');
          card.className = 'course-card bg-glass';
          const draftBadge = course.isDraft
            ? '<span class="badge badge-warning-glow" style="margin-left: 8px;">Draft</span>'
            : '<span class="badge badge-success" style="margin-left: 8px;">Published</span>';
          
          card.innerHTML = `
            <div class="course-banner" style="background-image: url('${escapeHTML(course.coverImage)}')">
              <span class="course-price-badge">INR ${course.price.toFixed(2)}</span>
            </div>
            <div class="course-info">
              <h4 style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap;">
                ${escapeHTML(course.title)}
                ${draftBadge}
              </h4>
              <p>${escapeHTML(course.description)}</p>
              <div class="course-stats-line">
                <i class="fa-solid fa-graduation-cap"></i>
                <span>${escapeHTML(course.contentSummary)}</span>
              </div>
              <div class="course-actions" style="display:flex; gap:5px; margin-top:10px; flex-wrap:wrap;">
                <button class="btn btn-secondary btn-mini btn-toggle-course-draft" 
                        data-id="${course.courseId}" 
                        data-draft="${course.isDraft ? 'false' : 'true'}"
                        title="${course.isDraft ? 'Publish Course' : 'Save as Draft'}">
                  <i class="fa-solid ${course.isDraft ? 'fa-eye' : 'fa-eye-slash'}"></i>
                  ${course.isDraft ? 'Publish' : 'Draft'}
                </button>
                <button class="btn btn-secondary btn-mini btn-edit-course" 
                        data-id="${course.courseId}" 
                        data-title="${escapeHTML(course.title)}" 
                        data-price="${course.price}" 
                        data-desc="${escapeHTML(course.description)}" 
                        data-summary="${escapeHTML(course.contentSummary)}" 
                        data-cover="${escapeHTML(course.coverImage)}"
                        data-draft="${course.isDraft ? 'true' : 'false'}">
                  <i class="fa-solid fa-pen"></i> Edit Detail
                </button>
                <button class="btn btn-danger btn-mini btn-delete-course" 
                        data-id="${course.courseId}" 
                        data-title="${escapeHTML(course.title)}"
                        style="padding: 6px 12px; font-size: 11px;">
                  <i class="fa-solid fa-trash-can"></i> WIPE
                </button>
              </div>
            </div>
          `;
          grid.appendChild(card);
        });
      }
    }

    // 2. Render Transactions Ledger
    const txBody = document.querySelector('#transactions-table tbody');
    if (txBody) {
      txBody.innerHTML = '';
      const sortedTxs = [...AppState.transactions].sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
      if (sortedTxs.length === 0) {
        txBody.innerHTML = `<tr><td colspan="7" style="text-align:center;" class="text-secondary">No checkout transactions logged yet.</td></tr>`;
      } else {
        sortedTxs.forEach(tx => {
          const row = document.createElement('tr');
          const timeStr = new Date(tx.timestamp).toLocaleString();
          row.innerHTML = `
            <td><code>${escapeHTML(tx.id)}</code></td>
            <td><strong>${escapeHTML(tx.studentName)}</strong></td>
            <td>${escapeHTML(tx.studentEmail)}</td>
            <td>${escapeHTML(tx.courseTitle)}</td>
            <td><span class="text-success" style="font-weight:700;">INR ${tx.amount.toFixed(2)}</span></td>
            <td><span class="badge badge-info">${escapeHTML(tx.promoApplied || 'NONE')}</span></td>
            <td>${timeStr}</td>
          `;
          txBody.appendChild(row);
        });
      }
    }

    // 3. Render Promo Coupons
    const cpBody = document.querySelector('#coupons-table tbody');
    if (cpBody) {
      cpBody.innerHTML = '';
      if (AppState.coupons.length === 0) {
        cpBody.innerHTML = `<tr><td colspan="4" style="text-align:center;" class="text-secondary">No coupons created yet.</td></tr>`;
      } else {
        AppState.coupons.forEach(cp => {
          const row = document.createElement('tr');
          const isActive = cp.isActive !== false;
          row.innerHTML = `
            <td><code style="font-size:14px;font-weight:700;color:var(--secondary);">${escapeHTML(cp.code)}</code></td>
            <td><strong>${cp.discount}% OFF</strong></td>
            <td><span class="badge ${isActive ? 'badge-success' : 'badge-danger'}">${isActive ? 'Active' : 'Disabled'}</span></td>
            <td>
              <div class="action-row-buttons">
                <button class="btn ${isActive ? 'btn-danger' : 'btn-success'} btn-mini btn-toggle-coupon" 
                        data-id="${cp.id}" 
                        data-active="${isActive ? 'false' : 'true'}">
                  <i class="fa-solid ${isActive ? 'fa-ban' : 'fa-circle-check'}"></i> ${isActive ? 'Disable' : 'Enable'}
                </button>
                <button class="btn btn-danger btn-mini btn-delete-coupon" data-id="${cp.id}">
                  <i class="fa-solid fa-trash-can"></i> Delete
                </button>
              </div>
            </td>
          `;
          cpBody.appendChild(row);
        });
      }
    }
  },

  // Render: Notices Hub
  renderNotices() {
    // 1. Populate Batch dropdown in notices composer
    const noticeBatchSelect = document.getElementById('notice-batch');
    noticeBatchSelect.innerHTML = '';
    
    if (AppState.batches.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.innerText = 'No Batches Active';
      noticeBatchSelect.appendChild(opt);
    } else {
      AppState.batches.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b.batchId;
        opt.innerText = b.name;
        noticeBatchSelect.appendChild(opt);
      });
    }

    // 2. Populate Notices table
    const tbody = document.querySelector('#notices-table tbody');
    tbody.innerHTML = '';

    const sortedAnnouncements = [...AppState.announcements].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    if (sortedAnnouncements.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;" class="text-secondary">No notices broadcasted yet.</td></tr>`;
      return;
    }

    sortedAnnouncements.forEach(ann => {
      const batchName = AppState.batches.find(b => b.batchId === ann.batchId)?.name || 'General';
      const timeStr = new Date(ann.createdAt).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><strong>${escapeHTML(batchName)}</strong></td>
        <td><strong>${escapeHTML(ann.title)}</strong></td>
        <td><span class="text-secondary" style="font-size:12px;" title="${escapeHTML(ann.content)}">${escapeHTML(ann.content.substring(0, 50))}${ann.content.length > 50 ? '...' : ''}</span></td>
        <td>${timeStr}</td>
        <td>
          <div class="action-row-buttons">
            <button class="btn btn-primary btn-mini btn-edit-notice" 
                    data-id="${ann.announcementId}" 
                    data-batch-id="${ann.batchId}" 
                    data-title="${escapeHTML(ann.title)}" 
                    data-content="${escapeHTML(ann.content)}">
              <i class="fa-solid fa-pen"></i> Edit
            </button>
            <button class="btn btn-danger btn-mini btn-delete-notice" data-id="${ann.announcementId}" data-title="${escapeHTML(ann.title)}">
              <i class="fa-solid fa-trash-can"></i> WIPE
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(row);
    });
  },

  // Render: Teacher Attendance management
  renderAttendance() {
    const dateInput = document.getElementById('attendance-date');
    if (dateInput && !dateInput.value) {
      dateInput.value = new Date().toISOString().split('T')[0];
    }
    const selectedDate = dateInput ? dateInput.value : new Date().toISOString().split('T')[0];

    // 1. Populate Teacher list for marking
    const container = document.getElementById('teacher-attendance-list-container');
    container.innerHTML = '';

    if (AppState.teachers.length === 0) {
      container.innerHTML = '<p class="text-secondary text-center" style="font-size:12px; padding: 20px 0;">No educators registered in directory.</p>';
    } else {
      AppState.teachers.forEach(teacher => {
        // Find existing record for this teacher and date
        const existing = AppState.teacherAttendance.find(a => a.teacherId === teacher.userId && a.date === selectedDate);
        const status = existing ? existing.status : 'present';
        const notes = existing ? existing.notes : '';

        const card = document.createElement('div');
        card.className = 'teacher-attendance-card bg-glass';
        card.style = 'padding: 16px; border-radius: 12px; border: 1px solid var(--border-card); background: rgba(255,255,255,0.02); display: flex; flex-direction: column; gap: 12px;';
        
        card.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            <div>
              <strong style="color:white; font-size:14px;">${escapeHTML(teacher.name)}</strong>
              <div style="color:var(--text-secondary); font-size:11px; margin-top:2px;">${escapeHTML(teacher.email)}</div>
            </div>
            
            <!-- Segmented status group -->
            <div class="attendance-status-group" data-teacher-id="${teacher.userId}" style="display:flex; background:rgba(0,0,0,0.3); border-radius:8px; padding:2px; border:1px solid var(--border-card);">
              <label style="margin:0; padding:6px 12px; border-radius:6px; font-size:11px; font-weight:700; cursor:pointer; color:${status === 'present' ? 'white' : 'var(--text-secondary)'}; background:${status === 'present' ? 'var(--success)' : 'transparent'}; transition:all 0.2s;">
                <input type="radio" name="status-${teacher.userId}" value="present" ${status === 'present' ? 'checked' : ''} style="display:none;"> Present
              </label>
              <label style="margin:0; padding:6px 12px; border-radius:6px; font-size:11px; font-weight:700; cursor:pointer; color:${status === 'late' ? 'white' : 'var(--text-secondary)'}; background:${status === 'late' ? '#F59E0B' : 'transparent'}; transition:all 0.2s;">
                <input type="radio" name="status-${teacher.userId}" value="late" ${status === 'late' ? 'checked' : ''} style="display:none;"> Late
              </label>
              <label style="margin:0; padding:6px 12px; border-radius:6px; font-size:11px; font-weight:700; cursor:pointer; color:${status === 'absent' ? 'white' : 'var(--text-secondary)'}; background:${status === 'absent' ? 'var(--danger)' : 'transparent'}; transition:all 0.2s;">
                <input type="radio" name="status-${teacher.userId}" value="absent" ${status === 'absent' ? 'checked' : ''} style="display:none;"> Absent
              </label>
              <label style="margin:0; padding:6px 12px; border-radius:6px; font-size:11px; font-weight:700; cursor:pointer; color:${status === 'leave' ? 'white' : 'var(--text-secondary)'}; background:${status === 'leave' ? '#6B7280' : 'transparent'}; transition:all 0.2s;">
                <input type="radio" name="status-${teacher.userId}" value="leave" ${status === 'leave' ? 'checked' : ''} style="display:none;"> Leave
              </label>
            </div>
          </div>
          <div class="form-group" style="margin:0;">
            <input type="text" class="form-control attendance-notes" placeholder="Notes or remarks..." value="${escapeHTML(notes)}" style="height:32px; font-size:12px; background:rgba(0,0,0,0.2); border:1px solid var(--border-card); border-radius:6px; color:white;">
          </div>
        `;

        // Add interactive style toggle for radios
        card.querySelectorAll('input[type="radio"]').forEach(rad => {
          rad.addEventListener('change', (e) => {
            const group = rad.closest('.attendance-status-group');
            group.querySelectorAll('label').forEach(lbl => {
              lbl.style.background = 'transparent';
              lbl.style.color = 'var(--text-secondary)';
            });
            const lbl = rad.closest('label');
            const val = rad.value;
            let bg = 'transparent';
            if (val === 'present') bg = 'var(--success)';
            if (val === 'late') bg = '#F59E0B';
            if (val === 'absent') bg = 'var(--danger)';
            if (val === 'leave') bg = '#6B7280';
            lbl.style.background = bg;
            lbl.style.color = 'white';
          });
        });

        container.appendChild(card);
      });
    }

    // 2. Populate History list
    const tbody = document.querySelector('#teacher-attendance-history-table tbody');
    tbody.innerHTML = '';

    if (AppState.teacherAttendance.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;" class="text-secondary">No attendance history logged.</td></tr>`;
      return;
    }

    // Sort descending by date
    const sorted = [...AppState.teacherAttendance].sort((a,b) => b.date.localeCompare(a.date));
    sorted.forEach(record => {
      let badge = '';
      if (record.status === 'present') badge = '<span class="badge badge-success">Present</span>';
      if (record.status === 'late') badge = '<span class="badge badge-warning-glow" style="background:#F59E0B; color:white; border:none;">Late</span>';
      if (record.status === 'absent') badge = '<span class="badge badge-danger">Absent</span>';
      if (record.status === 'leave') badge = '<span class="badge badge-info" style="background:#6B7280; color:white; border:none;">On Leave</span>';

      const formattedDate = new Date(record.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><strong>${formattedDate}</strong></td>
        <td><strong>${escapeHTML(record.teacherName)}</strong></td>
        <td>${badge}</td>
        <td><span class="text-secondary" style="font-size:12px;">${escapeHTML(record.notes || '--')}</span></td>
      `;
      tbody.appendChild(row);
    });
  }
};

// ==========================================================================
// 7. EVENT BINDINGS & COMPONENT MOUNTING
// ==========================================================================

// Helper to escape HTML tags to mitigate CSS injection issues
function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
}

// Session auto-recovery on page load
async function checkActiveSession() {
  const mockToggle = document.getElementById('mock-mode-toggle');
  if (!mockToggle) {
    localStorage.setItem('hq_session_is_mock', 'false');
  }
  const wasMock = localStorage.getItem('hq_session_is_mock') === 'true';
  const mockUserJson = localStorage.getItem('hq_session_user');
  
  if (wasMock && mockUserJson) {
    try {
      AppState.isMockMode = true;
      AppState.currentUser = JSON.parse(mockUserJson);
      
      // Sync toggle state in UI
      if (mockToggle) mockToggle.checked = true;
      
      await restoreSessionUI();
      return;
    } catch (_) {
      localStorage.removeItem('hq_session_is_mock');
      localStorage.removeItem('hq_session_user');
      document.body.className = 'auth-mode';
    }
  } else if (wasMock) {
    // Edge case: is_mock is true but user JSON is missing
    localStorage.removeItem('hq_session_is_mock');
    localStorage.removeItem('hq_session_user');
    document.body.className = 'auth-mode';
    return;
  }

  // Live Appwrite session check
  AppState.isMockMode = false;
  if (initAppwrite()) {
    try {
      const user = await appwriteAccount.get();
      const profile = await appwriteDatabases.getDocument(
        AppwriteConfig.databaseId,
        AppwriteConfig.collections.users,
        user.$id
      );

      if (profile.role === 'admin') {
        AppState.currentUser = {
          userId: profile.$id,
          name: profile.name,
          email: profile.email,
          role: profile.role,
          joinedAt: profile.joinedAt
        };
        
        localStorage.setItem('hq_session_is_mock', 'false');
        
        // Sync toggle state in UI
        const mockToggle = document.getElementById('mock-mode-toggle');
        if (mockToggle) mockToggle.checked = false;
        
        await restoreSessionUI();
      } else {
        await appwriteAccount.deleteSession('current');
        localStorage.removeItem('hq_session_is_mock');
        localStorage.removeItem('hq_session_user');
        document.body.className = 'auth-mode';
      }
    } catch (err) {
      console.log('No active Appwrite session found on startup.');
      localStorage.removeItem('hq_session_is_mock');
      localStorage.removeItem('hq_session_user');
      document.body.className = 'auth-mode';
    }
  } else {
    localStorage.removeItem('hq_session_is_mock');
    localStorage.removeItem('hq_session_user');
    document.body.className = 'auth-mode';
  }
}

// Restore user interface once authenticated
async function restoreSessionUI() {
  // Update UI Connection Status
  const statusBadge = document.getElementById('app-status-badge');
  const statusText = statusBadge.querySelector('.status-text');
  const statusDot = statusBadge.querySelector('.dot');

  if (AppState.isMockMode) {
    statusText.innerText = 'MOCK MODE';
    statusDot.className = 'dot';
  } else {
    statusText.innerText = 'APPWRITE LIVE';
    statusDot.className = 'dot live';
  }

  // Sync user profile stats
  document.getElementById('sidebar-user-name').innerText = AppState.currentUser.name;
  document.getElementById('sidebar-avatar').innerText = AppState.currentUser.name.substring(0, 1).toUpperCase();

  // Sync DB lists
  await DB.syncAllData();
  
  // Transition out of auth screen
  document.body.classList.remove('auth-mode');
  document.body.classList.remove('loading-mode');
  
  // Default view
  UI.switchView('view-dashboard');
}

document.addEventListener('DOMContentLoaded', () => {
  // Initialize mock structure
  MockDB.initialize();

  // Recover active session on page startup
  checkActiveSession();

  // Handle Login submission
  const loginForm = document.getElementById('login-form');
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const mockToggle = document.getElementById('mock-mode-toggle');
    const isMock = mockToggle ? mockToggle.checked : false;
    
    const btn = document.getElementById('btn-login');
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...`;

    try {
      AppState.isMockMode = isMock;
      
      // Execute DB verification
      await DB.authenticate(email, password);
      
      // Cache session metadata locally
      localStorage.setItem('hq_session_is_mock', AppState.isMockMode ? 'true' : 'false');
      if (AppState.isMockMode) {
        localStorage.setItem('hq_session_user', JSON.stringify(AppState.currentUser));
      } else {
        localStorage.removeItem('hq_session_user');
      }

      // Update UI Connection Status
      const statusBadge = document.getElementById('app-status-badge');
      const statusText = statusBadge.querySelector('.status-text');
      const statusDot = statusBadge.querySelector('.dot');

      if (AppState.isMockMode) {
        statusText.innerText = 'MOCK MODE';
        statusDot.className = 'dot';
      } else {
        statusText.innerText = 'APPWRITE LIVE';
        statusDot.className = 'dot live';
      }

      // Sync user profile stats
      document.getElementById('sidebar-user-name').innerText = AppState.currentUser.name;
      document.getElementById('sidebar-avatar').innerText = AppState.currentUser.name.substring(0, 1).toUpperCase();

      Toast.show(`Welcome back, ${AppState.currentUser.name}!`, 'success');
      
      // Sync DB lists
      await DB.syncAllData();
      
      // Transition out of auth screen
      document.body.classList.remove('auth-mode');
      document.body.classList.remove('loading-mode');
      
      // Default view
      UI.switchView('view-dashboard');

    } catch (err) {
      console.error(err);
      Toast.show(err.message || 'Login authentication failed.', 'danger');
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<span>Authenticate Session</span> <i class="fa-solid fa-arrow-right-to-bracket"></i>`;
    }
  });

  // Handle Logout
  document.getElementById('btn-logout').addEventListener('click', () => {
    DB.signout();
  });

  // View Navigation Toggling
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const viewId = item.getAttribute('data-view');
      UI.switchView(viewId);
      document.body.classList.remove('sidebar-open');
    });
  });

  // Mobile Sidebar Drawer Toggle Events
  const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
  if (btnToggleSidebar) {
    btnToggleSidebar.addEventListener('click', () => {
      document.body.classList.toggle('sidebar-open');
    });
  }

  const sidebarOverlay = document.getElementById('sidebar-overlay');
  if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', () => {
      document.body.classList.remove('sidebar-open');
    });
  }


  // Global Refresh Action
  document.getElementById('btn-refresh-data').addEventListener('click', async () => {
    const icon = document.querySelector('#btn-refresh-data i');
    icon.classList.add('fa-spin');
    try {
      await DB.syncAllData();
      UI.renderActiveView();
      Toast.show('Database cache successfully updated.', 'success');
    } catch (e) {
      Toast.show('Sync action failed.', 'danger');
    } finally {
      setTimeout(() => icon.classList.remove('fa-spin'), 600);
    }
  });

  // Clock Widget timer
  setInterval(() => {
    const date = new Date();
    document.getElementById('live-clock').innerText = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, 1000);

  // Search Filter list bindings
  document.getElementById('search-batches').addEventListener('input', () => UI.renderBatches());
  document.getElementById('search-students').addEventListener('input', () => UI.renderStudents());
  document.getElementById('filter-students-plan').addEventListener('change', () => UI.renderStudents());
  document.getElementById('search-materials').addEventListener('input', () => UI.renderMaterials());
  document.getElementById('filter-materials-type').addEventListener('change', () => UI.renderMaterials());

  // Attendance Date Change listener
  const attDateInput = document.getElementById('attendance-date');
  if (attDateInput) {
    attDateInput.addEventListener('change', () => {
      UI.renderAttendance();
    });
  }

  // Save Teacher Attendance Button click listener
  const btnSaveTeacherAtt = document.getElementById('btn-save-teacher-attendance');
  if (btnSaveTeacherAtt) {
    btnSaveTeacherAtt.addEventListener('click', async () => {
      const selectedDate = document.getElementById('attendance-date').value;
      if (!selectedDate) {
        Toast.show('Please select a valid date.', 'warning');
        return;
      }

      btnSaveTeacherAtt.disabled = true;
      btnSaveTeacherAtt.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Saving...`;

      try {
        const cards = document.querySelectorAll('.teacher-attendance-card');
        for (const card of cards) {
          const group = card.querySelector('.attendance-status-group');
          const teacherId = group.getAttribute('data-teacher-id');
          const status = card.querySelector(`input[name="status-${teacherId}"]:checked`).value;
          const notes = card.querySelector('.attendance-notes').value.trim();
          
          await DB.logTeacherAttendance(teacherId, selectedDate, status, notes);
        }

        Toast.show('Teacher attendance recorded successfully.', 'success');
        await DB.syncAllData();
        UI.renderAttendance();
      } catch (err) {
        Toast.show(err.message || 'Failed to save teacher attendance.', 'danger');
      } finally {
        btnSaveTeacherAtt.disabled = false;
        btnSaveTeacherAtt.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> <span>Submit Attendance Log</span>`;
      }
    });
  }

  // Global search redirect logic
  document.getElementById('global-search').addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase();
    if (AppState.activeView === 'view-dashboard') return;
    
    const searchMap = {
      'view-batches': 'search-batches',
      'view-students': 'search-students',
      'view-materials': 'search-materials',
      'view-teachers': 'search-teachers'
    };
    const targetInputId = searchMap[AppState.activeView];
    if (targetInputId) {
      const input = document.getElementById(targetInputId);
      input.value = val;
      input.dispatchEvent(new Event('input'));
    }
  });

  // ================= MODAL WINDOW EVENTS =================

  // Close modals helper
  document.querySelectorAll('.btn-close-modal').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('active'));
    });
  });

  // Modal: Create Batch
  document.getElementById('btn-open-create-batch').addEventListener('click', () => {
    document.getElementById('form-create-batch').reset();
    document.getElementById('edit-batch-id').value = '';
    document.querySelector('#modal-create-batch h3').innerText = 'Create New Batch';
    document.querySelector('#modal-create-batch button[type="submit"]').innerText = 'Establish Classroom';
    document.getElementById('batch-code').value = 'BCH' + Math.floor(100 + Math.random() * 900);
    UI.populateTeacherDropdown();
    UI.unpackScheduleString('');
    document.getElementById('modal-create-batch').classList.add('active');
  });

  document.getElementById('btn-generate-code').addEventListener('click', () => {
    document.getElementById('batch-code').value = 'BCH' + Math.floor(100 + Math.random() * 900);
  });

  // Edit Batch Open
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-edit-batch');
    if (!btn) return;

    document.getElementById('edit-batch-id').value = btn.getAttribute('data-id');
    document.getElementById('batch-name').value = btn.getAttribute('data-name');
    document.getElementById('batch-subject').value = btn.getAttribute('data-subject');
    document.getElementById('batch-description').value = btn.getAttribute('data-desc');
    document.getElementById('batch-code').value = btn.getAttribute('data-code');

    UI.populateTeacherDropdown(btn.getAttribute('data-teacher-id') || btn.getAttribute('data-teacher-name') || '');
    UI.unpackScheduleString(btn.getAttribute('data-schedule') || '');

    document.querySelector('#modal-create-batch h3').innerText = 'Edit Batch Classroom';
    document.querySelector('#modal-create-batch button[type="submit"]').innerText = 'Save Changes';
    document.getElementById('modal-create-batch').classList.add('active');
  });

  // WIPE: Delete Batch
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.btn-delete-batch');
    if (!btn) return;

    const id = btn.getAttribute('data-id');
    const name = btn.getAttribute('data-name');

    if (confirm(`WIPE BATCH CLASSROOM?\n\nAre you sure you want to permanently delete "${name}"? All student enrollments and material references in this batch will be severed.`)) {
      try {
        await DB.deleteBatch(id);
        Toast.show('Batch classroom deleted.', 'success');
        await DB.syncAllData();
        UI.renderBatches();
      } catch (err) {
        Toast.show('Failed to delete batch.', 'danger');
      }
    }
  });

  // Toggle Batch Access Action
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.btn-toggle-batch-access');
    if (!btn) return;

    const id = btn.getAttribute('data-id');
    const targetState = btn.getAttribute('data-enabled') === 'true';
    const actionName = targetState ? 'Resume' : 'Suspend';

    if (confirm(`Are you sure you want to ${actionName.toLowerCase()} student access for this batch?`)) {
      btn.disabled = true;
      const originalHtml = btn.innerHTML;
      btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;
      try {
        await DB.toggleBatchAccess(id, targetState);
        Toast.show(`Batch access status updated to: ${targetState ? 'Enabled' : 'Disabled'}`, 'success');
        await DB.syncAllData();
        UI.renderBatches();
      } catch (err) {
        // Error toast already shown in DB method
      } finally {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
      }
    }
  });

  document.getElementById('form-create-batch').addEventListener('submit', async (e) => {
    e.preventDefault();
    const batchId = document.getElementById('edit-batch-id').value;
    const name = document.getElementById('batch-name').value;
    const subject = document.getElementById('batch-subject').value;
    const desc = document.getElementById('batch-description').value;
    const schedule = document.getElementById('batch-schedule').value;
    
    const teacherSelect = document.getElementById('batch-teacher-name');
    const teacherId = teacherSelect.value;
    let teacherName = '';
    const teacherObj = AppState.teachers.find(t => t.userId === teacherId);
    if (teacherObj) {
      teacherName = teacherObj.name;
    } else if (teacherId === (AppState.currentUser ? AppState.currentUser.userId : 'admin_hq')) {
      teacherName = AppState.currentUser ? AppState.currentUser.name : 'Sanskar Admin';
    } else {
      const selectedOption = teacherSelect.options[teacherSelect.selectedIndex];
      teacherName = selectedOption ? selectedOption.text.split(' (')[0] : 'Educator';
    }

    const code = document.getElementById('batch-code').value;

    try {
      if (batchId) {
        await DB.updateBatch(batchId, name, subject, desc, code, schedule, teacherId, teacherName);
        Toast.show('Classroom batch successfully updated.', 'success');
      } else {
        await DB.createBatch(name, subject, desc, code, schedule, teacherId, teacherName);
        Toast.show('Classroom batch successfully listed.', 'success');
      }
      document.getElementById('modal-create-batch').classList.remove('active');
      await DB.syncAllData();
      UI.renderBatches();
    } catch (err) {
      Toast.show(err.message || 'Failed to save classroom changes.', 'danger');
    }
  });

  // Modal: Edit Student Access
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-edit-access');
    if (!btn) return;

    document.getElementById('edit-student-id').value = btn.getAttribute('data-student-id');
    document.getElementById('edit-student-batch-id').value = btn.getAttribute('data-batch-id') || '';
    document.getElementById('edit-student-summary-name').innerText = btn.getAttribute('data-name');
    document.getElementById('edit-student-summary-email').innerText = btn.getAttribute('data-email');
    document.getElementById('edit-student-avatar').innerText = btn.getAttribute('data-name').substring(0, 1).toUpperCase();
    
    // Set editable inputs
    document.getElementById('edit-student-name-input').value = btn.getAttribute('data-name');
    document.getElementById('edit-student-email-input').value = btn.getAttribute('data-email');
    
    const plan = btn.getAttribute('data-plan') || 'expired';
    const expiry = btn.getAttribute('data-expiry') || '';
    const enabled = btn.getAttribute('data-enabled') === 'true';
    const banned = btn.getAttribute('data-banned') === 'true';

    document.getElementById('edit-student-plan').value = plan;
    document.getElementById('edit-student-expiry').value = expiry;
    document.getElementById('edit-student-enabled').checked = enabled;
    document.getElementById('edit-student-banned').checked = banned;

    document.getElementById('modal-edit-student').classList.add('active');
  });

  document.getElementById('form-edit-student').addEventListener('submit', async (e) => {
    e.preventDefault();
    const studentId = document.getElementById('edit-student-id').value;
    const batchId = document.getElementById('edit-student-batch-id').value;
    const name = document.getElementById('edit-student-name-input').value.trim();
    const email = document.getElementById('edit-student-email-input').value.trim();
    const plan = document.getElementById('edit-student-plan').value;
    const expiry = document.getElementById('edit-student-expiry').value;
    const enabled = document.getElementById('edit-student-enabled').checked;
    const banned = document.getElementById('edit-student-banned').checked;

    try {
      await DB.updateStudentProfile(studentId, name, email);
      if (batchId) {
        await DB.updateStudentAccess(batchId, studentId, enabled, plan, expiry);
      }
      await DB.updateStudentBanState(studentId, banned);
      Toast.show('Student profile and subscription status updated.', 'success');
      document.getElementById('modal-edit-student').classList.remove('active');
      await DB.syncAllData();
      UI.renderStudents();
    } catch (err) {
      Toast.show('Failed to modify student profile.', 'danger');
    }
  });

  // Modal: Direct Enroll Direct Action (Fall-back direct access check-in)
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.btn-enroll-student-direct');
    if (!btn) return;

    if (AppState.batches.length === 0) {
      Toast.show('Please establish a classroom batch first.', 'warning');
      return;
    }

    const studentId = btn.getAttribute('data-student-id');
    const defaultBatch = AppState.batches[0].batchId;
    const expiry = new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0]; // 90 days default

    try {
      await DB.updateStudentAccess(defaultBatch, studentId, true, '3_months', expiry);
      Toast.show('Enrolled student into standard batch classroom.', 'success');
      await DB.syncAllData();
      UI.renderStudents();
    } catch (err) {
      Toast.show('Enrollment allocation failed.', 'danger');
    }
  });

  // Modal: Upload Study Resource
  document.getElementById('btn-open-upload-material').addEventListener('click', () => {
    const batchSelect = document.getElementById('material-batch');
    batchSelect.innerHTML = '';

    if (AppState.batches.length === 0) {
      Toast.show('Please construct a classroom batch before listing materials.', 'warning');
      return;
    }

    AppState.batches.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b.batchId;
      opt.innerText = b.name;
      batchSelect.appendChild(opt);
    });

    document.getElementById('form-upload-material').reset();
    document.getElementById('edit-material-id').value = '';
    document.querySelector('#modal-upload-material h3').innerText = 'Upload Study Material';
    document.querySelector('#modal-upload-material button[type="submit"]').innerText = 'Publish Material';
    document.getElementById('modal-upload-material').classList.add('active');
  });

  // Edit Material Open
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-edit-material');
    if (!btn) return;

    const batchSelect = document.getElementById('material-batch');
    batchSelect.innerHTML = '';
    AppState.batches.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b.batchId;
      opt.innerText = b.name;
      batchSelect.appendChild(opt);
    });

    document.getElementById('edit-material-id').value = btn.getAttribute('data-id');
    document.getElementById('material-batch').value = btn.getAttribute('data-batch-id');
    document.getElementById('material-title').value = btn.getAttribute('data-title');
    document.getElementById('material-description').value = btn.getAttribute('data-desc');
    document.getElementById('material-type').value = btn.getAttribute('data-type');
    document.getElementById('material-url').value = btn.getAttribute('data-url');
    document.getElementById('material-tags').value = btn.getAttribute('data-tags') || '';
    document.getElementById('material-is-draft').checked = btn.getAttribute('data-draft') === 'true';

    document.querySelector('#modal-upload-material h3').innerText = 'Edit Study Material';
    document.querySelector('#modal-upload-material button[type="submit"]').innerText = 'Save Changes';
    document.getElementById('modal-upload-material').classList.add('active');
  });

  document.getElementById('form-upload-material').addEventListener('submit', async (e) => {
    e.preventDefault();
    const materialId = document.getElementById('edit-material-id').value;
    const batchId = document.getElementById('material-batch').value;
    const title = document.getElementById('material-title').value;
    const desc = document.getElementById('material-description').value;
    const type = document.getElementById('material-type').value;
    const url = document.getElementById('material-url').value;
    const tags = document.getElementById('material-tags').value.trim();
    const isDraft = document.getElementById('material-is-draft').checked;

    try {
      if (materialId) {
        await DB.updateMaterial(materialId, batchId, title, desc, url, type, tags, isDraft);
        Toast.show('Study material updated successfully.', 'success');
      } else {
        await DB.createMaterial(batchId, title, desc, url, type, tags, isDraft);
        Toast.show('Study material published successfully.', 'success');
      }
      document.getElementById('modal-upload-material').classList.remove('active');
      await DB.syncAllData();
      UI.renderMaterials();
    } catch (err) {
      Toast.show('Failed to save study material changes.', 'danger');
    }
  });

  // WIPE: Delete Material
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.btn-delete-material');
    if (!btn) return;

    const id = btn.getAttribute('data-id');
    const title = btn.getAttribute('data-title');

    if (confirm(`WIPE STUDY RESOURCE?\n\nAre you sure you want to permanently delete "${title}"? This cannot be undone.`)) {
      try {
        await DB.deleteMaterial(id);
        Toast.show('Lecture material destroyed.', 'success');
        await DB.syncAllData();
        UI.renderMaterials();
      } catch (err) {
        Toast.show('Deletion target failed.', 'danger');
      }
    }
  });

  // MODERATION: Delete Chat Message
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.btn-mod-delete');
    if (!btn) return;

    const msgId = btn.getAttribute('data-msg-id');

    if (confirm('Moderate Chat Room?\n\nRemove this message from classroom feed history?')) {
      try {
        await DB.deleteChatMessage(msgId);
        Toast.show('Inappropriate message removed.', 'success');
        
        // Find active batch
        const activeLi = document.querySelector('#mod-batches-ul li.active');
        const activeBatchId = activeLi ? activeLi.getAttribute('data-id') : null;
        
        await DB.syncAllData();
        UI.renderModeration();

        if (activeBatchId) {
          const batch = AppState.batches.find(b => b.batchId === activeBatchId);
          if (batch) UI.loadModerationChat(batch);
        }
      } catch (err) {
        Toast.show('Message purge action failed.', 'danger');
      }
    }
  });

  // Modal: Publish/Edit Retail Course
  document.getElementById('btn-open-create-course').addEventListener('click', () => {
    document.getElementById('form-create-course').reset();
    document.getElementById('edit-course-id').value = '';
    document.getElementById('course-modal-title').innerText = 'Publish Retail Course';
    document.getElementById('btn-course-submit-text').innerText = 'List Course';
    document.getElementById('modal-create-course').classList.add('active');
  });

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-edit-course');
    if (!btn) return;

    document.getElementById('edit-course-id').value = btn.getAttribute('data-id');
    document.getElementById('course-title').value = btn.getAttribute('data-title');
    document.getElementById('course-price').value = btn.getAttribute('data-price');
    document.getElementById('course-description').value = btn.getAttribute('data-desc');
    document.getElementById('course-summary').value = btn.getAttribute('data-summary');
    document.getElementById('course-cover').value = btn.getAttribute('data-cover');
    document.getElementById('course-is-draft').checked = btn.getAttribute('data-draft') === 'true';

    document.getElementById('course-modal-title').innerText = 'Edit Retail Course';
    document.getElementById('btn-course-submit-text').innerText = 'Save Changes';
    document.getElementById('modal-create-course').classList.add('active');
  });

  document.getElementById('form-create-course').addEventListener('submit', async (e) => {
    e.preventDefault();
    const courseId = document.getElementById('edit-course-id').value;
    const title = document.getElementById('course-title').value;
    const price = document.getElementById('course-price').value;
    const desc = document.getElementById('course-description').value;
    const summary = document.getElementById('course-summary').value;
    const cover = document.getElementById('course-cover').value;
    const isDraft = document.getElementById('course-is-draft').checked;

    try {
      await DB.upsertCourse(courseId, title, price, desc, cover, summary, isDraft);
      Toast.show(courseId ? 'Course updated successfully.' : 'New retail course published.', 'success');
      document.getElementById('modal-create-course').classList.remove('active');
      await DB.syncAllData();
      UI.renderCourses();
    } catch (err) {
      Toast.show('Failed to write course details.', 'danger');
    }
  });

  // Copy join link action
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-copy-code');
    if (!btn) return;

    const code = btn.getAttribute('data-code');
    
    // Copy to clipboard
    navigator.clipboard.writeText(code).then(() => {
      Toast.show(`Join Code "${code}" copied to clipboard!`, 'success');
    }).catch(() => {
      Toast.show('Clipboard copy failed.', 'danger');
    });
  });

  // Edit Broadcast notice load to composer
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-edit-notice');
    if (!btn) return;

    document.getElementById('edit-notice-id').value = btn.getAttribute('data-id');
    document.getElementById('notice-batch').value = btn.getAttribute('data-batch-id');
    document.getElementById('notice-title').value = btn.getAttribute('data-title');
    document.getElementById('notice-content').value = btn.getAttribute('data-content');

    document.getElementById('btn-broadcast-text').innerText = 'Update Notice';
    document.getElementById('btn-cancel-notice-edit').style.display = 'block';

    // Focus title field
    document.getElementById('notice-title').focus();
  });

  // Cancel notice edit action
  document.getElementById('btn-cancel-notice-edit').addEventListener('click', () => {
    document.getElementById('form-broadcast-notice').reset();
    document.getElementById('edit-notice-id').value = '';
    document.getElementById('btn-broadcast-text').innerText = 'Broadcast Notice';
    document.getElementById('btn-cancel-notice-edit').style.display = 'none';
  });

  // Compose / Update Notice Broadcast Action
  document.getElementById('form-broadcast-notice').addEventListener('submit', async (e) => {
    e.preventDefault();
    const noticeId = document.getElementById('edit-notice-id').value;
    const batchId = document.getElementById('notice-batch').value;
    const title = document.getElementById('notice-title').value;
    const content = document.getElementById('notice-content').value;

    if (!batchId) {
      Toast.show('Please select a batch classroom first.', 'warning');
      return;
    }

    try {
      if (noticeId) {
        await DB.updateAnnouncement(noticeId, batchId, title, content);
        Toast.show('Notice updated successfully!', 'success');
        document.getElementById('edit-notice-id').value = '';
        document.getElementById('btn-broadcast-text').innerText = 'Broadcast Notice';
        document.getElementById('btn-cancel-notice-edit').style.display = 'none';
      } else {
        await DB.createAnnouncement(batchId, title, content);
        Toast.show('Notice broadcasted successfully!', 'success');
      }
      document.getElementById('form-broadcast-notice').reset();
      await DB.syncAllData();
      UI.renderNotices();
    } catch (err) {
      Toast.show('Notice save action failed.', 'danger');
    }
  });

  // Delete Broadcast notice
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.btn-delete-notice');
    if (!btn) return;

    const id = btn.getAttribute('data-id');
    const title = btn.getAttribute('data-title');

    if (confirm(`WIPE NOTICE?\n\nAre you sure you want to permanently delete notice "${title}"?`)) {
      try {
        await DB.deleteAnnouncement(id);
        Toast.show('Notice wiped from database.', 'success');
        
        // If we were editing this notice, reset the form
        if (document.getElementById('edit-notice-id').value === id) {
          document.getElementById('btn-cancel-notice-edit').click();
        }

        await DB.syncAllData();
        UI.renderNotices();
      } catch (err) {
        Toast.show('Failed to delete notice.', 'danger');
      }
    }
  });

  // Delete Course Store Item
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.btn-delete-course');
    if (!btn) return;

    const id = btn.getAttribute('data-id');
    const title = btn.getAttribute('data-title');

    if (confirm(`WIPE RETAIL COURSE?\n\nAre you sure you want to permanently delete course "${title}" from the retail store?`)) {
      try {
        await DB.deleteCourse(id);
        Toast.show('Retail course deleted.', 'success');
        await DB.syncAllData();
        UI.renderCourses();
      } catch (err) {
        Toast.show('Failed to delete course.', 'danger');
      }
    }
  });

  // COMMERCE SUB-TABS INTERACTIVE NAV
  document.querySelectorAll('.sub-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const subviewId = btn.getAttribute('data-subview');
      
      // Update buttons
      document.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Switch view panels
      document.querySelectorAll('.subview-container').forEach(panel => {
        if (panel.id === subviewId) {
          panel.style.display = 'block';
          panel.classList.add('active');
        } else {
          panel.style.display = 'none';
          panel.classList.remove('active');
        }
      });
    });
  });

  // GENERATE PROMO COUPON SUBMISSION
  const formCreateCoupon = document.getElementById('form-create-coupon');
  if (formCreateCoupon) {
    formCreateCoupon.addEventListener('submit', async (e) => {
      e.preventDefault();
      const codeInput = document.getElementById('coupon-code');
      const discountInput = document.getElementById('coupon-discount');
      const code = codeInput.value.trim();
      const discount = discountInput.value;

      try {
        await DB.createCoupon(code, discount);
        Toast.show(`Promo coupon "${code.toUpperCase()}" generated successfully.`, 'success');
        formCreateCoupon.reset();
        await DB.syncAllData();
        UI.renderCourses();
      } catch (err) {
        Toast.show(err.message || 'Coupon generation failed.', 'danger');
      }
    });
  }

  // EVENT DELEGATION: Toggle Coupon active status & Delete Coupon
  document.addEventListener('click', async (e) => {
    const btnToggle = e.target.closest('.btn-toggle-coupon');
    if (btnToggle) {
      const id = btnToggle.getAttribute('data-id');
      const targetState = btnToggle.getAttribute('data-active') === 'true';
      try {
        await DB.toggleCouponState(id, targetState);
        Toast.show(`Coupon status updated to: ${targetState ? 'Enabled' : 'Disabled'}`, 'success');
        await DB.syncAllData();
        UI.renderCourses();
      } catch (err) {
        // Error already handled
      }
      return;
    }

    const btnDelete = e.target.closest('.btn-delete-coupon');
    if (btnDelete) {
      const id = btnDelete.getAttribute('data-id');
      if (confirm('Permanently delete this promo code? This cannot be undone.')) {
        try {
          await DB.deleteCoupon(id);
          Toast.show('Promo coupon deleted successfully.', 'success');
          await DB.syncAllData();
          UI.renderCourses();
        } catch (err) {
          Toast.show('Failed to delete coupon.', 'danger');
        }
      }
      return;
    }
  });

  // EVENT DELEGATION: Flagged Chat Queue Action buttons
  document.addEventListener('click', async (e) => {
    const btnWipe = e.target.closest('.btn-mod-wipe');
    if (btnWipe) {
      const msgId = btnWipe.getAttribute('data-msg-id');
      if (confirm('Purge and delete this message from classroom discussion feed?')) {
        try {
          await DB.deleteChatMessage(msgId);
          Toast.show('Inappropriate message wiped.', 'success');
          await DB.syncAllData();
          UI.renderModeration();
          UI.reloadActiveChat();
        } catch (err) {
          Toast.show('Failed to purge flagged message.', 'danger');
        }
      }
      return;
    }

    const btnDismiss = e.target.closest('.btn-mod-dismiss');
    if (btnDismiss) {
      const msgId = btnDismiss.getAttribute('data-msg-id');
      AppState.dismissedFlaggedMessageIds = AppState.dismissedFlaggedMessageIds || [];
      AppState.dismissedFlaggedMessageIds.push(msgId);
      Toast.show('Message dismissed from flagged moderation list.', 'info');
      UI.renderFlaggedMessages();
      return;
    }

    const btnBan = e.target.closest('.btn-mod-ban');
    if (btnBan) {
      const studentId = btnBan.getAttribute('data-student-id');
      const name = btnBan.getAttribute('data-name');
      if (confirm(`Ban "${name}" globally?\n\nAll classroom access will be immediately terminated and student profile locked.`)) {
        try {
          await DB.updateStudentBanState(studentId, true);
          Toast.show(`Student "${name}" suspended globally.`, 'success');
          await DB.syncAllData();
          UI.renderModeration();
          UI.reloadActiveChat();
        } catch (err) {
          Toast.show('Failed to suspend student.', 'danger');
        }
      }
      return;
    }
  });

  // EVENT DELEGATION: Toggling Draft state for lectures & courses, views hits tracker
  document.addEventListener('click', async (e) => {
    const btnToggleMat = e.target.closest('.btn-toggle-material-draft');
    if (btnToggleMat) {
      const id = btnToggleMat.getAttribute('data-id');
      const targetState = btnToggleMat.getAttribute('data-draft') === 'true';
      try {
        await DB.toggleMaterialDraftState(id, targetState);
        Toast.show(`Lecture visibility updated to: ${targetState ? 'Draft' : 'Published'}`, 'success');
        await DB.syncAllData();
        UI.renderMaterials();
      } catch (err) {
        // Handled
      }
      return;
    }

    const btnToggleCrs = e.target.closest('.btn-toggle-course-draft');
    if (btnToggleCrs) {
      const id = btnToggleCrs.getAttribute('data-id');
      const targetState = btnToggleCrs.getAttribute('data-draft') === 'true';
      try {
        await DB.toggleCourseDraftState(id, targetState);
        Toast.show(`Store course visibility updated to: ${targetState ? 'Draft' : 'Published'}`, 'success');
        await DB.syncAllData();
        UI.renderCourses();
      } catch (err) {
        // Handled
      }
      return;
    }

    // Material view hit tracking: increment view count when material link is clicked
    const linkMat = e.target.closest('.text-link');
    if (linkMat && AppState.activeView === 'view-materials') {
      const row = linkMat.closest('tr');
      const editBtn = row ? row.querySelector('.btn-edit-material') : null;
      const matId = editBtn ? editBtn.getAttribute('data-id') : null;
      if (matId) {
        DB.incrementResourceViews(matId);
      }
    }
  });

  // KEYWORD CHAT FILTER BOX LISTENER
  const chatSearch = document.getElementById('chat-search-input');
  if (chatSearch) {
    chatSearch.addEventListener('input', () => {
      UI.reloadActiveChat();
    });
  }

  // QUICK ACTIONS PANELS ROUTERS & CONTROLS
  document.querySelectorAll('.btn-quick-action').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetView = btn.getAttribute('data-view');
      if (targetView) {
        UI.switchView(targetView);
      }
    });
  });

  const quickAddCourse = document.getElementById('btn-quick-add-course-trigger');
  if (quickAddCourse) {
    quickAddCourse.addEventListener('click', (e) => {
      e.preventDefault();
      UI.switchView('view-courses');
      // Force switch to active catalog subtab and trigger open modal
      const catalogTabBtn = document.querySelector('[data-subview="subview-store-catalog"]');
      if (catalogTabBtn) catalogTabBtn.click();
      const addBtn = document.getElementById('btn-open-create-course');
      if (addBtn) addBtn.click();
    });
  }

  const quickCreateBatch = document.getElementById('btn-quick-create-batch-trigger');
  if (quickCreateBatch) {
    quickCreateBatch.addEventListener('click', (e) => {
      e.preventDefault();
      UI.switchView('view-batches');
      const addBatchBtn = document.getElementById('btn-open-create-batch');
      if (addBatchBtn) addBatchBtn.click();
    });
  }

  const quickSync = document.getElementById('btn-quick-sync-trigger');
  if (quickSync) {
    quickSync.addEventListener('click', (e) => {
      e.preventDefault();
      const refreshBtn = document.getElementById('btn-refresh-data');
      if (refreshBtn) refreshBtn.click();
    });
  }

  // --- NEW STUDENT & TEACHER CRUD EVENT BINDINGS ---

  // Search filter list binding for teachers
  const searchTeachersEl = document.getElementById('search-teachers');
  if (searchTeachersEl) {
    searchTeachersEl.addEventListener('input', () => UI.renderTeachers());
  }

  // Modal: Open Create Student
  const btnOpenCreateStudent = document.getElementById('btn-open-create-student');
  if (btnOpenCreateStudent) {
    btnOpenCreateStudent.addEventListener('click', () => {
      const form = document.getElementById('form-create-student');
      if (form) form.reset();
      document.getElementById('modal-create-student').classList.add('active');
    });
  }

  // Form: Create Student Submit
  const formCreateStudent = document.getElementById('form-create-student');
  if (formCreateStudent) {
    formCreateStudent.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('student-create-name').value.trim();
      const email = document.getElementById('student-create-email').value.trim();
      const password = document.getElementById('student-create-password').value;

      try {
        await DB.createStudent(name, email, password);
        Toast.show(`Student profile for "${name}" created successfully.`, 'success');
        document.getElementById('modal-create-student').classList.remove('active');
        await DB.syncAllData();
        UI.renderStudents();
      } catch (err) {
        Toast.show(err.message || 'Failed to create student profile.', 'danger');
      }
    });
  }

  // Action: Wipe Student Profile (within edit modal)
  const btnWipeStudent = document.getElementById('btn-wipe-student');
  if (btnWipeStudent) {
    btnWipeStudent.addEventListener('click', async () => {
      const studentId = document.getElementById('edit-student-id').value;
      const name = document.getElementById('edit-student-summary-name').innerText;
      if (confirm(`WIPE STUDENT PROFILE?\n\nAre you sure you want to permanently delete student "${name}"? This will also wipe all their batch enrollments from the system.`)) {
        try {
          await DB.deleteStudent(studentId);
          Toast.show(`Student "${name}" profile and enrollments wiped.`, 'success');
          document.getElementById('modal-edit-student').classList.remove('active');
          await DB.syncAllData();
          UI.renderStudents();
        } catch (err) {
          Toast.show(`Failed to wipe student profile: ${err.message || err}`, 'danger');
        }
      }
    });
  }

  // Modal: Open Create Teacher
  const btnOpenCreateTeacher = document.getElementById('btn-open-create-teacher');
  if (btnOpenCreateTeacher) {
    btnOpenCreateTeacher.addEventListener('click', () => {
      const form = document.getElementById('form-create-teacher');
      if (form) form.reset();
      document.getElementById('modal-create-teacher').classList.add('active');
    });
  }

  // Form: Create Teacher Submit
  const formCreateTeacher = document.getElementById('form-create-teacher');
  if (formCreateTeacher) {
    formCreateTeacher.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('teacher-create-name').value.trim();
      const email = document.getElementById('teacher-create-email').value.trim();
      const password = document.getElementById('teacher-create-password').value;

      try {
        await DB.createTeacher(name, email, password);
        Toast.show(`Teacher profile for "${name}" created successfully.`, 'success');
        document.getElementById('modal-create-teacher').classList.remove('active');
        await DB.syncAllData();
        UI.renderTeachers();
      } catch (err) {
        Toast.show(err.message || 'Failed to create teacher profile.', 'danger');
      }
    });
  }

  // Event Delegation: Open Edit Teacher Modal
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-edit-teacher');
    if (!btn) return;

    const teacherId = btn.getAttribute('data-id');
    const name = btn.getAttribute('data-name');
    const email = btn.getAttribute('data-email');
    const banned = btn.getAttribute('data-banned') === 'true';

    document.getElementById('edit-teacher-id').value = teacherId;
    document.getElementById('edit-teacher-name-input').value = name;
    document.getElementById('edit-teacher-email-input').value = email;
    document.getElementById('edit-teacher-banned').checked = banned;

    document.getElementById('edit-teacher-summary-name').innerText = name;
    document.getElementById('edit-teacher-summary-email').innerText = email;
    document.getElementById('edit-teacher-avatar').innerText = name.substring(0, 1).toUpperCase();

    document.getElementById('modal-edit-teacher').classList.add('active');
  });

  // Form: Edit Teacher Submit
  const formEditTeacher = document.getElementById('form-edit-teacher');
  if (formEditTeacher) {
    formEditTeacher.addEventListener('submit', async (e) => {
      e.preventDefault();
      const teacherId = document.getElementById('edit-teacher-id').value;
      const name = document.getElementById('edit-teacher-name-input').value.trim();
      const email = document.getElementById('edit-teacher-email-input').value.trim();
      const banned = document.getElementById('edit-teacher-banned').checked;

      try {
        await DB.updateTeacher(teacherId, name, email, banned);
        Toast.show('Teacher profile updated successfully.', 'success');
        document.getElementById('modal-edit-teacher').classList.remove('active');
        await DB.syncAllData();
        if (AppState.activeView === 'view-teachers') {
          UI.renderTeachers();
        } else if (AppState.activeView === 'view-batches') {
          UI.renderBatches();
        }
      } catch (err) {
        Toast.show('Failed to update teacher profile.', 'danger');
      }
    });
  }

  // Action: Wipe Teacher Profile (within edit modal)
  const btnWipeTeacher = document.getElementById('btn-wipe-teacher');
  if (btnWipeTeacher) {
    btnWipeTeacher.addEventListener('click', async () => {
      const teacherId = document.getElementById('edit-teacher-id').value;
      const name = document.getElementById('edit-teacher-summary-name').innerText;

      if (confirm(`WIPE TEACHER PROFILE?\n\nAre you sure you want to permanently delete teacher "${name}"? All batches taught by this teacher will be reset to TBD.`)) {
        try {
          await DB.deleteTeacher(teacherId);
          Toast.show(`Teacher "${name}" deleted successfully.`, 'success');
          document.getElementById('modal-edit-teacher').classList.remove('active');
          await DB.syncAllData();
          if (AppState.activeView === 'view-teachers') {
            UI.renderTeachers();
          } else if (AppState.activeView === 'view-batches') {
            UI.renderBatches();
          }
        } catch (err) {
          Toast.show(`Failed to wipe teacher profile: ${err.message || err}`, 'danger');
        }
      }
    });
  }

  // Event Delegation: Delete Teacher Profile (from row)
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.btn-delete-teacher');
    if (!btn) return;

    const teacherId = btn.getAttribute('data-id');
    const name = btn.getAttribute('data-name');

    if (confirm(`WIPE TEACHER PROFILE?\n\nAre you sure you want to permanently delete teacher "${name}"? All batches taught by this teacher will be reset to TBD.`)) {
      try {
        await DB.deleteTeacher(teacherId);
        Toast.show(`Teacher "${name}" deleted successfully.`, 'success');
        await DB.syncAllData();
        UI.renderTeachers();
      } catch (err) {
        Toast.show(`Failed to wipe teacher profile: ${err.message || err}`, 'danger');
      }
    }
  });

  // Password Visibility Toggle Handler
  document.addEventListener('click', (e) => {
    const toggle = e.target.closest('.toggle-password');
    if (!toggle) return;
    const targetId = toggle.getAttribute('data-target');
    const input = document.getElementById(targetId);
    if (!input) return;
    if (input.type === 'password') {
      input.type = 'text';
      toggle.classList.remove('fa-eye');
      toggle.classList.add('fa-eye-slash');
    } else {
      input.type = 'password';
      toggle.classList.remove('fa-eye-slash');
      toggle.classList.add('fa-eye');
    }
  });

  // Day Selector Click Handler
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.day-btn');
    if (!btn) return;
    btn.classList.toggle('active');
    UI.updateScheduleString();
  });

  // Time Picker Input Handler
  document.addEventListener('input', (e) => {
    if (e.target && e.target.id === 'batch-time-picker') {
      UI.updateScheduleString();
    }
  });

  // Handle incomplete time selections gracefully (prevent native popup, show custom Toast)
  document.addEventListener('invalid', (e) => {
    if (e.target && e.target.id === 'batch-time-picker') {
      if (e.target.validity.badInput) {
        e.preventDefault();
        Toast.show('Please complete the time selection (including AM/PM) or clear it.', 'danger');
        e.target.focus();
      }
    }
  }, true);

});

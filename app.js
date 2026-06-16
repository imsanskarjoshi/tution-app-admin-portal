/* ==========================================================================
   Educator HQ Command Console Controller
   ========================================================================== */

// Appwrite SDK bindings fallback
const { Client, Account, Databases, Query, ID } = window.Appwrite || {};

// ==========================================================================
// 1. STATE MANAGEMENT & ENVIRONMENT CONFIG
// ==========================================================================
const AppState = {
  isMockMode: true,
  currentUser: null,
  activeView: 'view-dashboard',
  
  // Cache storage lists
  batches: [],
  students: [],
  materials: [],
  chats: [],
  courses: [],
  enrollments: [],
  announcements: [],

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
    announcements: 'announcements'
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
        { batchId: 'b_1', name: 'Physics Honors 2026', subject: 'Physics', code: 'PHY101', teacherId: 'admin_hq', createdAt: '2026-01-15T10:00:00Z', description: 'Advanced electromagnetic theory and kinematics.' },
        { batchId: 'b_2', name: 'Calculus Advanced', subject: 'Mathematics', code: 'MAT202', teacherId: 'admin_hq', createdAt: '2026-02-10T12:00:00Z', description: 'Differential equations, integrations, and limits.' },
        { batchId: 'b_3', name: 'Organic Chemistry Fundamentals', subject: 'Chemistry', code: 'CHE303', teacherId: 'admin_hq', createdAt: '2026-03-01T14:30:00Z', description: 'Hydrocarbon reactions, IUPAC naming, and synthesis.' }
      ]));
    }
    if (!localStorage.getItem('hq_mock_users')) {
      localStorage.setItem('hq_mock_users', JSON.stringify([
        { userId: 'admin_hq', name: 'Sanskar Admin', email: 'sanskar@tuitionapp.com', role: 'admin', joinedAt: '2025-12-01T09:00:00Z' },
        { userId: 'std_1', name: 'John Doe', email: 'john.doe@gmail.com', role: 'student', joinedAt: '2026-01-20T11:00:00Z' },
        { userId: 'std_2', name: 'Jane Smith', email: 'jane.smith@gmail.com', role: 'student', joinedAt: '2026-02-15T09:30:00Z' },
        { userId: 'std_3', name: 'Robert Chen', email: 'robert.chen@gmail.com', role: 'student', joinedAt: '2026-03-10T15:00:00Z' },
        { userId: 'std_4', name: 'Emily Davis', email: 'emily.davis@gmail.com', role: 'student', joinedAt: '2026-04-05T10:00:00Z' }
      ]));
    }
    if (!localStorage.getItem('hq_mock_enrollments')) {
      localStorage.setItem('hq_mock_enrollments', JSON.stringify([
        { id: 'e_1', batchId: 'b_1', studentId: 'std_1', joinedAt: '2026-01-21T10:00:00Z', subscriptionExpiresAt: '2026-09-01T23:59:59Z', subscriptionPlan: '3_months' },
        { id: 'e_2', batchId: 'b_1', studentId: 'std_2', joinedAt: '2026-02-16T12:00:00Z', subscriptionExpiresAt: '2026-05-15T23:59:59Z', subscriptionPlan: 'expired' },
        { id: 'e_3', batchId: 'b_2', studentId: 'std_3', joinedAt: '2026-03-11T16:00:00Z', subscriptionExpiresAt: '2026-12-01T23:59:59Z', subscriptionPlan: '6_months' },
        { id: 'e_4', batchId: 'b_3', studentId: 'std_4', joinedAt: '2026-04-06T11:00:00Z', subscriptionExpiresAt: '2026-06-10T23:59:59Z', subscriptionPlan: 'expired' }
      ]));
    }
    if (!localStorage.getItem('hq_mock_materials')) {
      localStorage.setItem('hq_mock_materials', JSON.stringify([
        { materialId: 'm_1', batchId: 'b_1', title: 'Electromagnetism Lecture 1', description: 'Coulomb Law and static charges overview', fileUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', fileType: 'video', createdAt: '2026-01-22T09:00:00Z' },
        { materialId: 'm_2', batchId: 'b_2', title: 'Calculus derivatives cheat sheet', description: 'Standard derivative formulas with practice templates', fileUrl: 'https://pdfobject.com/pdf/sample.pdf', fileType: 'pdf', createdAt: '2026-02-12T14:00:00Z' },
        { materialId: 'm_3', batchId: 'b_3', title: 'Alkane & Alkene Synthesis Notes', description: 'Review summary of reaction triggers', fileUrl: 'https://pdfobject.com/pdf/sample.pdf', fileType: 'pdf', createdAt: '2026-03-05T10:00:00Z' }
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
        { courseId: 'crs_1', title: 'Organic Chemistry Masterclass', description: 'A complete video syllabus teaching carbon pathways, IUPAC formatting, and synthesis formulas.', coverImage: 'https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?w=450', price: 49.99, teacherId: 'admin_hq', contentSummary: '15 lectures • 4 mock tests • syllabus notes', createdAt: '2026-02-01T10:00:00Z' },
        { courseId: 'crs_2', title: 'High School Physics Boot Camp', description: 'Quick revision course for mechanics, kinematics, and circuit electricity models.', coverImage: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=450', price: 39.99, teacherId: 'admin_hq', contentSummary: '10 lectures • 3 quizzes', createdAt: '2026-02-15T11:00:00Z' }
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

// ==========================================================================
// 5. LIVE & MOCK DATA CONTROLLER METHODS
// ==========================================================================
const DB = {
  // Login Authentication
  async authenticate(email, password) {
    if (AppState.isMockMode) {
      // Mock Login
      const users = MockDB.get('users');
      const found = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.role === 'admin');
      if (found) {
        AppState.currentUser = found;
        return found;
      } else {
        throw new Error('Admin account credentials not found or unauthorized role in Mock Mode.');
      }
    } else {
      // Appwrite Login
      if (!appwriteClient && !initAppwrite()) {
        throw new Error('Appwrite could not be initialized. Please configure config.js first.');
      }
      
      // Clear current sessions
      try {
        await appwriteAccount.deleteSession({ sessionId: 'current' });
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
        await appwriteAccount.deleteSession({ sessionId: 'current' });
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
        await appwriteAccount.deleteSession({ sessionId: 'current' });
      } catch (e) {
        console.error('Session delete error', e);
      }
    }
    AppState.currentUser = null;
    document.body.classList.add('auth-mode');
    Toast.show('Session closed successfully.', 'info');
  },

  // Pull All Data for Cache synchronization
  async syncAllData() {
    if (AppState.isMockMode) {
      AppState.batches = MockDB.get('batches');
      AppState.students = MockDB.get('users').filter(u => u.role === 'student');
      AppState.materials = MockDB.get('materials');
      AppState.chats = MockDB.get('chats');
      AppState.courses = MockDB.get('courses');
      AppState.enrollments = MockDB.get('enrollments');
      AppState.announcements = MockDB.get('announcements');
    } else {
      // Fetch Live collections
      const [batchesDoc, usersDoc, materialsDoc, chatsDoc, coursesDoc, enrollmentsDoc, announcementsDoc] = await Promise.all([
        appwriteDatabases.listDocuments(AppwriteConfig.databaseId, AppwriteConfig.collections.batches),
        appwriteDatabases.listDocuments(AppwriteConfig.databaseId, AppwriteConfig.collections.users, [Query.equal('role', 'student')]),
        appwriteDatabases.listDocuments(AppwriteConfig.databaseId, AppwriteConfig.collections.materials),
        appwriteDatabases.listDocuments(AppwriteConfig.databaseId, AppwriteConfig.collections.chats),
        appwriteDatabases.listDocuments(AppwriteConfig.databaseId, AppwriteConfig.collections.courses),
        appwriteDatabases.listDocuments(AppwriteConfig.databaseId, AppwriteConfig.collections.enrollments),
        appwriteDatabases.listDocuments(AppwriteConfig.databaseId, AppwriteConfig.collections.announcements)
      ]);

      // Map doc entries
      AppState.batches = batchesDoc.documents.map(d => ({ batchId: d.$id, ...d }));
      AppState.students = usersDoc.documents.map(d => ({ userId: d.$id, ...d }));
      AppState.materials = materialsDoc.documents.map(d => ({ materialId: d.$id, ...d }));
      AppState.chats = chatsDoc.documents.map(d => ({ messageId: d.$id, ...d }));
      AppState.courses = coursesDoc.documents.map(d => ({ courseId: d.$id, ...d }));
      AppState.enrollments = enrollmentsDoc.documents.map(d => ({ id: d.$id, ...d }));
      AppState.announcements = announcementsDoc.documents.map(d => ({ announcementId: d.$id, ...d }));
    }
  },

  // CRUD: Create Batch
  async createBatch(name, subject, description, code) {
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
        teacherId: AppState.currentUser.userId,
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
        teacherId: AppState.currentUser.userId,
        createdAt: new Date().toISOString()
      };
      return await appwriteDatabases.createDocument(
        AppwriteConfig.databaseId,
        AppwriteConfig.collections.batches,
        id,
        payload
      );
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
        await appwriteDatabases.updateDocument(
          AppwriteConfig.databaseId,
          AppwriteConfig.collections.enrollments,
          docId,
          {
            subscriptionExpiresAt: formattedExpiry,
            subscriptionPlan: subPlan
          }
        );
      } else {
        await appwriteDatabases.createDocument(
          AppwriteConfig.databaseId,
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

  // CRUD: Publish Study Material
  async createMaterial(batchId, title, description, fileUrl, fileType) {
    if (AppState.isMockMode) {
      const materials = MockDB.get('materials');
      const newMat = {
        materialId: 'm_' + Date.now(),
        batchId,
        title,
        description,
        fileUrl,
        fileType,
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
        createdAt: new Date().toISOString()
      };
      return await appwriteDatabases.createDocument(
        AppwriteConfig.databaseId,
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
      return await appwriteDatabases.createDocument(
        AppwriteConfig.databaseId,
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

  // CRUD: Create or Edit Retail Course Store Item
  async upsertCourse(courseId, title, price, description, coverImage, contentSummary) {
    const payload = {
      title,
      price: parseFloat(price) || 0.0,
      description,
      coverImage: coverImage || 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=450',
      contentSummary,
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
        await appwriteDatabases.updateDocument(
          AppwriteConfig.databaseId,
          AppwriteConfig.collections.courses,
          courseId,
          payload
        );
      } else {
        await appwriteDatabases.createDocument(
          AppwriteConfig.databaseId,
          AppwriteConfig.collections.courses,
          ID.unique(),
          payload
        );
      }
    }
  }
};

// ==========================================================================
// 6. UI VIEW DRAWING & CHARTING CONTROLLER
// ==========================================================================
const UI = {
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
    }
  },

  // Render: Main Analytics view
  renderDashboard() {
    // Stat numbers
    document.getElementById('stat-students').innerText = AppState.students.length;
    document.getElementById('stat-batches').innerText = AppState.batches.length;
    document.getElementById('stat-materials').innerText = AppState.materials.length;
    
    // Revenue calculator: base batch count revenue + store course mock sum
    const totalEnrollmentsCount = AppState.enrollments.filter(e => e.subscriptionPlan !== 'expired').length;
    const estimatedRev = (totalEnrollmentsCount * 25) + AppState.courses.reduce((sum, c) => sum + (c.price * 3), 0);
    document.getElementById('stat-revenue').innerText = `$${estimatedRev.toFixed(2)}`;

    // Draw Dashboard Charts
    UI.drawEnrollmentChart();
    UI.drawSubjectChart();

    // Render Recent logs table
    const tbody = document.querySelector('#dashboard-recent-table tbody');
    tbody.innerHTML = '';

    const recentLogs = [...AppState.materials]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);

    if (recentLogs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;" class="text-secondary">No recent publish logs found.</td></tr>`;
      return;
    }

    recentLogs.forEach(item => {
      const batchName = AppState.batches.find(b => b.batchId === item.batchId)?.name || 'General';
      const row = document.createElement('tr');
      const timeStr = new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      row.innerHTML = `
        <td>
          <div style="display:flex; align-items:center; gap:8px;">
            <i class="fa-solid ${item.fileType === 'video' ? 'fa-circle-play text-amber' : 'fa-file-pdf text-red'}"></i>
            <strong>${escapeHTML(item.title)}</strong>
          </div>
        </td>
        <td>${escapeHTML(batchName)}</td>
        <td>Educator Console</td>
        <td>${timeStr}</td>
        <td><span class="badge badge-success">Published</span></td>
      `;
      tbody.appendChild(row);
    });
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
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;" class="text-muted">No classes matching query found.</td></tr>`;
      return;
    }

    filtered.forEach(batch => {
      const row = document.createElement('tr');
      const timeStr = new Date(batch.createdAt).toLocaleDateString();
      row.innerHTML = `
        <td><strong>${escapeHTML(batch.name)}</strong></td>
        <td><span class="badge badge-info">${escapeHTML(batch.subject)}</span></td>
        <td><code style="color:var(--secondary);font-size:14px;font-weight:700;">${escapeHTML(batch.code)}</code></td>
        <td><span style="font-family:monospace;color:var(--text-secondary);">${escapeHTML(batch.teacherId)}</span></td>
        <td>${timeStr}</td>
        <td>
          <div class="action-row-buttons">
            <button class="btn btn-secondary btn-mini btn-copy-code" data-code="${escapeHTML(batch.code)}">
              <i class="fa-solid fa-copy"></i> Copy Join Link
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(row);
    });
  },

  // Render: Student Registry
  renderStudents() {
    const tbody = document.querySelector('#students-table tbody');
    tbody.innerHTML = '';

    const searchVal = document.getElementById('search-students').value.toLowerCase();
    const filterPlan = document.getElementById('filter-students-plan').value;

    const filtered = AppState.students.filter(student => {
      // Name or email filter
      const matchesSearch = student.name.toLowerCase().includes(searchVal) || student.email.toLowerCase().includes(searchVal);
      
      // Access plan filter
      if (!matchesSearch) return false;
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
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;" class="text-muted">No students matching parameters.</td></tr>`;
      return;
    }

    filtered.forEach(student => {
      // Find batch enrollments
      const studentEnrollments = AppState.enrollments.filter(e => e.studentId === student.userId);
      
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
          <td>
            <div class="action-row-buttons">
              <button class="btn btn-secondary btn-mini btn-enroll-student-direct" data-student-id="${student.userId}">
                <i class="fa-solid fa-link"></i> Enroll to Batch
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
          <td>
            <div class="action-row-buttons">
              <button class="btn btn-primary btn-mini btn-edit-access" 
                      data-student-id="${student.userId}" 
                      data-batch-id="${enroll.batchId}" 
                      data-name="${escapeHTML(student.name)}" 
                      data-email="${escapeHTML(student.email)}" 
                      data-plan="${plan}" 
                      data-expiry="${enroll.subscriptionExpiresAt.split('T')[0]}"
                      data-enabled="${!(isExpired || plan === 'expired')}">
                <i class="fa-solid fa-user-shield"></i> Update Plan
              </button>
            </div>
          </td>
        `;
        tbody.appendChild(row);
      });
    });
  },

  // Render: Materials View
  renderMaterials() {
    const tbody = document.querySelector('#materials-table tbody');
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

      const row = document.createElement('tr');
      row.innerHTML = `
        <td><strong>${escapeHTML(mat.title)}</strong></td>
        <td>${escapeHTML(batchName)}</td>
        <td>${typeBadge}</td>
        <td><span class="text-secondary" style="font-size:12px;">${escapeHTML(mat.description)}</span></td>
        <td><a href="${escapeHTML(mat.fileUrl)}" target="_blank" class="text-link" style="color:var(--secondary);word-break:break-all;">${escapeHTML(mat.fileUrl)}</a></td>
        <td>${timeStr}</td>
        <td>
          <button class="btn btn-danger btn-mini btn-delete-material" data-id="${mat.materialId}" data-title="${escapeHTML(mat.title)}">
            <i class="fa-solid fa-trash-can"></i> WIPE
          </button>
        </td>
      `;
      tbody.appendChild(row);
    });
  },

  // Render: Moderation view layout
  renderModeration() {
    const listUl = document.getElementById('mod-batches-ul');
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
  },

  // Load chat logs inside moderation panel
  loadModerationChat(batch) {
    document.getElementById('mod-active-batch-name').innerText = batch.name;
    const codeEl = document.getElementById('mod-active-batch-code');
    codeEl.innerText = batch.code;
    codeEl.className = 'badge badge-info';

    const scroller = document.getElementById('chat-logs-scroller');
    scroller.innerHTML = '';

    const messages = AppState.chats
      .filter(c => c.batchId === batch.batchId)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    if (messages.length === 0) {
      scroller.innerHTML = `
        <div class="chat-empty-state">
          <i class="fa-regular fa-comment-dots"></i>
          <p>No chat history recorded in this batch yet.</p>
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

  // Render: Retail Store Catalog
  renderCourses() {
    const grid = document.getElementById('courses-grid-container');
    grid.innerHTML = '';

    if (AppState.courses.length === 0) {
      grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-secondary);" class="bg-glass">No courses listed in store. Publish your first Retail syllabus package.</div>`;
      return;
    }

    AppState.courses.forEach(course => {
      const card = document.createElement('div');
      card.className = 'course-card bg-glass';
      card.innerHTML = `
        <div class="course-banner" style="background-image: url('${escapeHTML(course.coverImage)}')">
          <span class="course-price-badge">$${course.price.toFixed(2)}</span>
        </div>
        <div class="course-info">
          <h4>${escapeHTML(course.title)}</h4>
          <p>${escapeHTML(course.description)}</p>
          <div class="course-stats-line">
            <i class="fa-solid fa-graduation-cap"></i>
            <span>${escapeHTML(course.contentSummary)}</span>
          </div>
          <div class="course-actions">
            <button class="btn btn-secondary btn-mini btn-edit-course" 
                    data-id="${course.courseId}" 
                    data-title="${escapeHTML(course.title)}" 
                    data-price="${course.price}" 
                    data-desc="${escapeHTML(course.description)}" 
                    data-summary="${escapeHTML(course.contentSummary)}" 
                    data-cover="${escapeHTML(course.coverImage)}">
              <i class="fa-solid fa-pen"></i> Edit Detail
            </button>
          </div>
        </div>
      `;
      grid.appendChild(card);
    });
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
          <button class="btn btn-danger btn-mini btn-delete-notice" data-id="${ann.announcementId}" data-title="${escapeHTML(ann.title)}">
            <i class="fa-solid fa-trash-can"></i> WIPE
          </button>
        </td>
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

document.addEventListener('DOMContentLoaded', () => {
  // Initialize mock structure
  MockDB.initialize();

  // Handle Login submission
  const loginForm = document.getElementById('login-form');
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const isMock = document.getElementById('mock-mode-toggle').checked;
    
    const btn = document.getElementById('btn-login');
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...`;

    try {
      AppState.isMockMode = isMock;
      
      // Execute DB verification
      await DB.authenticate(email, password);
      
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
    });
  });

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

  // Global search redirect logic
  document.getElementById('global-search').addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase();
    if (AppState.activeView === 'view-dashboard') return;
    
    const searchMap = {
      'view-batches': 'search-batches',
      'view-students': 'search-students',
      'view-materials': 'search-materials'
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
    document.getElementById('batch-code').value = 'BCH' + Math.floor(100 + Math.random() * 900);
    document.getElementById('modal-create-batch').classList.add('active');
  });

  document.getElementById('btn-generate-code').addEventListener('click', () => {
    document.getElementById('batch-code').value = 'BCH' + Math.floor(100 + Math.random() * 900);
  });

  document.getElementById('form-create-batch').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('batch-name').value;
    const subject = document.getElementById('batch-subject').value;
    const desc = document.getElementById('batch-description').value;
    const code = document.getElementById('batch-code').value;

    try {
      await DB.createBatch(name, subject, desc, code);
      Toast.show('Classroom batch successfully listed.', 'success');
      document.getElementById('modal-create-batch').classList.remove('active');
      await DB.syncAllData();
      UI.renderBatches();
    } catch (err) {
      Toast.show(err.message || 'Failed to list classroom.', 'danger');
    }
  });

  // Modal: Edit Student Access
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-edit-access');
    if (!btn) return;

    document.getElementById('edit-student-id').value = btn.getAttribute('data-student-id');
    document.getElementById('edit-student-batch-id').value = btn.getAttribute('data-batch-id');
    document.getElementById('edit-student-name').innerText = btn.getAttribute('data-name');
    document.getElementById('edit-student-email').innerText = btn.getAttribute('data-email');
    document.getElementById('edit-student-avatar').innerText = btn.getAttribute('data-name').substring(0, 1).toUpperCase();
    
    const plan = btn.getAttribute('data-plan');
    const expiry = btn.getAttribute('data-expiry');
    const enabled = btn.getAttribute('data-enabled') === 'true';

    document.getElementById('edit-student-plan').value = plan;
    document.getElementById('edit-student-expiry').value = expiry;
    document.getElementById('edit-student-enabled').checked = enabled;

    document.getElementById('modal-edit-student').classList.add('active');
  });

  document.getElementById('form-edit-student').addEventListener('submit', async (e) => {
    e.preventDefault();
    const studentId = document.getElementById('edit-student-id').value;
    const batchId = document.getElementById('edit-student-batch-id').value;
    const plan = document.getElementById('edit-student-plan').value;
    const expiry = document.getElementById('edit-student-expiry').value;
    const enabled = document.getElementById('edit-student-enabled').checked;

    try {
      await DB.updateStudentAccess(batchId, studentId, enabled, plan, expiry);
      Toast.show('Student subscription permissions updated.', 'success');
      document.getElementById('modal-edit-student').classList.remove('remove');
      document.getElementById('modal-edit-student').classList.remove('active');
      await DB.syncAllData();
      UI.renderStudents();
    } catch (err) {
      Toast.show('Failed to modify credentials.', 'danger');
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
    document.getElementById('modal-upload-material').classList.add('active');
  });

  document.getElementById('form-upload-material').addEventListener('submit', async (e) => {
    e.preventDefault();
    const batchId = document.getElementById('material-batch').value;
    const title = document.getElementById('material-title').value;
    const desc = document.getElementById('material-description').value;
    const type = document.getElementById('material-type').value;
    const url = document.getElementById('material-url').value;

    try {
      await DB.createMaterial(batchId, title, desc, url, type);
      Toast.show('Study material published successfully.', 'success');
      document.getElementById('modal-upload-material').classList.remove('active');
      await DB.syncAllData();
      UI.renderMaterials();
    } catch (err) {
      Toast.show('Failed to post lecture resources.', 'danger');
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

    try {
      await DB.upsertCourse(courseId, title, price, desc, cover, summary);
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

  // Compose Notice Broadcast Action
  document.getElementById('form-broadcast-notice').addEventListener('submit', async (e) => {
    e.preventDefault();
    const batchId = document.getElementById('notice-batch').value;
    const title = document.getElementById('notice-title').value;
    const content = document.getElementById('notice-content').value;

    if (!batchId) {
      Toast.show('Please select a batch classroom first.', 'warning');
      return;
    }

    try {
      await DB.createAnnouncement(batchId, title, content);
      Toast.show('Notice broadcasted successfully!', 'success');
      document.getElementById('form-broadcast-notice').reset();
      await DB.syncAllData();
      UI.renderNotices();
    } catch (err) {
      Toast.show('Notice broadcast failed.', 'danger');
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
        await DB.syncAllData();
        UI.renderNotices();
      } catch (err) {
        Toast.show('Failed to delete notice.', 'danger');
      }
    }
  });

});

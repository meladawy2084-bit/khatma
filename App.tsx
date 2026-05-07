import React, { useState, useEffect } from 'react';
import { 
  Khatma, 
  Juz, 
  User, 
  KhatmaStatus, 
  JuzStatus, 
  ReadingStatus,
  KhatmaVisibility
} from './types';
import { INITIAL_JUZ_LIST } from './constants';
import { CreateKhatmaModal } from './components/CreateKhatmaModal';
import { UserProfileModal } from './components/UserProfileModal';
import { AuthModal } from './components/AuthModal';
import { ShareModal } from './components/ShareModal';
import { JuzGrid } from './components/JuzGrid';
import { Button } from './components/Button';
import { generateCompletionDua } from './services/geminiService';
import { storageService } from './services/storageService';
import { auth } from './services/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  User as UserIcon,
  LayoutDashboard, 
  CalendarDays, 
  AlertCircle, 
  Trash2,
  Lock,
  Clock,
  Sparkles,
  BookOpen,
  LogOut,
  LogIn,
  Share2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const App: React.FC = () => {
  // --- State ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [khatmas, setKhatmas] = useState<Khatma[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [sharingKhatma, setSharingKhatma] = useState<Khatma | null>(null);
  const [expandedKhatmaIds, setExpandedKhatmaIds] = useState<Set<string>>(new Set());
  
  // --- Stats ---
  const filteredKhatmas = khatmas.filter(k => k.status !== KhatmaStatus.CANCELLED);
  const completedKhatmasCount = filteredKhatmas.filter(k => k.status === KhatmaStatus.COMPLETED).length;
  const activeKhatmasCount = filteredKhatmas.filter(k => k.status === KhatmaStatus.OPEN).length;
  
  // --- Auth Subscription ---
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const user = await storageService.syncUser(firebaseUser);
        setCurrentUser(user);
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return unsubscribeAuth;
  }, []);

  // --- Khatmas Subscription ---
  useEffect(() => {
    const unsubscribeKhatmas = storageService.subscribeToKhatmas(async (updatedKhatmas) => {
      // Check if we have a deep link to a private khatma
      const hash = window.location.hash;
      const match = hash.match(/#khatma-(.+)/);
      let list = updatedKhatmas;

      if (match) {
        const deepId = match[1];
        if (!list.some(k => k.id === deepId)) {
          const deepKhatma = await storageService.getKhatma(deepId);
          if (deepKhatma) {
            list = [deepKhatma, ...list];
          }
        }
      }
      setKhatmas(list);
    }, currentUser?.isAdmin || false);

    return unsubscribeKhatmas;
  }, [currentUser?.isAdmin]);

  // Simulated Email Notification System
  const sendEmailNotification = (subject: string, body: string) => {
    console.log(`[EMAIL SENT TO ADMIN]\nSubject: ${subject}\nBody: ${body}`);
    const toast = document.createElement('div');
    toast.className = "fixed bottom-4 left-4 bg-gray-800 text-white px-4 py-2 rounded shadow-lg z-[100] text-sm animate-bounce";
    toast.innerText = `📧 إشعار للأدمن: ${subject}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  };

  // --- Actions ---

  const handleLogout = async () => {
    await signOut(auth);
    setIsProfileModalOpen(false);
  };

  const handleCreateKhatma = async (title: string, startDate: string, endDate: string, visibility: KhatmaVisibility) => {
    const juzs = JSON.parse(JSON.stringify(INITIAL_JUZ_LIST));
    await storageService.createKhatma({ title, startDate, endDate, visibility }, juzs);
    setIsCreateModalOpen(false);
  };

  const handleReserveJuz = async (khatmaId: string, juzId: number) => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    await storageService.reserveJuz(khatmaId, juzId, currentUser.name);
  };

  const handleCancelReservation = async (khatmaId: string, juzId: number) => {
    const khatma = khatmas.find(k => k.id === khatmaId);
    if (!khatma) return;
    
    const part = khatma.parts.find(p => p.id === juzId);
    if (!part) return;

    if (currentUser && (currentUser.isAdmin || part.reservedById === currentUser.uid)) {
      await storageService.cancelReservation(khatmaId, juzId);

      sendEmailNotification(
        "إلغاء حجز جزء", 
        `قام ${currentUser.name} بإلغاء حجز الجزء ${part.label} في ختمة: ${khatma.title}`
      );
    } else {
      alert("لا يمكنك إلغاء حجز شخص آخر");
    }
  };

  const handleShareKhatma = (khatma: Khatma) => {
    setSharingKhatma(khatma);
    setIsShareModalOpen(true);
  };

  const handleToggleReadingStatus = async (khatmaId: string, juzId: number) => {
    const khatma = khatmas.find(k => k.id === khatmaId);
    if (!khatma) return;

    const part = khatma.parts.find(p => p.id === juzId);
    if (!part) return;

    const nextStatus = part.readingStatus === ReadingStatus.READING 
      ? ReadingStatus.COMPLETED 
      : ReadingStatus.READING;

    await storageService.updateJuzStatus(khatmaId, juzId, nextStatus);

    // Refresh local check for completion
    const updatedParts = khatma.parts.map(p => p.id === juzId ? { ...p, readingStatus: nextStatus } : p);
    const allCompleted = updatedParts.every(p => p.readingStatus === ReadingStatus.COMPLETED);

    if (allCompleted && khatma.status !== KhatmaStatus.COMPLETED) {
      sendEmailNotification(
        "اكتمال الختمة!", 
        `تم بحمد الله إكمال جميع أجزاء ختمة: ${khatma.title}`
      );
      
      const dua = await generateCompletionDua(khatma.title);
      await storageService.markKhatmaCompleted(khatmaId, dua);
    }
  };

  const handleAdminAction = async (khatmaId: string, action: 'close' | 'cancel' | 'extend', payload?: any) => {
    const khatma = khatmas.find(k => k.id === khatmaId);
    if (!khatma) return;

    const isOwner = currentUser && (khatma as any).createdBy === (currentUser as any).uid;
    if (!currentUser?.isAdmin && !isOwner) return;

    await storageService.adminAction(khatmaId, action, payload);
  };

  const calculateProgress = (parts: Juz[]) => {
    const completed = parts.filter(p => p.readingStatus === ReadingStatus.COMPLETED).length;
    return Math.round((completed / 30) * 100);
  };

  const toggleExpand = (id: string) => {
    setExpandedKhatmaIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-emerald-700 font-amiri text-xl animate-pulse">جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center overflow-hidden">
                 {/* Fallback Icon */}
                <Users className="w-6 h-6 text-emerald-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-800 font-amiri">خاتمة عائلتي</h1>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              
              {/* User Controls */}
              {currentUser ? (
                <div className="flex items-center gap-3 bg-gray-50 p-1.5 rounded-lg border">
                  <div className="flex items-center gap-2 px-2 border-l border-gray-200 pl-3">
                    <div className={`w-2 h-2 rounded-full ${currentUser.isAdmin ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                    <span className="text-sm font-bold text-gray-700 truncate max-w-[120px]">
                      {currentUser.name}
                    </span>
                    {currentUser.isAdmin && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 rounded">أدمن</span>}
                  </div>
                  
                  <button
                    onClick={() => setIsProfileModalOpen(true)}
                    className="p-1.5 hover:bg-white text-gray-600 rounded-md transition-all hover:shadow-sm hover:text-emerald-600"
                    title="الملف الشخصي"
                  >
                    <UserIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleLogout}
                    className="p-1.5 hover:bg-white text-gray-400 hover:text-red-500 rounded-md transition-all hover:shadow-sm"
                    title="تسجيل خروج"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <Button 
                  onClick={() => setIsAuthModalOpen(true)}
                  className="flex items-center gap-2 shadow-sm"
                  size="sm"
                >
                  <LogIn className="w-4 h-4" />
                  تسجيل الدخول
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 space-y-8">
        
        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">ختمات تمت بحمد الله</p>
                <h4 className="text-3xl font-bold text-gray-800">{completedKhatmasCount}</h4>
              </div>
            </div>
            <div className="text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full text-xs font-bold">مكتملة</div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-orange-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">ختمات شغالة حالياً</p>
                <h4 className="text-3xl font-bold text-gray-800">{activeKhatmasCount}</h4>
              </div>
            </div>
            <div className="text-orange-500 bg-orange-50 px-3 py-1 rounded-full text-xs font-bold font-amiri">قيد التنفيذ</div>
          </div>
        </div>

        {/* Global Create Button */}
        {currentUser && (
          <div className="flex justify-end">
            <Button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2 shadow-lg w-full md:w-auto">
              <LayoutDashboard className="w-5 h-5" />
              إنشاء ختمة جديدة
            </Button>
          </div>
        )}

        {/* Khatmas List */}
        {filteredKhatmas.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-4">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-medium text-gray-600 mb-2">لا توجد ختمات حالياً</h3>
            <p className="text-gray-400 mb-6">
              {currentUser?.isAdmin 
                ? 'ابدأ بإنشاء أول ختمة للعائلة' 
                : 'انتظر الأدمن لإنشاء ختمة جديدة'}
            </p>
            {currentUser?.isAdmin && (
              <Button onClick={() => setIsCreateModalOpen(true)}>ابدأ ختمة جديدة</Button>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {filteredKhatmas.map(khatma => {
              const progress = calculateProgress(khatma.parts);
              const isOwner = currentUser && (khatma as any).createdBy === (currentUser as any).uid;
              const hasAdminAccess = currentUser?.isAdmin || isOwner;
              const isExpanded = expandedKhatmaIds.has(khatma.id);
              
              return (
                <div key={khatma.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden transition-all hover:shadow-md">
                  {/* Khatma Header - Clickable Container */}
                  <div 
                    onClick={() => toggleExpand(khatma.id)}
                    className="w-full text-right p-6 border-b border-gray-100 bg-gradient-to-l from-white to-gray-50 hover:to-emerald-50/30 transition-colors group cursor-pointer"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleExpand(khatma.id); }}
                  >
                    <div className="flex flex-col md:flex-row justify-between md:items-start gap-4 mb-4">
                      <div className="flex-1">
                        <div className="flex items-center flex-wrap gap-3 mb-2">
                           <h2 className="text-2xl font-bold text-gray-800 font-amiri group-hover:text-emerald-700 transition-colors">{khatma.title}</h2>
                           {khatma.visibility === KhatmaVisibility.PRIVATE && (
                             <span className="flex items-center gap-1 bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-bold">
                               <Lock className="w-3 h-3" />
                               خاصة
                             </span>
                           )}
                           <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                             khatma.status === KhatmaStatus.OPEN ? 'bg-emerald-100 text-emerald-800' :
                             khatma.status === KhatmaStatus.COMPLETED ? 'bg-blue-100 text-blue-800' :
                             'bg-red-100 text-red-800'
                           }`}>
                             {khatma.status === KhatmaStatus.OPEN ? 'نشطة' :
                              khatma.status === KhatmaStatus.COMPLETED ? 'مكتملة' : 'ملغاة'}
                           </span>
                           <Button 
                             onClick={(e) => {
                               e.stopPropagation();
                               handleShareKhatma(khatma);
                             }}
                             variant="outline"
                             className="h-7 text-[10px] px-2 flex items-center gap-1.5 font-bold border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                           >
                             <Share2 className="w-3 h-3" />
                             مشاركة
                           </Button>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <CalendarDays className="w-3.5 h-3.5" />
                            {khatma.startDate}
                          </span>
                          <span>إلى</span>
                          <span className="flex items-center gap-1 font-medium text-gray-700">
                             {khatma.endDate}
                          </span>
                          <span className="mr-auto md:mr-0 flex items-center gap-1 font-bold text-emerald-600">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            {isExpanded ? 'إخفاء الأجزاء' : 'عرض الأجزاء والمشاركة'}
                          </span>
                        </div>
                      </div>
                      
                      {/* Admin Actions */}
                      {hasAdminAccess && (
                        <div className="flex flex-wrap gap-2" onClick={e => e.stopPropagation()}>
                          {khatma.status === KhatmaStatus.OPEN && (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 text-[10px] md:text-xs"
                                onClick={() => {
                                  const date = prompt("أدخل تاريخ النهاية الجديد", khatma.endDate);
                                  if (date) handleAdminAction(khatma.id, 'extend', date);
                                }}
                              >
                                <Clock className="w-4 h-4 ml-1" />
                                تمديد
                              </Button>
                              <Button 
                                variant="secondary" 
                                size="sm"
                                className="h-8 text-[10px] md:text-xs"
                                onClick={() => {
                                  if (confirm("هل أنت متأكد من إغلاق هذه الختمة؟")) {
                                    const comment = prompt("تعليق الإغلاق (اختياري)");
                                    handleAdminAction(khatma.id, 'close', comment || '');
                                  }
                                }}
                              >
                                <Lock className="w-4 h-4 ml-1" />
                                إغلاق
                              </Button>
                              <Button 
                                variant="danger" 
                                size="sm"
                                className="h-8 text-[10px] md:text-xs"
                                onClick={() => {
                                  if (confirm("هل أنت متأكد من إلغاء هذه الختمة؟ سيؤدي ذلك لإخفائها من القائمة العامة.")) {
                                    const comment = prompt("سبب الإلغاء (اختياري)");
                                    handleAdminAction(khatma.id, 'cancel', comment || '');
                                  }
                                }}
                              >
                                <Trash2 className="w-4 h-4 ml-1" />
                                إلغاء
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2 overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-1.5 rounded-full transition-all duration-1000 ease-out" 
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-500">
                       <span>نسبة الإنجاز: {progress}%</span>
                       <span>{khatma.parts.filter(p => p.readingStatus === ReadingStatus.COMPLETED).length} / 30 جزء</span>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden bg-gray-50/30"
                      >
                        {/* Admin/System Comment */}
                        {khatma.adminComment && (
                          <div className="mx-6 mt-4 p-3 bg-white border border-yellow-100 rounded-lg text-sm text-gray-600 flex items-start gap-2 shadow-sm">
                            <AlertCircle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                            <p>{khatma.adminComment}</p>
                          </div>
                        )}
                        
                        {/* Completion Dua */}
                        {khatma.completionDua && (
                           <div className="mx-6 mt-4 p-4 bg-emerald-50 border border-emerald-100 rounded-lg animate-in fade-in slide-in-from-bottom-2">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2 text-emerald-800 font-bold">
                                  <Sparkles className="w-5 h-5 text-yellow-500" />
                                  <span>دعاء الختمة</span>
                                </div>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-8 text-xs gap-1"
                                  onClick={() => {
                                    const text = `دعاء ختمة: ${khatma.title}\n\n${khatma.completionDua}\n\nتمت الختمة بحمد الله 🤲`;
                                    if (navigator.share) {
                                      navigator.share({ title: 'دعاء الختمة', text });
                                    } else {
                                      navigator.clipboard.writeText(text);
                                      alert("تم نسخ الدعاء!");
                                    }
                                  }}
                                >
                                  <Share2 className="w-3.5 h-3.5" />
                                  مشاركة الدعاء
                                </Button>
                              </div>
                              <p className="text-emerald-900 font-amiri text-lg leading-relaxed">
                                {khatma.completionDua}
                              </p>
                           </div>
                        )}

                        {/* Grid */}
                        <div className="p-6">
                          <JuzGrid 
                            parts={khatma.parts} 
                            khatmaStatus={khatma.status}
                            currentUser={currentUser || { name: '', isAdmin: false }}
                            onReserve={(juzId) => handleReserveJuz(khatma.id, juzId)}
                            onCancelReservation={(juzId) => handleCancelReservation(khatma.id, juzId)}
                            onToggleReadingStatus={(juzId) => handleToggleReadingStatus(khatma.id, juzId)}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <CreateKhatmaModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onCreate={handleCreateKhatma} 
      />
      
      {currentUser && (
        <UserProfileModal 
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          user={currentUser}
          khatmas={khatmas}
        />
      )}

      <AuthModal 
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      <ShareModal 
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        khatma={sharingKhatma}
      />
    </div>
  );
};

export default App;
import React from 'react';
import { User, Khatma, ReadingStatus, KhatmaStatus } from '../types';
import { Button } from './Button';
import { X, User as UserIcon, BookOpen, CheckCircle2, Circle } from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  khatmas: Khatma[];
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ 
  isOpen, 
  onClose, 
  user, 
  khatmas 
}) => {
  if (!isOpen) return null;

  // Filter parts reserved by the current user
  const userParts = khatmas.flatMap(k => 
    k.parts
      .filter(p => p.reservedById === user.uid)
      .map(p => ({ 
        ...p, 
        khatmaTitle: k.title, 
        khatmaStatus: k.status,
        khatmaEndDate: k.endDate
      }))
  );

  // Statistics
  const participatedKhatmas = new Set(userParts.map(p => p.khatmaTitle)).size;
  const completedCount = userParts.filter(p => p.readingStatus === ReadingStatus.COMPLETED).length;
  const readingCount = userParts.filter(p => p.readingStatus === ReadingStatus.READING).length;

  // Sort parts: Active reading first, then others
  const sortedParts = [...userParts].sort((a, b) => {
    if (a.readingStatus === ReadingStatus.READING && b.readingStatus !== ReadingStatus.READING) return -1;
    if (a.readingStatus !== ReadingStatus.READING && b.readingStatus === ReadingStatus.READING) return 1;
    return 0;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-4 border-b bg-emerald-50">
          <h3 className="text-lg font-bold text-emerald-800 flex items-center gap-2">
            <UserIcon className="w-5 h-5" />
            الملف الشخصي: {user.name}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-red-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-3 md:gap-4 mb-8">
             <div className="bg-emerald-50 p-3 md:p-4 rounded-lg border border-emerald-100 text-center">
                <div className="text-2xl md:text-3xl font-bold text-emerald-600 mb-1">{participatedKhatmas}</div>
                <div className="text-xs md:text-sm text-emerald-800">ختمات شاركت فيها</div>
             </div>
             <div className="bg-blue-50 p-3 md:p-4 rounded-lg border border-blue-100 text-center">
                <div className="text-2xl md:text-3xl font-bold text-blue-600 mb-1">{completedCount}</div>
                <div className="text-xs md:text-sm text-blue-800">أجزاء أتممتها</div>
             </div>
             <div className="bg-amber-50 p-3 md:p-4 rounded-lg border border-amber-100 text-center">
                <div className="text-2xl md:text-3xl font-bold text-amber-600 mb-1">{readingCount}</div>
                <div className="text-xs md:text-sm text-amber-800">أجزاء قيد القراءة</div>
             </div>
          </div>

          {/* Reserved Parts List */}
          <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2 border-b pb-2">
            <BookOpen className="w-5 h-5 text-gray-500" />
            سجل القراءة
          </h4>
          
          <div className="space-y-3">
            {sortedParts.length === 0 ? (
              <div className="text-center py-12 text-gray-400 border-2 border-dashed rounded-lg bg-gray-50">
                <UserIcon className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p>لم تقم بحجز أي أجزاء بعد</p>
              </div>
            ) : (
              sortedParts.map((part, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors bg-white shadow-sm group">
                  <div className="mb-2 sm:mb-0">
                    <div className="font-bold text-gray-800 text-lg group-hover:text-emerald-700 transition-colors">{part.label}</div>
                    <div className="text-sm text-gray-500 flex flex-wrap items-center gap-2 mt-1">
                      <span className="font-medium text-emerald-600">{part.khatmaTitle}</span>
                      <span className="text-gray-300">•</span>
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                        تاريخ النهاية: {part.khatmaEndDate}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {part.khatmaStatus !== KhatmaStatus.OPEN && (
                       <span className="text-xs px-2 py-1 bg-gray-100 text-gray-500 rounded border">
                         الختمة مغلقة
                       </span>
                    )}
                    {part.readingStatus === ReadingStatus.COMPLETED ? (
                      <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-4 h-4" />
                        تمت القراءة
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-sm font-medium text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200">
                         <Circle className="w-4 h-4" />
                         جاري القراءة
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="p-4 border-t bg-gray-50 flex justify-end">
          <Button onClick={onClose} variant="outline">إغلاق</Button>
        </div>
      </div>
    </div>
  );
};

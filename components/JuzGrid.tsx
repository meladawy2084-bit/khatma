import React from 'react';
import { Juz, JuzStatus, ReadingStatus, KhatmaStatus, User } from '../types';
import { CheckCircle2, Circle, User as UserIcon, BookOpen } from 'lucide-react';

interface JuzGridProps {
  parts: Juz[];
  khatmaStatus: KhatmaStatus;
  currentUser: User;
  onReserve: (juzId: number) => void;
  onCancelReservation: (juzId: number) => void;
  onToggleReadingStatus: (juzId: number) => void;
}

export const JuzGrid: React.FC<JuzGridProps> = ({ 
  parts, 
  khatmaStatus, 
  currentUser,
  onReserve,
  onCancelReservation,
  onToggleReadingStatus
}) => {
  const isKhatmaActive = khatmaStatus === KhatmaStatus.OPEN;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {parts.map((juz) => {
        const isReserved = juz.status === JuzStatus.RESERVED;
        const isMyReservation = juz.reservedById === currentUser.uid;
        const isCompleted = juz.readingStatus === ReadingStatus.COMPLETED;

        let cardBg = "bg-white border-gray-200";
        if (isCompleted) cardBg = "bg-emerald-50 border-emerald-200";
        else if (isReserved) cardBg = "bg-amber-50 border-amber-200";

        return (
          <div 
            key={juz.id} 
            className={`border rounded-xl p-3 shadow-sm transition-all duration-200 hover:shadow-md ${cardBg}`}
          >
            <div className="flex justify-between items-start mb-2">
              <span className="font-amiri font-bold text-lg text-gray-800">{juz.label}</span>
              {isCompleted ? (
                 <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : isReserved ? (
                 <Circle className="w-5 h-5 text-amber-500 fill-amber-200" />
              ) : (
                 <Circle className="w-5 h-5 text-gray-300" />
              )}
            </div>

            <div className="space-y-2">
              {/* Status Section */}
              <div className="min-h-[20px]">
                {isReserved ? (
                  <div className="flex items-center gap-1 text-xs text-gray-600 bg-white/50 p-1 rounded">
                    <UserIcon className="w-3 h-3" />
                    <span className="truncate max-w-[100px]">{juz.reservedBy}</span>
                  </div>
                ) : (
                   <span className="text-xs text-gray-400">متاح للحجز</span>
                )}
              </div>

              {/* Actions */}
              {isKhatmaActive && (
                <div className="pt-2 border-t border-gray-100/50">
                  {!isReserved && (
                    <button
                      onClick={() => onReserve(juz.id)}
                      disabled={!currentUser.uid}
                      className="w-full text-xs bg-emerald-600 text-white py-1.5 rounded hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                    >
                      حجز الجزء
                    </button>
                  )}

                  {isReserved && (isMyReservation || currentUser.isAdmin) && (
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => onToggleReadingStatus(juz.id)}
                        className={`w-full text-xs py-1.5 rounded flex items-center justify-center gap-1 transition-colors ${
                          isCompleted 
                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" 
                            : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                        }`}
                      >
                         <BookOpen className="w-3 h-3" />
                         {isCompleted ? "تمت القراءة" : "جاري القراءة"}
                      </button>
                      
                      <button
                        onClick={() => onCancelReservation(juz.id)}
                        className="w-full text-xs text-red-500 hover:text-red-600 underline py-0.5"
                      >
                        إلغاء الحجز
                      </button>
                    </div>
                  )}
                  {isReserved && !isMyReservation && !currentUser.isAdmin && (
                     <div className="text-[10px] text-gray-400 text-center py-1">محجوز</div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
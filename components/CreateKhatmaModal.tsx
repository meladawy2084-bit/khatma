import React, { useState } from 'react';
import { Button } from './Button';
import { X, Calendar, Globe, Lock } from 'lucide-react';
import { KhatmaVisibility } from '../types';

interface CreateKhatmaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (title: string, startDate: string, endDate: string, visibility: KhatmaVisibility) => void;
}

export const CreateKhatmaModal: React.FC<CreateKhatmaModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [visibility, setVisibility] = useState<KhatmaVisibility>(KhatmaVisibility.PUBLIC);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title && startDate && endDate) {
      onCreate(title, startDate, endDate, visibility);
      onClose();
      setTitle('');
      setEndDate('');
      setVisibility(KhatmaVisibility.PUBLIC);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-4 border-b bg-emerald-50">
          <h3 className="text-lg font-bold text-emerald-800 flex items-center gap-2 font-amiri">
            <Calendar className="w-5 h-5" />
            إنشاء ختمة جديدة
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-red-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">اسم الختمة / العائلة</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              placeholder="مثال: ختمة رمضان ١٤٤٥"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ البداية</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ النهاية</label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">نوع الخصوصية</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setVisibility(KhatmaVisibility.PUBLIC)}
                className={`flex items-center justify-center gap-2 p-3 border rounded-xl transition-all ${
                  visibility === KhatmaVisibility.PUBLIC 
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-bold shadow-sm' 
                    : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                <Globe className="w-4 h-4" />
                عامة
              </button>
              <button
                type="button"
                onClick={() => setVisibility(KhatmaVisibility.PRIVATE)}
                className={`flex items-center justify-center gap-2 p-3 border rounded-xl transition-all ${
                  visibility === KhatmaVisibility.PRIVATE 
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-bold shadow-sm' 
                    : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                <Lock className="w-4 h-4" />
                خاصة
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-400">
              {visibility === KhatmaVisibility.PUBLIC 
                ? 'تظهر للجميع في القائمة ويمكن لأي شخص المشاركة.' 
                : 'لا تظهر في القائمة العامة، يمكن الوصول لها فقط عبر الرابط المباشر.'}
            </p>
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>إلغاء</Button>
            <Button type="submit">إنشاء الختمة</Button>
          </div>
        </form>
      </div>
    </div>
  );
};
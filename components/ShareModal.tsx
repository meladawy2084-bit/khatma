import React, { useState } from 'react';
import { Button } from './Button';
import { X, Share2, Copy, Check, MessageCircle, Send } from 'lucide-react';
import { Khatma, JuzStatus, ReadingStatus } from '../types';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  khatma: Khatma | null;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, khatma }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !khatma) return null;

  const getStats = () => {
    const available = khatma.parts.filter(p => p.status === JuzStatus.AVAILABLE).length;
    const completed = khatma.parts.filter(p => p.readingStatus === ReadingStatus.COMPLETED).length;
    return { available, completed };
  };

  const { available, completed } = getStats();

  const khatmaUrl = `${window.location.origin}${window.location.pathname}#khatma-${khatma.id}`;

  const shareText = `السلام عليكم ورحمة الله وبركاته،
أدعوكم للمشاركة في ختمة: *${khatma.title}* 📖

📊 الحالة الحالية:
- المنجز: ${completed} / 30 جزء
- المتبقي: ${available} جزء متاح للحجز

انضم إلينا وشاركنا الأجر عبر الرابط التالي:
${khatmaUrl}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  };

  const handleTelegram = () => {
    const url = `https://t.me/share/url?url=${encodeURIComponent(khatmaUrl)}&text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: khatma.title,
          text: shareText,
          url: khatmaUrl,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-4 border-b bg-emerald-50">
          <h3 className="text-lg font-bold text-emerald-800 flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            مشاركة الختمة
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-red-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="bg-gray-50 p-4 rounded-lg border border-dashed border-gray-300">
            <p className="text-sm text-gray-600 font-amiri whitespace-pre-wrap leading-relaxed">
              {shareText}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleWhatsApp}
              className="flex items-center justify-center gap-2 py-3 px-4 bg-[#25D366] text-white rounded-lg hover:opacity-90 transition-opacity font-bold shadow-sm"
            >
              <MessageCircle className="w-5 h-5" />
              واتساب
            </button>
            <button
              onClick={handleTelegram}
              className="flex items-center justify-center gap-2 py-3 px-4 bg-[#0088cc] text-white rounded-lg hover:opacity-90 transition-opacity font-bold shadow-sm"
            >
              <Send className="w-5 h-5" />
              تيليجرام
            </button>
            <Button
              variant="outline"
              onClick={handleCopy}
              className="flex items-center justify-center gap-2 h-12"
            >
              {copied ? <Check className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5" />}
              {copied ? 'تم النسخ!' : 'نسخ النص'}
            </Button>
            {navigator.share && (
              <Button
                variant="outline"
                onClick={handleNativeShare}
                className="flex items-center justify-center gap-2 h-12"
              >
                <Share2 className="w-5 h-5" />
                خيارات أخرى
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

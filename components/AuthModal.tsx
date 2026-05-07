import React, { useState } from 'react';
import { X, LogIn } from 'lucide-react';
import { loginWithGoogle } from '../services/firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await loginWithGoogle();
      // App.tsx handles state via onAuthStateChanged
      onClose();
    } catch (err) {
      setError('فشل تسجيل الدخول بحساب جوجل. حاول مرة أخرى.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-8 space-y-6">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-gray-800 font-amiri">تسجيل الدخول</h3>
            <p className="text-sm text-gray-500 mt-2">
              سجل دخولك بحساب جوجل للمشاركة في الختمات وحجز الأجزاء
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-xl bg-white hover:bg-gray-50 transition-all shadow-sm active:scale-[0.98] disabled:opacity-50"
            >
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
              <span className="text-gray-700 font-bold">تسجيل الدخول باستخدام جوجل</span>
            </button>

            {loading && (
              <div className="flex justify-center">
                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}

            {error && (
              <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg text-center font-medium">
                {error}
              </div>
            )}
          </div>

          <div className="pt-4 flex flex-col gap-2">
            <button 
              type="button" 
              onClick={onClose}
              className="w-full text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              إلغاء
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

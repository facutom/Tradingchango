
import React, { useState, useEffect, useRef } from 'react';
import { supabase, getCatalogoMembresias, updateMemberships } from '../services/supabase';
import { Profile, Membership, UserMembership } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  profile: Profile | null;
  onSignOut: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, user, profile, onSignOut }) => {
  const [view, setView] = useState<'welcome' | 'form' | 'profile' | 'membresias'>(user ? 'profile' : 'welcome');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [catalogo, setCatalogo] = useState<Membership[]>([]);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (view === 'membresias') getCatalogoMembresias().then(setCatalogo);
  }, [view]);

  useEffect(() => {
    if (user) setView('profile');
    else setView('welcome');
  }, [user]);

  // Click outside listener
  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // (Lógica de autenticación existente...)
  };

  const toggleMembership = async (m: Membership) => {
    // (Lógica de membresías existente...)
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div 
        ref={modalRef}
        className="bg-white dark:bg-slate-950 w-full max-w-sm rounded-[2rem] p-8 relative shadow-2xl border border-slate-200 dark:border-slate-800"
      >
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 text-xl hover:text-slate-600 transition-colors">&times;</button>
        {/* Resto del contenido del modal... */}
        {view === 'welcome' && (
          <div className="text-center">
            <h2 className="text-2xl font-[800] mb-2 dark:text-white tracking-tighter">TradingChango</h2>
            <p className="text-slate-400 text-xs mb-8 font-bold uppercase tracking-widest">Unite a la comunidad</p>
            <button onClick={() => { setMode('register'); setView('form'); }} className="w-full bg-slate-900 dark:bg-white dark:text-black text-white py-4 rounded-xl font-bold mb-3 active:scale-95 transition-transform">Crear Cuenta PRO</button>
            <button onClick={() => { setMode('login'); setView('form'); }} className="w-full border border-slate-200 dark:border-slate-800 py-4 rounded-xl font-bold dark:text-white active:scale-95 transition-transform">Iniciar Sesión</button>
          </div>
        )}
        {/* (Vistas Profile, Form, Membresias siguen igual...) */}
      </div>
    </div>
  );
};

export default AuthModal;

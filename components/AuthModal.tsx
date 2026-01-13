
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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [catalogo, setCatalogo] = useState<Membership[]>([]);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (view === 'membresias') getCatalogoMembresias().then(setCatalogo);
  }, [view]);

  useEffect(() => {
    if (user) setView('profile');
    else {
      setView('welcome');
      setSuccess(null);
    }
  }, [user]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      if (mode === 'register') {
        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) {
          if (signUpError.message.includes('already registered')) throw new Error('Este email ya está registrado. Intentá iniciar sesión.');
          throw signUpError;
        }
        setSuccess('¡Cuenta creada! Revisá tu email o iniciá sesión.');
        setMode('login');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          if (signInError.message.includes('Invalid login credentials')) throw new Error('Email o contraseña incorrectos.');
          throw signInError;
        }
        setSuccess(`¡Bienvenido! Recuperando tu carrito...`);
        setTimeout(onClose, 2000);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleMembership = async (slug: string, option?: string) => {
    if (!profile) return;
    const current = profile.membresias || [];
    let next;
    const itemTipo = option || slug;
    const exists = current.find(m => m.slug === slug && m.tipo === itemTipo);
    if (exists) {
      next = current.filter(m => !(m.slug === slug && m.tipo === itemTipo));
    } else {
      next = [...current, { slug, tipo: itemTipo }];
    }
    await updateMemberships(profile.id, next);
    window.location.reload();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div ref={modalRef} className="bg-white dark:bg-slate-950 w-full max-w-sm rounded-[2rem] p-8 relative shadow-2xl border border-slate-200 dark:border-slate-800">
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 text-xl hover:text-slate-600 transition-colors">&times;</button>
        
        {success && <div className="mb-4 p-4 bg-green-500/10 border border-green-500/20 text-green-500 text-xs font-bold rounded-2xl text-center animate-in zoom-in">{success}</div>}
        {error && <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold rounded-2xl text-center animate-in shake">{error}</div>}

        {view === 'welcome' && (
          <div className="text-center">
            <h2 className="text-2xl font-black mb-1 dark:text-white">TradingChango</h2>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-8">Empoderá tus compras</p>
            <button onClick={() => { setMode('register'); setView('form'); }} className="w-full bg-slate-900 dark:bg-white dark:text-black text-white py-4 rounded-xl font-bold mb-3 active:scale-95 transition-all">Crear Cuenta</button>
            <button onClick={() => { setMode('login'); setView('form'); }} className="w-full border border-slate-200 dark:border-slate-800 py-4 rounded-xl font-bold dark:text-white active:scale-95 transition-all">Iniciar Sesión</button>
          </div>
        )}

        {view === 'form' && (
          <form onSubmit={handleAuth} className="space-y-4">
            <h3 className="text-xl font-black dark:text-white mb-4 uppercase tracking-tighter">{mode === 'login' ? 'Bienvenido' : 'Nueva Cuenta'}</h3>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" required className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl dark:text-white text-sm" />
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Contraseña" required className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl dark:text-white text-sm" />
            <button disabled={loading} className="w-full bg-green-500 text-white py-4 rounded-xl font-bold uppercase tracking-widest text-[11px] shadow-lg shadow-green-500/20 active:scale-95 transition-all">
              {loading ? 'Cargando...' : (mode === 'login' ? 'Entrar' : 'Registrarme')}
            </button>
            <button type="button" onClick={() => setView('welcome')} className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Volver</button>
          </form>
        )}

        {view === 'profile' && user && (
          <div className="text-center">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-2xl mx-auto mb-4 text-slate-500"><i className="fa-solid fa-user"></i></div>
            <h4 className="font-bold dark:text-white text-base mb-1 truncate">{user.email}</h4>
            <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-8">Usuario {profile?.subscription || 'Gratis'}</p>
            <div className="space-y-2">
              <button onClick={() => setView('membresias')} className="w-full bg-slate-50 dark:bg-slate-900 p-4 rounded-xl text-left flex items-center justify-between border border-slate-100 dark:border-slate-800"><span className="text-xs font-bold dark:text-white uppercase tracking-tight">Gestionar Membresías</span><i className="fa-solid fa-chevron-right text-slate-300"></i></button>
              <button onClick={onSignOut} className="w-full text-slate-400 text-[10px] font-black uppercase tracking-widest py-4">Cerrar Sesión</button>
            </div>
          </div>
        )}

        {view === 'membresias' && (
          <div className="max-h-[60vh] overflow-y-auto no-scrollbar">
            <h3 className="text-lg font-black dark:text-white mb-6 sticky top-0 bg-white dark:bg-slate-950 pb-2 z-10">Mis Membresías</h3>
            <div className="space-y-6">
              {catalogo.map(m => (
                <div key={m.slug} className="border-b border-slate-100 dark:border-slate-800 pb-4 last:border-0">
                  <div className="flex items-center gap-3 mb-3">
                    <img src={m.logo_url} alt={m.nombre} className="w-8 h-8 rounded-lg object-contain bg-white p-1" />
                    <span className="text-xs font-bold dark:text-white uppercase tracking-tight">{m.nombre}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {m.opciones?.length ? m.opciones.map(opt => {
                      const active = profile?.membresias?.some(um => um.slug === m.slug && um.tipo === opt);
                      return <button key={opt} onClick={() => toggleMembership(m.slug, opt)} className={`text-[9px] font-bold px-3 py-2 rounded-lg border transition-all ${active ? 'bg-green-500 text-white border-green-500' : 'bg-slate-50 dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800'}`}>{opt}</button>
                    }) : <button onClick={() => toggleMembership(m.slug)} className={`text-[9px] font-bold px-3 py-2 rounded-lg border transition-all ${profile?.membresias?.some(um => um.slug === m.slug) ? 'bg-green-500 text-white border-green-500' : 'bg-slate-50 dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800'}`}>Vincular {m.nombre}</button>}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setView('profile')} className="w-full bg-slate-900 dark:bg-white dark:text-black text-white py-4 rounded-xl font-bold mt-8 shadow-xl">Guardar y Volver</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthModal;

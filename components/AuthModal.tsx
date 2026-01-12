
import React, { useState, useEffect } from 'react';
import { supabase, getCatalogoMembresias } from '../services/supabase';
import { Profile, Membership, TabType } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  profile: Profile | null;
  onSignOut: () => void;
  onNavigate?: (tab: TabType) => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, user, profile, onSignOut, onNavigate }) => {
  const [view, setView] = useState<'welcome' | 'form' | 'profile' | 'membresias'>(user ? 'profile' : 'welcome');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [catalogo, setCatalogo] = useState<Membership[]>([]);

  useEffect(() => {
    if (view === 'membresias') {
      getCatalogoMembresias().then(setCatalogo);
    }
  }, [view]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'register') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert("¡Revisá tu email para confirmar!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.reload();
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    onSignOut();
    onClose();
    window.location.reload();
  };

  if (!isOpen) return null;

  const isPro = profile?.subscription === 'pro' || profile?.subscription === 'premium';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
      <div 
        className="bg-white dark:bg-slate-950 w-full max-w-sm rounded-[2.5rem] p-8 relative shadow-2xl border border-slate-100 dark:border-slate-900 overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-6 right-6 text-2xl text-slate-400 hover:text-slate-600">&times;</button>

        {view === 'welcome' && (
          <div className="text-center">
            <div className="text-5xl mb-4 text-slate-900 dark:text-white">🛒</div>
            <h2 className="text-2xl font-black mb-2 text-slate-900 dark:text-white tracking-tight">¡Hola, Trader!</h2>
            <p className="text-slate-500 text-sm mb-8 font-medium">Registrate gratis para guardar productos ilimitados.</p>
            <button 
              onClick={() => { setMode('register'); setView('form'); }}
              className="w-full bg-slate-900 dark:bg-white text-white dark:text-black py-4 rounded-2xl font-black text-sm uppercase tracking-wider mb-3 transition-transform active:scale-95"
            >
              Crear Cuenta Gratis
            </button>
            <button 
              onClick={() => { setMode('login'); setView('form'); }}
              className="w-full border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white py-4 rounded-2xl font-black text-sm uppercase tracking-wider transition-transform active:scale-95"
            >
              Ya tengo cuenta
            </button>
          </div>
        )}

        {view === 'form' && (
          <div>
            <h2 className="text-2xl font-black mb-6 text-slate-900 dark:text-white tracking-tight">{mode === 'login' ? 'Iniciar Sesión' : 'Nueva Cuenta'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input 
                type="email" 
                placeholder="Email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-4 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-sm"
                required
              />
              <input 
                type="password" 
                placeholder="Contraseña" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-4 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-sm"
                required
              />
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-slate-900 dark:bg-white text-white dark:text-black py-4 rounded-2xl font-black text-sm uppercase tracking-wider disabled:opacity-50"
              >
                {loading ? 'Procesando...' : 'Continuar'}
              </button>
            </form>
            <button onClick={() => setView('welcome')} className="w-full text-center mt-6 text-xs font-bold text-slate-400 uppercase tracking-widest">← Volver</button>
          </div>
        )}

        {view === 'profile' && profile && (
          <div className="text-center">
            <div className="text-5xl mb-4 text-slate-900 dark:text-white">👤</div>
            <h2 className="text-2xl font-black mb-1 text-slate-900 dark:text-white tracking-tight">{profile.nombre || 'Trader Pro'}</h2>
            <p className="text-slate-400 text-xs font-mono mb-8">{user.email}</p>
            
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 text-left mb-6 space-y-3">
               <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                 <span className="text-slate-400">Suscripción:</span>
                 <span className={isPro ? 'text-amber-500' : 'text-green-500'}>{profile.subscription}</span>
               </div>
               <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                 <span className="text-slate-400">Miembro desde:</span>
                 <span className="text-slate-900 dark:text-white">{new Date(user.created_at).toLocaleDateString()}</span>
               </div>
            </div>

            {/* Renovar Subscripción Block */}
            <div className="mb-8 p-5 bg-gradient-to-br from-amber-500 to-amber-600 rounded-3xl text-left shadow-lg shadow-amber-500/20">
               <div className="flex justify-between items-start mb-2">
                 <h4 className="text-white font-black text-sm uppercase tracking-tight">Acceso Trading Pro</h4>
                 <i className="fa-solid fa-crown text-amber-200"></i>
               </div>
               <p className="text-white/80 text-[10px] font-medium leading-relaxed mb-4">
                 Obtené comparativas ilimitadas, alertas de precios y soporte prioritario.
               </p>
               <button className="w-full bg-white text-amber-600 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-transform active:scale-95 shadow-sm">
                 Renovar Suscripción (Muy Pronto)
               </button>
            </div>

            <div className="text-left mb-8">
               <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 block">Mis Membresías</span>
               <div className="grid grid-cols-3 gap-2">
                  <button 
                    onClick={() => setView('membresias')}
                    className="aspect-square rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-green-500 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                  >
                    <i className="fa-solid fa-plus text-lg"></i>
                    <span className="text-[9px] font-bold mt-1">Agregar</span>
                  </button>
                  {profile.membresias.map((m, i) => (
                    <div key={i} className="aspect-square rounded-xl border border-green-500 bg-green-50 dark:bg-green-900/10 flex flex-col items-center justify-center p-2 relative">
                      <span className="text-[9px] font-black text-green-600 dark:text-green-400 text-center leading-tight uppercase">{m.slug}</span>
                      <span className="text-[7px] text-slate-400 absolute bottom-2">{m.tipo}</span>
                    </div>
                  ))}
               </div>
            </div>

            <div className="text-left mb-8 border-t border-slate-100 dark:border-slate-900 pt-6">
               <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 block">Información y Legal</span>
               <div className="space-y-2">
                  {[
                    { id: 'about', label: 'Acerca de TradingChango', icon: 'fa-circle-info' },
                    { id: 'contact', label: 'Contacto y Soporte', icon: 'fa-headset' },
                    { id: 'terms', label: 'Términos y Condiciones', icon: 'fa-file-shield' }
                  ].map(item => (
                    <button 
                      key={item.id}
                      onClick={() => onNavigate && onNavigate(item.id as TabType)}
                      className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <i className={`fa-solid ${item.icon} text-slate-400 text-xs w-4`}></i>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{item.label}</span>
                      </div>
                      <i className="fa-solid fa-chevron-right text-[10px] text-slate-300"></i>
                    </button>
                  ))}
               </div>
            </div>

            <button 
              onClick={signOut}
              className="w-full text-red-500 border border-red-500/20 py-4 rounded-2xl font-black text-sm uppercase tracking-wider transition-colors hover:bg-red-50 dark:hover:bg-red-900/10"
            >
              Cerrar Sesión
            </button>
          </div>
        )}

        {view === 'membresias' && (
          <div>
            <h2 className="text-xl font-black mb-6 text-slate-900 dark:text-white">Seleccionar Beneficio</h2>
            <div className="max-h-80 overflow-y-auto space-y-2 pr-2">
              {catalogo.length === 0 ? <p className="text-xs font-mono animate-pulse text-slate-400">Cargando catálogo...</p> : 
                catalogo.map(m => (
                  <div key={m.slug} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <img src={m.logo_url} className="w-6 h-6 object-contain" alt="" />
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{m.nombre}</span>
                    </div>
                    <i className="fa-solid fa-chevron-right text-[10px] text-slate-300"></i>
                  </div>
                ))
              }
            </div>
            <button onClick={() => setView('profile')} className="w-full text-center mt-6 text-xs font-bold text-slate-400 uppercase tracking-widest">← Volver</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthModal;

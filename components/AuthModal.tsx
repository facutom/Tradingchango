import React, { useState, useEffect, useRef } from 'react';
import { supabase, getCatalogoMembresias, updateMemberships } from '../services/supabase';
import { Profile, Membership, UserMembership } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  profile: Profile | null;
  onSignOut: () => void;
  onProfileUpdate?: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, user, profile, onSignOut, onProfileUpdate }) => {
  const [view, setView] = useState<'welcome' | 'form' | 'profile' | 'membresias'>(user ? 'profile' : 'welcome');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Campos del formulario
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  
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

  const toggleMembership = async (slug: string, tipo: string = 'standard') => {
    if (!user || !profile) return;
    
    const current = profile.membresias || [];
    const isSelected = current.some(m => m.slug === slug && m.tipo === tipo);
    const next = isSelected 
      ? current.filter(m => !(m.slug === slug && m.tipo === tipo))
      : [...current, { slug, tipo }];

    setLoading(true);
    setError(null);
    try {
      await updateMemberships(user.id, next);
      if (onProfileUpdate) onProfileUpdate();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (mode === 'register') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              nombre,
              apellido,
              fecha_nacimiento: fechaNacimiento,
            }
          }
        });

        if (signUpError) throw signUpError;
        
        if (data.user) {
          await supabase.from('perfiles').upsert({
            id: data.user.id,
            email,
            nombre,
            apellido,
            fecha_nacimiento: fechaNacimiento,
            subscription: 'free'
          });
        }

        setSuccess('¡Cuenta creada! Ya podés iniciar sesión.');
        setMode('login');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw new Error('Credenciales incorrectas.');
        
        setSuccess(`¡Cargando perfil!`);
        setTimeout(onClose, 1500);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    onSignOut();
    onClose();
    window.location.hash = 'home';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div ref={modalRef} className="bg-white dark:bg-slate-950 w-full max-w-sm rounded-[2.5rem] p-8 relative shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto no-scrollbar">
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 text-xl hover:text-slate-600 transition-colors">&times;</button>
        
        {success && <div className="mb-4 p-4 bg-green-500/10 border border-green-500/20 text-green-500 text-xs font-bold rounded-2xl text-center">{success}</div>}
        {error && <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold rounded-2xl text-center">{error}</div>}

        {view === 'welcome' && (
          <div className="text-center py-4">
            <div className="flex justify-center mb-6">
                <div className="logo">
                    <div className="logo-icon-wrapper">
                       <i className="fa-solid fa-cart-shopping" style={{ fontSize: '24px' }}></i>
                       <i className="fa-solid fa-arrow-trend-up trend-icon-overlay" style={{ fontSize: '14px' }}></i>
                    </div>
                </div>
            </div>
            <h2 className="text-2xl font-black mb-1 dark:text-white tracking-tighter">TradingChango</h2>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-10">Tu aliado contra la inflación</p>
            <button onClick={() => { setMode('register'); setView('form'); }} className="w-full bg-slate-900 dark:bg-white dark:text-black text-white py-4 rounded-2xl font-bold mb-3 active:scale-95 transition-all shadow-xl">Crear Cuenta</button>
            <button onClick={() => { setMode('login'); setView('form'); }} className="w-full border border-slate-200 dark:border-slate-800 py-4 rounded-2xl font-bold dark:text-white active:scale-95 transition-all">Iniciar Sesión</button>
          </div>
        )}

        {view === 'form' && (
          <form onSubmit={handleAuth} className="space-y-3">
            <h3 className="text-xl font-black dark:text-white mb-6 uppercase tracking-tighter">
              {mode === 'login' ? 'Entrar' : 'Registrarme'}
            </h3>
            
            {mode === 'register' && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Nombre" required className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl dark:text-white text-xs" />
                  <input type="text" value={apellido} onChange={e=>setApellido(e.target.value)} placeholder="Apellido" required className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl dark:text-white text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Fecha de Nacimiento</label>
                  <input type="date" value={fechaNacimiento} onChange={e=>setFechaNacimiento(e.target.value)} required className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl dark:text-white text-xs" />
                </div>
              </>
            )}

            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" required className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl dark:text-white text-xs" />
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Contraseña" required className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl dark:text-white text-xs" />
            
            <button disabled={loading} className="w-full bg-green-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-lg shadow-green-500/20 active:scale-95 transition-all mt-4">
              {loading ? '...' : (mode === 'login' ? 'Entrar' : 'Crear Cuenta')}
            </button>
            <button type="button" onClick={() => setView('welcome')} className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4">Volver</button>
          </form>
        )}

        {view === 'profile' && user && (
          <div className="text-center">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-900 rounded-3xl flex items-center justify-center text-3xl mx-auto mb-6 text-slate-400 border border-slate-100 dark:border-slate-800">
              <i className="fa-solid fa-user-astronaut"></i>
            </div>
            <h4 className="font-black dark:text-white text-lg mb-1 truncate tracking-tighter">
              {profile?.nombre ? `${profile.nombre} ${profile.apellido}` : user.email}
            </h4>
            <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-10">Membresía {profile?.subscription || 'Free'}</p>
            
            <div className="space-y-3">
              <button onClick={() => setView('membresias')} className="w-full bg-slate-50 dark:bg-slate-900 p-5 rounded-2xl text-left flex items-center justify-between border border-slate-100 dark:border-slate-800 active:scale-[0.98] transition-all">
                <span className="text-xs font-bold dark:text-white uppercase tracking-tight">Beneficios Bancarios</span>
                <i className="fa-solid fa-chevron-right text-slate-300"></i>
              </button>
              <button onClick={handleSignOut} className="w-full text-red-500 text-[10px] font-black uppercase tracking-widest py-6 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-2xl transition-all">Cerrar Sesión</button>
            </div>
          </div>
        )}

        {view === 'membresias' && (
          <div className="max-h-[60vh]">
            <h3 className="text-lg font-black dark:text-white mb-6 uppercase tracking-tighter">Vincular Beneficios</h3>
            <div className="space-y-6">
              {catalogo.map(m => (
                <div key={m.slug} className="border-b border-slate-100 dark:border-slate-800 pb-4 last:border-0">
                  <div className="flex items-center gap-3 mb-4">
                    <img src={m.logo_url} alt={m.nombre} className="w-10 h-10 rounded-xl object-contain bg-white p-1.5 shadow-sm" />
                    <span className="text-xs font-bold dark:text-white uppercase tracking-tight">{m.nombre}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {m.opciones?.length ? m.opciones.map(opt => {
                      const active = profile?.membresias?.some(um => um.slug === m.slug && um.tipo === opt);
                      return <button key={opt} onClick={() => toggleMembership(m.slug, opt)} className={`text-[9px] font-black px-4 py-2.5 rounded-xl border transition-all ${active ? 'bg-green-500 text-white border-green-500' : 'bg-slate-50 dark:bg-slate-900 text-slate-400'}`}>{opt}</button>
                    }) : <button onClick={() => toggleMembership(m.slug)} className={`text-[9px] font-black px-4 py-2.5 rounded-xl border transition-all ${profile?.membresias?.some(um => um.slug === m.slug) ? 'bg-green-500 text-white border-green-500' : 'bg-slate-50 dark:bg-slate-900 text-slate-400'}`}>Activar</button>}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setView('profile')} className="w-full bg-slate-900 dark:bg-white dark:text-black text-white py-4 rounded-2xl font-black mt-10 shadow-xl uppercase tracking-widest text-[10px]">Volver</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthModal;
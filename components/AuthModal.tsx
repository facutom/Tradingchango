
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
  savedCarts?: any[];
  onSaveCart?: (name: string) => void;
  onDeleteCart?: (index: number) => void;
  onLoadCart?: (index: number) => void;
  currentActiveCartSize: number;
}

const AuthModal: React.FC<AuthModalProps> = ({ 
  isOpen, onClose, user, profile, onSignOut, onProfileUpdate, 
  savedCarts = [], onSaveCart, onDeleteCart, onLoadCart,
  currentActiveCartSize
}) => {
  const [view, setView] = useState<'welcome' | 'form' | 'profile' | 'membresias' | 'mis_changos'>(user ? 'profile' : 'welcome');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newCartName, setNewCartName] = useState('');
  
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
            data: { nombre, apellido, fecha_nacimiento: fechaNacimiento }
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

        setSuccess(`¡Bienvenido ${nombre}! Cuenta creada.`);
        setMode('login');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw new Error('Credenciales incorrectas.');
        
        setSuccess(`¡Hola de nuevo! Cargando tu perfil...`);
        setTimeout(() => {
           if (onProfileUpdate) onProfileUpdate();
           onClose();
        }, 1200);
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
      <div ref={modalRef} className="bg-white dark:bg-black w-full max-w-sm rounded-[2rem] p-8 relative shadow-2xl border border-neutral-200 dark:border-neutral-800 max-h-[90vh] overflow-y-auto no-scrollbar">
        <button onClick={onClose} className="absolute top-6 right-6 text-neutral-400 text-xl hover:text-black dark:hover:text-white transition-colors">&times;</button>
        
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
            <p className="text-neutral-400 text-[10px] font-black uppercase tracking-widest mb-10">Tu aliado contra la inflación</p>
            <button onClick={() => { setMode('register'); setView('form'); }} className="w-full bg-black dark:bg-white dark:text-black text-white py-4 rounded-2xl font-bold mb-3 active:scale-95 transition-all shadow-xl">Crear Cuenta</button>
            <button onClick={() => { setMode('login'); setView('form'); }} className="w-full border border-neutral-200 dark:border-neutral-800 py-4 rounded-2xl font-bold dark:text-white active:scale-95 transition-all">Iniciar Sesión</button>
          </div>
        )}

        {view === 'form' && (
          <form onSubmit={handleAuth} className="space-y-3">
            <h3 className="text-xl font-black dark:text-white mb-6 uppercase tracking-tighter">
              {mode === 'login' ? '¡Hola de nuevo!' : 'Unite a la comunidad'}
            </h3>
            
            {mode === 'register' && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Nombre" required className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded-xl dark:text-white text-xs focus:ring-2 ring-black dark:ring-white outline-none" />
                  <input type="text" value={apellido} onChange={e=>setApellido(e.target.value)} placeholder="Apellido" required className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded-xl dark:text-white text-xs focus:ring-2 ring-black dark:ring-white outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-neutral-400 uppercase ml-1">Nacimiento</label>
                  <input type="date" value={fechaNacimiento} onChange={e=>setFechaNacimiento(e.target.value)} required className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded-xl dark:text-white text-xs" />
                </div>
              </>
            )}

            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" required className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded-xl dark:text-white text-xs focus:ring-2 ring-black dark:ring-white outline-none" />
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Contraseña" required className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded-xl dark:text-white text-xs focus:ring-2 ring-black dark:ring-white outline-none" />
            
            <button disabled={loading} className="w-full bg-green-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-lg shadow-green-500/20 active:scale-95 transition-all mt-4">
              {loading ? 'Procesando...' : (mode === 'login' ? 'Entrar' : 'Registrarme')}
            </button>
            <button type="button" onClick={() => setView('welcome')} className="w-full text-[10px] font-black text-neutral-400 uppercase tracking-widest mt-4 hover:text-black dark:hover:text-white transition-colors">Volver</button>
          </form>
        )}

        {view === 'profile' && user && (
          <div className="text-center animate-in fade-in duration-300">
            <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-900 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-5 text-neutral-500 border border-neutral-200 dark:border-neutral-800">
              <i className="fa-solid fa-user-astronaut"></i>
            </div>
            <h4 className="font-black dark:text-white text-xl mb-1 truncate tracking-tighter">
              ¡Hola, {profile?.nombre || user.email.split('@')[0]}!
            </h4>
            <p className="text-[9px] font-black text-green-500 uppercase tracking-[0.2em] mb-8">Nivel: {profile?.subscription || 'Ahorrista Free'}</p>
            
            <div className="space-y-2.5">
              <button onClick={() => setView('mis_changos')} className="w-full bg-neutral-50 dark:bg-neutral-900 p-4 rounded-2xl text-left flex items-center justify-between border border-neutral-100 dark:border-neutral-800 active:scale-[0.98] transition-all hover:border-black dark:hover:border-white">
                <div className="flex items-center gap-3">
                  <i className="fa-solid fa-cart-flatbed text-neutral-400"></i>
                  <span className="text-xs font-bold dark:text-white uppercase tracking-tight">Mis Changos</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-neutral-400">{savedCarts.length}/2</span>
                  <i className="fa-solid fa-chevron-right text-neutral-300"></i>
                </div>
              </button>
              
              <button onClick={() => setView('membresias')} className="w-full bg-neutral-50 dark:bg-neutral-900 p-4 rounded-2xl text-left flex items-center justify-between border border-neutral-100 dark:border-neutral-800 active:scale-[0.98] transition-all hover:border-black dark:hover:border-white">
                <div className="flex items-center gap-3">
                  <i className="fa-solid fa-id-card text-neutral-400"></i>
                  <span className="text-xs font-bold dark:text-white uppercase tracking-tight">Mis Beneficios</span>
                </div>
                <i className="fa-solid fa-chevron-right text-neutral-300"></i>
              </button>

              <button onClick={handleSignOut} className="w-full text-red-500 text-[9px] font-black uppercase tracking-widest py-4 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-2xl transition-all">Cerrar Sesión</button>
            </div>
          </div>
        )}

        {view === 'mis_changos' && (
          <div className="animate-in slide-in-from-right-4 duration-300">
            <h3 className="text-lg font-black dark:text-white mb-6 uppercase tracking-tighter">Mis Changos</h3>
            
            <div className="space-y-4 mb-8">
              {savedCarts.length === 0 ? (
                <div className="text-center py-6 bg-neutral-50 dark:bg-neutral-900/50 rounded-2xl border-2 border-dashed border-neutral-200 dark:border-neutral-800">
                  <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">No tenés changos guardados</p>
                </div>
              ) : (
                savedCarts.map((cart, idx) => (
                  <div key={idx} className="bg-neutral-50 dark:bg-neutral-900/80 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800 flex items-center justify-between group">
                    <div>
                      <h5 className="text-xs font-black dark:text-white uppercase tracking-tight">{cart.name}</h5>
                      <p className="text-[8px] text-neutral-400 font-bold uppercase mt-0.5">{Object.keys(cart.items).length} productos • {new Date(cart.date).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => { onLoadCart?.(idx); onClose(); }} className="w-8 h-8 rounded-lg bg-black dark:bg-white text-white dark:text-black flex items-center justify-center text-xs active:scale-90 transition-transform">
                        <i className="fa-solid fa-upload"></i>
                      </button>
                      <button onClick={() => onDeleteCart?.(idx)} className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center text-xs active:scale-90 transition-transform">
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {savedCarts.length < 2 && currentActiveCartSize > 0 && (
              <div className="bg-neutral-50 dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                <h5 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-3">Guardar Chango Actual</h5>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="NOMBRE (EJ: ASADO DOMINGO)" 
                    value={newCartName}
                    onChange={e => setNewCartName(e.target.value)}
                    className="flex-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 p-3 rounded-xl text-[10px] font-bold uppercase outline-none focus:ring-1 ring-black dark:ring-white dark:text-white"
                  />
                  <button 
                    disabled={!newCartName}
                    onClick={() => { onSaveCart?.(newCartName); setNewCartName(''); }}
                    className="px-4 rounded-xl bg-black dark:bg-white text-white dark:text-black text-[10px] font-black uppercase disabled:opacity-30 transition-opacity"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            )}

            <button onClick={() => setView('profile')} className="w-full mt-6 text-[9px] font-black text-neutral-400 uppercase tracking-widest hover:text-black dark:hover:text-white transition-colors">Volver</button>
          </div>
        )}

        {view === 'membresias' && (
          <div className="max-h-[60vh] animate-in slide-in-from-right-4 duration-300">
            <h3 className="text-lg font-black dark:text-white mb-6 uppercase tracking-tighter">Mis Beneficios</h3>
            <div className="space-y-5">
              {catalogo.map(m => (
                <div key={m.slug} className="border-b border-neutral-100 dark:border-neutral-900 pb-5 last:border-0">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-white border border-neutral-100 p-1.5 shadow-sm overflow-hidden flex items-center justify-center">
                      <img src={m.logo_url} alt={m.nombre} className="w-full h-full object-contain" />
                    </div>
                    <span className="text-xs font-bold dark:text-white uppercase tracking-tight">{m.nombre}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {m.opciones?.length ? m.opciones.map(opt => {
                      const active = profile?.membresias?.some(um => um.slug === m.slug && um.tipo === opt);
                      return <button key={opt} onClick={() => toggleMembership(m.slug, opt)} className={`text-[8px] font-black px-4 py-2.5 rounded-xl border transition-all ${active ? 'bg-green-500 text-white border-green-500 shadow-lg shadow-green-500/20' : 'bg-neutral-50 dark:bg-neutral-900 text-neutral-400 border-neutral-100 dark:border-neutral-800'}`}>{opt}</button>
                    }) : <button onClick={() => toggleMembership(m.slug)} className={`text-[8px] font-black px-4 py-2.5 rounded-xl border transition-all ${profile?.membresias?.some(um => um.slug === m.slug) ? 'bg-green-500 text-white border-green-500 shadow-lg shadow-green-500/20' : 'bg-neutral-50 dark:bg-neutral-900 text-neutral-400 border-neutral-100 dark:border-neutral-800'}`}>Activar</button>}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setView('profile')} className="w-full bg-black dark:bg-white dark:text-black text-white py-4 rounded-2xl font-black mt-10 shadow-xl uppercase tracking-widest text-[10px]">Listo</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthModal;


import React from 'react';

interface InfoViewProps {
  onClose: () => void;
  content?: string;
}

export const AboutView: React.FC<InfoViewProps> = ({ onClose, content }) => (
  <div className="p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto">
    <button onClick={onClose} className="mb-8 text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-2 font-bold text-[10px] uppercase tracking-widest transition-colors">
      <i className="fa-solid fa-arrow-left"></i> Volver al Inicio
    </button>
    <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-6 tracking-tighter">Acerca de TradingChango</h1>
    <div className="space-y-6 text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
      {content ? (
        <div className="whitespace-pre-wrap">{content}</div>
      ) : (
        <>
          <p>
            TradingChango nació de una necesidad simple pero poderosa: <span className="text-slate-900 dark:text-white font-bold">dejar de pagar de más por lo mismo.</span> En un contexto de alta volatilidad de precios, saber dónde comprar es la herramienta de ahorro más efectiva que tenemos.
          </p>
          <p>
            Nuestra plataforma procesa diariamente miles de precios de las cadenas más importantes de Argentina para ofrecerte una comparativa en tiempo real.
          </p>
        </>
      )}
      <div className="bg-green-50 dark:bg-green-900/10 p-6 rounded-3xl border border-green-100 dark:border-green-900/30 mt-8">
        <h3 className="text-green-600 dark:text-green-400 font-black uppercase text-[10px] tracking-widest mb-2">Nuestra Misión</h3>
        <p className="text-slate-900 dark:text-slate-200 text-sm italic">
          "Empoderar al consumidor argentino mediante la transparencia de datos."
        </p>
      </div>
    </div>
  </div>
);

export const TermsView: React.FC<InfoViewProps> = ({ onClose, content }) => (
  <div className="p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto">
    <button onClick={onClose} className="mb-8 text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-2 font-bold text-[10px] uppercase tracking-widest transition-colors">
      <i className="fa-solid fa-arrow-left"></i> Volver al Inicio
    </button>
    <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-6 tracking-tighter">Términos y Condiciones</h1>
    <div className="space-y-6 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
      {content ? (
        <div className="whitespace-pre-wrap">{content}</div>
      ) : (
        <section>
          <h3 className="text-slate-900 dark:text-white font-bold mb-2 uppercase text-[10px] tracking-widest">Naturaleza de los Datos</h3>
          <p>Los precios mostrados son obtenidos mediante técnicas de recolección de datos públicos de los sitios web de cada supermercado.</p>
        </section>
      )}
      <section className="pt-6 border-t border-slate-100 dark:border-slate-900 text-[9px] font-mono uppercase text-slate-400">
        Última actualización: {new Date().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
      </section>
    </div>
  </div>
);

export const ContactView: React.FC<InfoViewProps & { email?: string }> = ({ onClose, content, email }) => (
  <div className="p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto">
    <button onClick={onClose} className="mb-8 text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-2 font-bold text-[10px] uppercase tracking-widest transition-colors">
      <i className="fa-solid fa-arrow-left"></i> Volver al Inicio
    </button>
    <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-6 tracking-tighter">Contacto</h1>
    <p className="text-slate-500 dark:text-slate-400 mb-8 font-medium">¿Tenés una sugerencia o encontraste un error? Escribinos.</p>
    
    <div className="space-y-4">
      <a href={`mailto:${email || 'soporte@tradingchango.com'}`} className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 hover:scale-[1.02] transition-transform shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-2xl flex items-center justify-center text-xl">
            <i className="fa-solid fa-envelope"></i>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white">Email Soporte</h4>
            <p className="text-[10px] font-mono text-slate-400 uppercase">{email || 'soporte@tradingchango.com'}</p>
          </div>
        </div>
        <i className="fa-solid fa-chevron-right text-slate-300"></i>
      </a>
      
      {content && (
        <div className="mt-6 p-6 bg-slate-50 dark:bg-slate-900 rounded-3xl text-xs text-slate-500 border border-slate-100 dark:border-slate-800">
           {content}
        </div>
      )}
    </div>
  </div>
);

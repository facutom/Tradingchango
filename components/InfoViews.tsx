import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Product } from '../types';

interface InfoViewProps {
  onClose: () => void;
  content?: string;
}

// Componente reutilizable para la sección de Explorar Categorías
const ExploreCategories: React.FC = () => (
  <div className="mt-12 pt-8 border-t border-neutral-200 dark:border-neutral-800">
    <h3 className="text-sm font-black text-black dark:text-white mb-4 tracking-tight">Explorar Categorías</h3>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <Link 
        to="/almacen" 
        className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800 hover:scale-[1.02] transition-transform text-center"
      >
        <span className="font-bold text-sm text-black dark:text-white">Almacén</span>
      </Link>
      <Link 
        to="/lacteos" 
        className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800 hover:scale-[1.02] transition-transform text-center"
      >
        <span className="font-bold text-sm text-black dark:text-white">Lácteos</span>
      </Link>
      <Link 
        to="/limpieza" 
        className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800 hover:scale-[1.02] transition-transform text-center"
      >
        <span className="font-bold text-sm text-black dark:text-white">Limpieza</span>
      </Link>
      <Link 
        to="/bebidas" 
        className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800 hover:scale-[1.02] transition-transform text-center"
      >
        <span className="font-bold text-sm text-black dark:text-white">Bebidas</span>
      </Link>
    </div>
  </div>
);

export const AboutView: React.FC<InfoViewProps> = ({ onClose, content }) => (
  <div className="p-5 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto">
    <button onClick={onClose} className="mb-8 text-neutral-400 hover:text-black dark:hover:text-white flex items-center gap-2 font-bold text-[10px] uppercase tracking-widest transition-colors">
      <i className="fa-solid fa-arrow-left"></i> Volver al Inicio
    </button>
    
    <h1 className="text-xl sm:text-2xl font-black text-black dark:text-white mb-4 tracking-tighter">Acerca de TradingChango</h1>
    
    <div className="space-y-4 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed font-medium">
      {content ? (
        <div 
          className="dynamic-html-content"
          dangerouslySetInnerHTML={{ __html: content }} 
        />
      ) : (
        <>
          <p>
            TradingChango nació de una necesidad simple pero poderosa: <span className="text-black dark:text-white font-bold">dejar de pagar de más por lo mismo.</span> En un contexto de alta volatilidad de precios, saber dónde comprar es la herramienta de ahorro más efectiva que tenemos.
          </p>
          <p>
            Nuestra plataforma procesa diariamente miles de precios de las cadenas más importantes de Argentina para ofrecerte una comparativa en tiempo real.
          </p>
          
          <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-3xl border border-green-100 dark:border-green-900/30 mt-8">
            <h3 className="text-green-600 dark:text-green-400 font-black uppercase text-[10px] tracking-widest mb-2">Nuestra Misión</h3>
            <p className="text-black dark:text-neutral-200 text-sm italic">
              "Empoderar al consumidor argentino mediante la transparencia de datos."
            </p>
          </div>
        </>
      )}
    </div>
  </div>
);

export const TermsView: React.FC<InfoViewProps> = ({ onClose, content }) => (
  <div className="p-5 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto">
    <button onClick={onClose} className="mb-8 text-neutral-400 hover:text-black dark:hover:text-white flex items-center gap-2 font-bold text-[10px] uppercase tracking-widest transition-colors">
      <i className="fa-solid fa-arrow-left"></i> Volver al Inicio
    </button>
    <h1 className="text-xl sm:text-2xl font-black text-black dark:text-white mb-4 tracking-tighter">Términos y Condiciones</h1>
    <div className="space-y-6 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
      {content ? (
        <div dangerouslySetInnerHTML={{ __html: content }} />
      ) : (
        <section>
          <h3 className="text-black dark:text-white font-bold mb-2 uppercase text-[10px] tracking-widest">Naturaleza de los Datos</h3>
          <p>Los precios mostrados son obtenidos mediante técnicas de recolección de datos públicos de los sitios web de cada supermercado.</p>
        </section>
      )}
      
      <section className="pt-6 border-t border-neutral-100 dark:border-neutral-900">
        <h3 className="text-black dark:text-white font-bold mb-2 uppercase text-[10px] tracking-widest">Tratamiento de Datos y Mejora del Servicio</h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
          Para garantizar la precisión de los precios y la estabilidad técnica de la plataforma, TradingChango utiliza herramientas de análisis de terceros (Google Analytics y Microsoft Clarity). Al utilizar nuestra web, el usuario acepta la recolección anónima de datos de navegación, tales como términos de búsqueda, interacciones con productos y errores de carga. Esta información se utiliza exclusivamente para optimizar la experiencia de usuario, entender las tendencias de consumo en el mercado local y asegurar el correcto funcionamiento de la aplicación en dispositivos móviles. No compartimos ni comercializamos información personal identificable con terceros.
        </p>
      </section>

      <section className="pt-6 border-t border-neutral-100 dark:border-neutral-900 text-[9px] font-mono uppercase text-neutral-400">
        Última actualización: {new Date().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
      </section>
    </div>
  </div>
);

export const ContactView: React.FC<InfoViewProps & { email?: string }> = ({ onClose, content, email }) => (
  <div className="p-5 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto">
    <button onClick={onClose} className="mb-8 text-neutral-400 hover:text-black dark:hover:text-white flex items-center gap-2 font-bold text-[10px] uppercase tracking-widest transition-colors">
      <i className="fa-solid fa-arrow-left"></i> Volver al Inicio
    </button>
    <h1 className="text-xl sm:text-2xl font-black text-black dark:text-white mb-4 tracking-tighter">Contacto</h1>
    <div className="space-y-4 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed font-medium">
      <p className="text-black dark:text-white font-bold text-sm">
        ¿Tenés una sugerencia, detectaste un error o te interesa colaborar con TradingChango?
      </p>
      
      <p>
        Estamos abiertos a propuestas de publicidad, alianzas, integraciones y proyectos profesionales vinculados a datos, consumo y tecnología.
      </p>
      
      <p>
        Escribinos y te responderemos a la brevedad.
      </p>
    </div>

    
    <div className="mt-8 space-y-4">
      <a href="mailto:soporte@tradingchango.com" className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 hover:scale-[1.02] transition-transform shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white rounded-2xl flex items-center justify-center text-base">
            <i className="fa-solid fa-envelope"></i>
          </div>
          <div>
            <h4 className="font-bold text-black dark:text-white">Email Soporte</h4>
            <p className="text-[10px] font-mono text-neutral-400 uppercase">soporte@tradingchango.com</p>
          </div>
        </div>
        <i className="fa-solid fa-chevron-right text-neutral-600"></i>
      </a>
      
      {content && (
        <div 
          className="mt-6 p-4 bg-neutral-50 dark:bg-neutral-900 rounded-3xl text-xs text-neutral-500 border border-neutral-100 dark:border-neutral-800"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      )}
    </div>
  </div>
);

// ========== LANDING PAGES SEO ==========

export const ComparePricesView: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="p-5 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[800px] mx-auto">
    <button onClick={onClose} className="mb-8 text-neutral-400 hover:text-black dark:hover:text-white flex items-center gap-2 font-bold text-[10px] uppercase tracking-widest transition-colors">
      <i className="fa-solid fa-arrow-left"></i> Volver al Inicio
    </button>
    
    <h1 className="text-xl sm:text-2xl font-black text-black dark:text-white mb-4 tracking-tighter">Guía de Dispersión de Precios en Argentina</h1>
    
    <div style={{ lineHeight: '1.7' }} className="space-y-6 text-sm text-neutral-700 dark:text-neutral-300">
      <p>
        La <span className="text-black dark:text-white font-bold">dispersión de precios</span> es la variación significativa que existe entre el mismo producto en diferentes supermercados. En Argentina, esta diferencia puede superar el <span className="text-black dark:text-white font-bold">50%</span> para productos idénticos.
      </p>
      
      <h2 className="text-base font-black text-black dark:text-white mt-6 mb-3">¿Por qué varía tanto el precio?</h2>
      <p>
        Los supermercados utilizan diferentes estrategias de precios según su ubicación, política comercial y público objetivo. Mientras que algunas cadenas priorizan precios bajos, otras se enfocan en conveniencia o variedad.
      </p>
      
      <h2 className="text-base font-black text-black dark:text-white mt-6 mb-3">Cómo aprovechar las diferencias</h2>
      <ul className="list-disc pl-6 space-y-3">
        <li>Compará precios antes de ir al supermercado</li>
        <li>Considerá el costo por unidad de medida (kg, litro, unidad)</li>
        <li>Verificá precios en múltiples cadenas simultáneamente</li>
        <li>Aprovechá las ofertas de cada supermercado para diferentes categorías</li>
      </ul>
      
      <div className="my-8 p-4 bg-green-50 dark:bg-green-900/10 rounded-3xl border border-green-100 dark:border-green-900/30">
        <h3 className="text-green-600 dark:text-green-400 font-black uppercase text-[10px] tracking-widest mb-3">Consejo TradingChango</h3>
        <p className="text-black dark:text-neutral-200">
          No siempre el supermercado más cercano es el más económico. Con nuestra herramienta podés identificar brechas significativas de precios y optimizar el costo de tu <b>carro de compras completo</b> eligiendo la opción más conveniente.
        </p>
      </div>
    </div>
    
    <ExploreCategories />
  </div>
);

export const HowToSaveView: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="p-5 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[800px] mx-auto">
    <button onClick={onClose} className="mb-8 text-neutral-400 hover:text-black dark:hover:text-white flex items-center gap-2 font-bold text-[10px] uppercase tracking-widest transition-colors">
      <i className="fa-solid fa-arrow-left"></i> Volver al Inicio
    </button>
    
    <h1 className="text-xl sm:text-2xl font-black text-black dark:text-white mb-4 tracking-tighter">5 Consejos para Compras Inteligentes</h1>
    
    <div style={{ lineHeight: '1.7' }} className="space-y-6 text-sm text-neutral-700 dark:text-neutral-300">
      <p>
        En un contexto de inflación constante, cada peso cuenta. Descubrí cómo <span className="text-black dark:text-white font-bold">maximizar tu presupuesto</span> con estas estrategias probadas.
      </p>
      
      <div className="space-y-6">
        <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800">
          <h3 className="text-sm font-black text-black dark:text-white mb-3">1. Elegí Marcas Blancas</h3>
          <p>
            Las marcas propias de los supermercados ofrecen productos de calidad similar a las marcas líderes pero hasta <span className="text-black dark:text-white font-bold">40% más económicas</span>. En productos básicos como arroz, fideos, aceite y leche, la diferencia de calidad es mínima.
          </p>
        </div>
        
        <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800">
          <h3 className="text-sm font-black text-black dark:text-white mb-3">2. Stockeo Preventivo</h3>
          <p>
            Cuando encontrás un buen precio, considerate comprar para varios meses. Productos no perecederos como leche en tetra brick, arroz, fideos y conservas pueden almacenarse y representan un <span className="text-black dark:text-white font-bold">ahorro significativo</span> a largo plazo.
          </p>
        </div>
        
        <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800">
          <h3 className="text-sm font-black text-black dark:text-white mb-3">3. Compará por Unidad de Medida</h3>
          <p>
            No te dejes engañar por el precio final. Siempre calculá el costo por kilogramo, litro o unidad. Un producto más caro puede ser más económico si viene en mayor cantidad. <span className="text-black dark:text-white font-bold">Ejemplo:</span> 2L de leche a $1.500 es mejor que 1L a $700.
          </p>
        </div>
        
        <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800">
          <h3 className="text-sm font-black text-black dark:text-white mb-3">4. Planificá tu Carrito</h3>
          <p>
            Antes de ir al supermercado, hacé una lista y sticking a ella. Los supermercados están diseñados para tentarte con ofertas en productos que no necesitás. Comprá <span className="text-black dark:text-white font-bold">solo lo planificado</span> y evitá compras impulsivas.
          </p>
        </div>
        
        <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800">
          <h3 className="text-sm font-black text-black dark:text-white mb-3">5. Descargá las Apps de Supermercados</h3>
          <p>
            Muchas cadenas ofrecen precios exclusivos y descuentos adicionales a través de sus aplicaciones móviles. También podés recibir <span className="text-black dark:text-white font-bold">notificaciones de ofertas</span> y aprovechar precios especiales online.
          </p>
        </div>
      </div>
      
      <div className="my-8 p-4 bg-green-50 dark:bg-green-900/10 rounded-3xl border border-green-100 dark:border-green-900/30">
        <h3 className="text-green-600 dark:text-green-400 font-black uppercase text-[10px] tracking-widest mb-3">Resumen</h3>
        <p className="text-black dark:text-neutral-200">
          Combinando estas estrategias podés reducir significativamente el costo total de tus consumos mensuales. El secreto de un presupuesto eficiente está en la <b>consistencia</b> y en utilizar datos objetivos para <b>comparar siempre</b> antes de comprar.
        </p>
      </div>
    </div>
    
    <ExploreCategories />
  </div>
);

export const PriceHistoryView: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = React.useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate('/?q=' + encodeURIComponent(searchTerm.trim()));
    }
  };

  return (
  <div className="p-5 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[800px] mx-auto">
    <button onClick={onClose} className="mb-8 text-neutral-400 hover:text-black dark:hover:text-white flex items-center gap-2 font-bold text-[10px] uppercase tracking-widest transition-colors">
      <i className="fa-solid fa-arrow-left"></i> Volver al Inicio
    </button>
    
    <h1 className="text-xl sm:text-2xl font-black text-black dark:text-white mb-4 tracking-tighter">Trazabilidad de Precios: Detectá Ofertas Verdaderas</h1>
    
    <div style={{ lineHeight: '1.7' }} className="space-y-6 text-sm text-neutral-700 dark:text-neutral-300">
      <p>
        La <span className="text-black dark:text-white font-bold">trazabilidad de precios</span> es el registro histórico del costo de un producto a lo largo del tiempo. Esta herramienta es fundamental para identificar ofertas reales vs. ofertas falsas.
      </p>
      
      <h2 className="text-base font-black text-black dark:text-white mt-6 mb-3">¿Por qué es importante?</h2>
      <p>
        Muchos supermercados utilizan tácticas de <span className="text-black dark:text-white font-bold">marketing engañoso</span> para aparentar ofertas. Sin historial de precios, es imposible saber si un precio es realmente conveniente.
      </p>
      
      <div className="my-8 p-6 bg-red-50 dark:bg-red-900/10 rounded-3xl border border-red-100 dark:border-red-900/30">
        <h3 className="text-red-600 dark:text-red-400 font-black uppercase text-[10px] tracking-widest mb-3">Ofertas Falsas Comunes</h3>
        <ul className="list-disc pl-6 space-y-2 text-black dark:text-neutral-200">
          <li><span className="font-bold">"Era $X, ahora $Y"</span> - El precio "anterior" nunca existió</li>
          <li><span className="font-bold">"2x1"</span> - El precio se infló previamente</li>
          <li><span className="font-bold">"Precio de oferta"</span> - Es el precio habitual en otros supermercados</li>
        </ul>
      </div>
      
      <h2 className="text-base font-black text-black dark:text-white mt-6 mb-3">Cómo usar el historial a tu favor</h2>
      <ul className="list-disc pl-6 space-y-3">
        <li><span className="text-black dark:text-white font-bold">Compará:</span> Verificá si el precio actual es más bajo que el promedio de los últimos 30 días</li>
        <li><span className="text-black dark:text-white font-bold">Anticipá:</span> Identificá patrones estacionales (ofertas en enero, diciembre)</li>
        <li><span className="text-black dark:text-white font-bold">Decidí:</span> Comprá solo cuando el precio esté por debajo del promedio histórico</li>
        <li><span className="text-black dark:text-white font-bold">Confirmá:</span> Verificá que el precio más bajo sea consistente en el tiempo</li>
      </ul>
      
      <h2 className="text-base font-black text-black dark:text-white mt-6 mb-3">Nuestra Tecnología</h2>
      <p>
        TradingChango registra precios diariamente de los principales supermercados de Argentina. Nuestra base de datos te permite acceder al <span className="text-black dark:text-white font-bold">historial completo</span> de cualquier producto para que tomes decisiones informadas.
      </p>
      
      <div className="mt-8 p-4 bg-neutral-50 dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800">
        <p className="text-black dark:text-white font-bold text-center">
          ¿Encontraste un precio que parece oferta? Verificá su historial antes de comprar.
        </p>
        <form onSubmit={handleSearch} className="mt-4 flex justify-center gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Nombre del producto..."
            className="w-full max-w-xs px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl font-bold text-sm"
          />
          <button type="submit" className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black font-bold rounded-2xl hover:scale-[1.02] transition-transform">
            Buscar
          </button>
        </form>
      </div>
    </div>
    
    <ExploreCategories />
  </div>
  );
};

export const WeeklyOffersView: React.FC<{ onClose: () => void; products?: Product[] }> = ({ onClose, products = [] }) => {
  const navigate = useNavigate();
  // Estado para filtros
  const [selectedStore, setSelectedStore] = React.useState<string>('all');
  const [selectedDiscountType, setSelectedDiscountType] = React.useState<string>('all');
  const [displayCount, setDisplayCount] = React.useState(20);

  // Función para generar slug del producto
  const generateSlug = (nombre: string, categoria: string): string => {
    const slugify = (text: string) => text
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    return `/${slugify(categoria)}/${slugify(nombre)}`;
  };

  // Función para clasificar el tipo de descuento
  const getDiscountType = (oferta: string): string | null => {
    const lower = oferta.toLowerCase().trim();
    if (lower.includes('3x2') || lower.includes('3 x 2') || lower.includes('3x 2') || lower.includes('3 x2')) return oferta.trim();
    if (lower.includes('2x1') || lower.includes('2 x 1') || lower.includes('2x 1') || lower.includes('2 x1')) return oferta.trim();
    if (lower.includes('4x3') || lower.includes('4 x 3') || lower.includes('4x 3') || lower.includes('4 x3')) return oferta.trim();
    if (lower.includes('pack') || lower.includes('bonificado') || lower.includes('lleval') || lower.includes('llevá')) return oferta.trim();
    if (lower.includes('2do') || lower.includes('segundo') || lower.includes('%')) return oferta.trim();
    return null;
  };

  // Obtener supermercados únicos que tienen ofertas
  const storesWithOffers = React.useMemo(() => {
    const stores = new Set<string>();
    products.forEach(p => {
      if (p.oferta_gondola && typeof p.oferta_gondola === 'object') {
        Object.keys(p.oferta_gondola).forEach(store => {
          const oferta = p.oferta_gondola[store];
          if (oferta && typeof oferta === 'string' && oferta.trim().length > 0) {
            stores.add(store);
          }
        });
      }
    });
    return Array.from(stores).sort();
  }, [products]);

  // Obtener tipos de descuento únicos disponibles
  const discountTypesAvailable = React.useMemo(() => {
    const types = new Set<string>();
    products.forEach(p => {
      if (p.oferta_gondola && typeof p.oferta_gondola === 'object') {
        Object.values(p.oferta_gondola).forEach(oferta => {
          if (oferta && typeof oferta === 'string' && oferta.trim()) {
            const tipo = getDiscountType(oferta);
            if (tipo) types.add(tipo);
          }
        });
      }
    });
    return Array.from(types).sort();
  }, [products]);

  // Filtrar productos que tienen ofertas en gondola y están visibles
  const productsWithOffers = products.filter(p => {
    if (p.visible_web === false) return false;
    if (p.oferta_gondola && typeof p.oferta_gondola === 'object') {
      const ofertas = Object.values(p.oferta_gondola);
      return ofertas.some(oferta => oferta && typeof oferta === 'string' && oferta.trim().length > 0);
    }
    return false;
  });

  // Aplicar filtros
  const filteredProducts = productsWithOffers.filter(p => {
    if (selectedStore !== 'all') {
      const oferta = p.oferta_gondola?.[selectedStore];
      if (!oferta || typeof oferta !== 'string' || !oferta.trim()) return false;
    }
    if (selectedDiscountType !== 'all') {
      const tieneTipo = Object.values(p.oferta_gondola || {}).some(oferta => {
        if (oferta && typeof oferta === 'string' && oferta.trim()) {
          return getDiscountType(oferta) === selectedDiscountType;
        }
        return false;
      });
      if (!tieneTipo) return false;
    }
    return true;
  });

  const hasOffers = filteredProducts.length > 0;
  const totalWithOffers = productsWithOffers.length;
  const showStoreFilter = storesWithOffers.length > 1;
  const showTypeFilter = discountTypesAvailable.length > 1;

  return (
    <div className="p-5 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[800px] mx-auto">
      <button onClick={onClose} className="mb-8 text-neutral-400 hover:text-black dark:hover:text-white flex items-center gap-2 font-bold text-[10px] uppercase tracking-widest transition-colors">
        <i className="fa-solid fa-arrow-left"></i> Volver al Inicio
      </button>
      
      <h1 className="text-xl sm:text-2xl font-black text-black dark:text-white mb-4 tracking-tighter">Ofertas de la Semana</h1>
      
      <div style={{ lineHeight: '1.7' }} className="space-y-6 text-sm text-neutral-700 dark:text-neutral-300">
        <p>
          Encontrá las mejores <span className="text-black dark:text-white font-bold">promociones y descuentos por cantidad</span> de los principales supermercados de Argentina. Las ofertas se actualizan <span className="text-black dark:text-white font-bold">diariamente</span>.
        </p>
        
        {/* Filtros */}
        {(showStoreFilter || showTypeFilter) && (
          <div className="flex flex-wrap gap-4 my-6">
            {showStoreFilter && (
              <div className="flex-1 min-w-[150px]">
                <label className="block text-xs font-bold text-neutral-500 mb-2 uppercase">Supermercado</label>
                <select 
                  value={selectedStore}
                  onChange={(e) => { setSelectedStore(e.target.value); setDisplayCount(20); }}
                  className="w-full p-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl font-bold text-sm"
                >
                  <option value="all">Todos los supermercados</option>
                  {storesWithOffers.map(store => (
                    <option key={store} value={store}>
                      {store.charAt(0).toUpperCase() + store.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            {showTypeFilter && (
              <div className="flex-1 min-w-[150px]">
                <label className="block text-xs font-bold text-neutral-500 mb-2 uppercase">Tipo de oferta</label>
                <select 
                  value={selectedDiscountType}
                  onChange={(e) => { setSelectedDiscountType(e.target.value); setDisplayCount(20); }}
                  className="w-full p-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl font-bold text-sm"
                >
                  <option value="all">Todos los tipos</option>
                  {discountTypesAvailable.map(tipo => (
                    <option key={tipo} value={tipo}>
                      {tipo}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
        
        <div className="my-8 p-4 bg-green-50 dark:bg-green-900/10 rounded-3xl border border-green-100 dark:border-green-900/30">
          <h3 className="text-green-600 dark:text-green-400 font-black uppercase text-[10px] tracking-widest mb-3">Ofertas por Cantidad</h3>
          <ul className="grid grid-cols-2 gap-2 text-sm text-black dark:text-neutral-200">
            <li>🏯 <span className="font-bold">3x2</span> - Llevá 3 pagás 2</li>
            <li>🏯 <span className="font-bold">2x1</span> - Llevá 2 pagás 1</li>
            <li>📦 <span className="font-bold">Packs</span> - Ofertas por cantidad</li>
            <li>🎠<span className="font-bold">4x3</span> - Llevá 4 pagás 3</li>
          </ul>
        </div>
        
        {hasOffers ? (
          <>
            <p className="text-black dark:text-white font-bold text-sm">
              {filteredProducts.length} productos con ofertas disponibles
              {selectedStore !== 'all' || selectedDiscountType !== 'all' ? ` (de ${totalWithOffers} totales)` : ''}
            </p>
            
            <div className="space-y-4">
              {filteredProducts.slice(0, displayCount).map((product, index) => {
                const ofertas = product.oferta_gondola ? Object.entries(product.oferta_gondola).filter(([, v]) => v && typeof v === 'string' && v.trim().length > 0) : [];
                const productUrl = generateSlug(product.nombre, product.categoria);
                
                return (
                  <div 
                    key={product.id || index} 
                    onClick={() => navigate(productUrl, { state: { from: 'ofertas' } })}
                    className="block p-4 bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800 hover:scale-[1.02] hover:border-green-500 dark:hover:border-green-500 transition-all cursor-pointer"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <h4 className="font-bold text-black dark:text-white text-sm">{product.nombre}</h4>
                        {product.marca && <p className="text-xs text-neutral-500">{product.marca}</p>}
                        <p className="text-xs text-neutral-400 mt-1">{product.categoria}</p>
                      </div>
                      <div className="text-right space-y-1">
                        {ofertas.slice(0, 3).map(([store, oferta], i) => (
                          <div key={i} className="text-xs flex items-center justify-end gap-2">
                            <span className="font-bold text-green-600 dark:text-green-400">{oferta}</span>
                            <span className="text-neutral-400 text-[10px]">en {store}</span>
                          </div>
                        ))}
                        <i className="fa-solid fa-chevron-right text-neutral-400 text-xs mt-1 block"></i>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {filteredProducts.length > displayCount && (
              <div className="text-center mt-6">
                <button 
                  onClick={() => setDisplayCount(prev => prev + 20)}
                  className="px-8 py-3 bg-black dark:bg-white text-white dark:text-black font-bold rounded-xl hover:scale-105 transition-transform"
                >
                  Cargar más productos ({filteredProducts.length - displayCount} restantes)
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="my-8 p-4 bg-neutral-50 dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 text-center">
            <h3 className="text-black dark:text-white font-black text-sm mb-3">No hay ofertas con estos filtros</h3>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              Probá con otros filtros o explorá todas las ofertas.
            </p>
            <button 
              onClick={() => { setSelectedStore('all'); setSelectedDiscountType('all'); setDisplayCount(20); }}
              className="px-6 py-2 bg-green-600 text-white font-bold rounded-xl hover:scale-105 transition-transform"
            >
              Ver todas las ofertas
            </button>
          </div>
        )}
      </div>
      
      <ExploreCategories />
    </div>
  );
};

#!/usr/bin/env python3
"""
SEO Sitemap Generator para TradingChango
Genera sitemap.xml dinámico con:
- Home
- Categorías
- Productos
- Supermercados
- Variaciones de precio (top gainers/losers)
"""

import os
import re
import datetime
from supabase import create_client

# Configuración desde variables de entorno
URL = os.getenv("SUPABASE_URL")
KEY = os.getenv("SUPABASE_KEY")

if not URL or not KEY:
    print("❌ Error: Faltan SUPABASE_URL o SUPABASE_KEY")
    exit(1)

supabase = create_client(URL, KEY)

def limpiar_slug(texto: str) -> str:
    """Convierte texto a URL-friendly slug"""
    if not texto:
        return ""
    texto = texto.lower()
    remplazos = {"á": "a", "é": "e", "í": "i", "ó": "o", "ú": "u", "ñ": "n", "ü": "u"}
    for k, v in remplazos.items():
        texto = texto.replace(k, v)
    texto = re.sub(r'[^a-z0-9\s-]', '', texto)
    return re.sub(r'\s+', '-', texto).strip('-')

def get_productos() -> list:
    """Obtiene todos los productos de la base de datos"""
    try:
        res = supabase.table("productos").select("nombre, categoria, updated_at").execute()
        return res.data if res.data else []
    except Exception as e:
        print(f"❌ Error obteniendo productos: {e}")
        return []

def get_supermercados() -> list:
    """Lista de supermercados para SEO programático"""
    return [
        {"nombre": "Coto", "slug": "coto"},
        {"nombre": "Carrefour", "slug": "carrefour"},
        {"nombre": "Día", "slug": "dia"},
        {"nombre": "Jumbo", "slug": "jumbo"},
        {"nombre": "Mas Online", "slug": "mas-online"}
    ]

def generar_xml_url(loc: str, lastmod: str = None, changefreq: str = None, priority: float = None, alternates: list = None) -> str:
    """Genera la etiqueta URL completa"""
    parts = [f"  <url><loc>{loc}</loc>"]
    
    if lastmod:
        parts.append(f"<lastmod>{lastmod}</lastmod>")
    if changefreq:
        parts.append(f"<changefreq>{changefreq}</changefreq>")
    if priority is not None:
        parts.append(f"<priority>{priority}</priority>")
    
    if alternates:
        for alt in alternates:
            parts.append(f'<xhtml:link rel="alternate" hreflang="es-AR" href="{alt}" />')
    
    parts.append("</url>")
    return "".join(parts)

def generar():
    """Genera el sitemap.xml completo"""
    base_url = "https://tradingchango.com"
    hoy = datetime.date.today().isoformat()
    
    xml_declarations = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
        '        xmlns:xhtml="http://www.w3.org/1999/xhtml">'
    ]
    
    productos = get_productos()
    supermercados = get_supermercados()
    
    urls_unicas = set()
    
    # ========== 1. HOME ==========
    urls_unicas.add(generar_xml_url(
        f"{base_url}/",
        lastmod=hoy,
        priority=1.0,
        alternates=[f"{base_url}/"]
    ))
    
    # ========== 2. CATEGORÍAS ==========
    categorias = [
        ("Almacén", 0.9),
        ("Bebidas", 0.9),
        ("Limpieza", 0.85),
        ("Perfumería", 0.85),
        ("Carnes", 0.9),
        ("Verdu", 0.9),
        ("Lacteos", 0.85),
        ("Mascotas", 0.8)
    ]
    
    for cat, priority in categorias:
        slug = limpiar_slug(cat)
        urls_unicas.add(generar_xml_url(
            f"{base_url}/{slug}",
            lastmod=hoy,
            changefreq="daily",
            priority=priority
        ))
    
    # ========== 3. SUPERMERCADOS (SEO Programático) ==========
    for store in supermercados:
        urls_unicas.add(generar_xml_url(
            f"{base_url}/supermercado/{store['slug']}",
            lastmod=hoy,
            changefreq="daily",
            priority=0.85
        ))
    
    # ========== 4. PRODUCTOS ==========
    seen_urls = set()
    for prod in productos:
        slug_cat = limpiar_slug(prod.get('categoria', ''))
        slug_prod = limpiar_slug(prod.get('nombre', ''))
        
        if not slug_cat or not slug_prod:
            continue
        
        url = f"{base_url}/{slug_cat}/{slug_prod}"
        
        # Evitar duplicados
        if url in seen_urls:
            continue
        seen_urls.add(url)
        
        updated_at = prod.get('updated_at', hoy)
        if isinstance(updated_at, str) and 'T' in updated_at:
            updated_at = updated_at.split('T')[0]
        
        urls_unicas.add(generar_xml_url(
            url,
            lastmod=updated_at,
            changefreq="weekly",
            priority=0.6
        ))
    
    # ========== 5. PÁGINAS DE AUTOR Y LEGAL ==========
    paginas_utiles = [
        ("/buscar", 0.7, "weekly"),
        ("/comparar-precios", 0.75, "weekly"),
        ("/como-ahorrar", 0.65, "monthly"),
        ("/ofertas-semana", 0.8, "weekly"),
        ("/historial-precios", 0.7, "weekly"),
        ("/contacto", 0.4, "monthly"),
        ("/terminos", 0.3, "monthly")
    ]
    
    for path, priority, freq in paginas_utiles:
        urls_unicas.add(generar_xml_url(
            f"{base_url}{path}",
            lastmod=hoy,
            changefreq=freq,
            priority=priority
        ))
    
    # ========== GUARDAR SITEMAP ==========
    sitemap_content = "\n".join(xml_declarations + list(urls_unicas)) + "\n</urlset>"
    
    with open("public/sitemap.xml", "w", encoding="utf-8") as f:
        f.write(sitemap_content)
    
    print(f"✅ Sitemap generado:")
    print(f"   - Home: 1")
    print(f"   - Categorías: {len(categorias)}")
    print(f"   - Supermercados: {len(supermercados)}")
    print(f"   - Productos: {len(seen_urls)}")
    print(f"   - Páginas utilitarias: {len(paginas_utiles)}")
    print(f"   - TOTAL URLs: {len(urls_unicas)}")

if __name__ == "__main__":
    generar()

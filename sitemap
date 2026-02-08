import os
import re
import datetime
from supabase import create_client

# Estas variables las tenés que poner en los Secrets de tu Repo Público
URL = os.getenv("SUPABASE_URL")
KEY = os.getenv("SUPABASE_KEY")
supabase = create_client(URL, KEY)

def limpiar_slug(texto):
    if not texto: return ""
    texto = texto.lower()
    remplazos = {"á": "a", "é": "e", "í": "i", "ó": "o", "ú": "u", "ñ": "n"}
    for k, v in remplazos.items():
        texto = texto.replace(k, v)
    texto = re.sub(r'[^a-z0-9\s-]', '', texto)
    return re.sub(r'\s+', '-', texto).strip('-')

def generar():
    base_url = "https://tradingchango.com"
    hoy = datetime.date.today().isoformat()
    
    xml = ['<?xml version="1.0" encoding="UTF-8"?>']
    xml.append('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
    
    # 1. HOME
    xml.append(f"  <url><loc>{base_url}/</loc><lastmod>{hoy}</lastmod><priority>1.0</priority></url>")

    # 2. CATEGORÍAS
    categorias = ['Almacén', 'Limpieza', 'Bebidas', 'Perfumería', 'Carnes', 'Verdu', 'Mascotas', 'Varios']
    for cat in categorias:
        xml.append(f"  <url><loc>{base_url}/{limpiar_slug(cat)}</loc><changefreq>daily</changefreq><priority>0.8</priority></url>")

    # 3. TODOS LOS PRODUCTOS (Incluyendo los que no tienen stock para SEO)
    res = supabase.table("productos").select("nombre, categoria").execute()
    
    for prod in res.data:
        url = f"{base_url}/{limpiar_slug(prod['categoria'])}/{limpiar_slug(prod['nombre'])}"
        xml.append(f"  <url><loc>{url}</loc><changefreq>weekly</changefreq><priority>0.6</priority></url>")

    xml.append('</urlset>')
    
    # Guardamos en la carpeta public de tu proyecto (Vite/React)
    with open("public/sitemap.xml", "w", encoding="utf-8") as f:
        f.write("\n".join(xml))
    
    print(f"✅ Sitemap actualizado con {len(res.data)} productos.")

if __name__ == "__main__":
    generar()
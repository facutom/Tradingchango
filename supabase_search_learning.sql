-- ============================================
-- Tabla de Aprendizaje de Búsquedas (search_learning)
-- ============================================

-- Crear la tabla si no existe
CREATE TABLE IF NOT EXISTS search_learning (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword TEXT NOT NULL,
  product_id TEXT NOT NULL,
  user_id TEXT,  -- ID del usuario (null para elecciones anónimas/comunidad)
  count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(keyword, product_id, user_id)
);

-- Crear índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_search_learning_keyword ON search_learning(keyword);
CREATE INDEX IF NOT EXISTS idx_search_learning_user_keyword ON search_learning(user_id, keyword);
CREATE INDEX IF NOT EXISTS idx_search_learning_count ON search_learning(count DESC);

-- ============================================
-- Función para hacer upsert de aprendizaje
-- ============================================
CREATE OR REPLACE FUNCTION record_search_choice(
  p_keyword TEXT,
  p_product_id TEXT
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO search_learning (keyword, product_id, count)
  VALUES (p_keyword, p_product_id, 1)
  ON CONFLICT (keyword, product_id)
  DO UPDATE SET 
    count = search_learning.count + 1,
    updated_at = NOW();
END;
$$;

-- ============================================
-- Función para obtener productos más elegidos para una keyword
-- ============================================
CREATE OR REPLACE FUNCTION get_top_products_for_keyword(
  p_keyword TEXT,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  product_id TEXT,
  count INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT sl.product_id, sl.count
  FROM search_learning sl
  WHERE sl.keyword ILIKE p_keyword
  ORDER BY sl.count DESC
  LIMIT p_limit;
END;
$$;

-- ============================================
-- Función para obtener el producto más elegido con mejor precio
-- ============================================
CREATE OR REPLACE FUNCTION get_best_choice_for_keyword(
  p_keyword TEXT,
  p_product_ids TEXT[]  -- Array de product_ids para buscar el mejor precio
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  best_product_id TEXT;
  min_price NUMERIC;
  rec RECORD;
BEGIN
  min_price := NULL;
  best_product_id := NULL;
  
  FOR rec IN 
    SELECT 
      p.id::TEXT as product_id,
      LEAST(
        COALESCE(p.p_jumbo, 999999),
        COALESCE(p.p_carrefour, 999999),
        COALESCE(p.p_coto, 999999),
        COALESCE(p.p_dia, 999999),
        COALESCE(p.p_masonline, 999999)
      ) as min_price
    FROM productos p
    WHERE p.id::TEXT = ANY(p_product_ids)
  LOOP
    IF min_price IS NULL OR rec.min_price < min_price THEN
      min_price := rec.min_price;
      best_product_id := rec.product_id;
    END IF;
  END LOOP;
  
  RETURN best_product_id;
END;
$$;

-- Habilitar Row Level Security (opcional)
ALTER TABLE search_learning ENABLE ROW LEVEL SECURITY;

-- Política para permitir escritura anónima (para tracking)
CREATE POLICY "Allow anonymous inserts" ON search_learning
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Política para permitir lectura autenticada
CREATE POLICY "Allow read for authenticated" ON search_learning
  FOR SELECT TO authenticated
  USING (true);

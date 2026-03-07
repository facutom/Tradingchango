-- ============================================
-- MEJOR ARQUITECTURA: Guardar historial en tabla perfiles
-- ============================================

-- Opción 1: Agregar columna search_history a la tabla perfiles (si existe)
-- Esta columna contendrá un JSONB con el historial de búsquedas por usuario

-- Agregar columna a perfiles (si la tabla existe)
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS search_history JSONB DEFAULT '{}';

-- Para crear la tabla si no existe:
CREATE TABLE IF NOT EXISTS search_learning (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword TEXT NOT NULL,
  product_id TEXT NOT NULL,
  count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(keyword, product_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_search_learning_keyword ON search_learning(keyword);
CREATE INDEX IF NOT EXISTS idx_search_learning_count ON search_learning(count DESC);

-- ============================================
-- Función para obtener historial personal del usuario
-- ============================================
CREATE OR REPLACE FUNCTION get_user_search_history(p_user_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  perfil RECORD;
BEGIN
  SELECT search_history INTO perfil
  FROM perfiles
  WHERE id::TEXT = p_user_id;
  
  IF perfil.search_history IS NULL THEN
    RETURN '{}'::JSONB;
  END IF;
  
  RETURN perfil.search_history;
END;
$$;

-- ============================================
-- Función para actualizar historial personal
-- ============================================
CREATE OR REPLACE FUNCTION update_user_search_history(
  p_user_id TEXT,
  p_keyword TEXT,
  p_product_id TEXT
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  current_history JSONB;
  keyword_data JSONB;
  new_count INTEGER;
BEGIN
  -- Obtener historial actual
  SELECT COALESCE(search_history, '{}'::JSONB) INTO current_history
  FROM perfiles
  WHERE id::TEXT = p_user_id;
  
  -- Verificar si ya existe esta keyword
  IF current_history ? p_keyword THEN
    -- Ya existe, obtener el conteo actual para este producto
    keyword_data := current_history->p_keyword;
    
    IF keyword_data ? p_product_id THEN
      -- Ya existe este producto para esta keyword, incrementar
      new_count := (keyword_data->p_product_id)::INTEGER + 1;
    ELSE
      -- Nuevo producto para esta keyword
      new_count := 1;
    END IF;
    
    -- Actualizar el JSONB
    current_history := jsonb_set(
      current_history,
      ARRAY[p_keyword, p_product_id],
      to_jsonb(new_count)
    );
  ELSE
    -- Nueva keyword
    current_history := jsonb_set(current_history, ARRAY[p_keyword], 
      jsonb_build_object(p_product_id, 1));
  END IF;
  
  -- Guardar en perfiles
  UPDATE perfiles
  SET search_history = current_history
  WHERE id::TEXT = p_user_id;
  
  -- También guardar en comunidad (sin user_id)
  INSERT INTO search_learning (keyword, product_id, count)
  VALUES (p_keyword, p_product_id, 1)
  ON CONFLICT (keyword, product_id)
  DO UPDATE SET 
    count = search_learning.count + 1,
    updated_at = NOW();
END;
$$;

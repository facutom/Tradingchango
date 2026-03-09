-- ============================================
-- Agregar constraint único a search_learning
-- Esto es necesario para que el upsert funcione correctamente
-- ============================================

-- Verificar si ya existe el índice único
DO $$
BEGIN
    -- Crear índice único si no existe
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_search_learning_unique_keyword_product'
    ) THEN
        CREATE UNIQUE INDEX idx_search_learning_unique_keyword_product 
        ON search_learning(keyword, product_id);
    END IF;
END
$$;

-- También asegurarnos de que la tabla tenga las columnas necesarias
ALTER TABLE search_learning 
ALTER COLUMN keyword TYPE TEXT,
ALTER COLUMN product_id TYPE TEXT,
ALTER COLUMN count TYPE INTEGER;

-- Verificar la estructura actual
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'search_learning';

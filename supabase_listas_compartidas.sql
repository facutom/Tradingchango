-- ============================================
-- Tabla para listas compartidas públicas
-- ============================================

CREATE TABLE IF NOT EXISTS listas_compartidas (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  name TEXT,
  items JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Índice para búsquedas rápidas
CREATE INDEX idx_listas_compartidas_id ON listas_compartidas(id);

-- Políticas RLS
ALTER TABLE listas_compartidas ENABLE ROW LEVEL SECURITY;

-- Cualquiera puede leer listas compartidas
CREATE POLICY "Anyone can read shared lists" ON listas_compartidas
  FOR SELECT USING (true);

-- Cualquiera puede crear listas compartidas
CREATE POLICY "Anyone can create shared lists" ON listas_compartidas
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Dueño puede actualizar/borrar
CREATE POLICY "Owner can update shared lists" ON listas_compartidas
  FOR UPDATE USING (auth.uid()::TEXT = user_id);

CREATE POLICY "Owner can delete shared lists" ON listas_compartidas
  FOR DELETE USING (auth.uid()::TEXT = user_id);

-- ============================================
-- Políticas RLS para search_learning
-- ============================================

-- Habilitar RLS
ALTER TABLE search_learning ENABLE ROW LEVEL SECURITY;

-- Permitir lectura a todos
CREATE POLICY "Anyone can read search_learning" ON search_learning
  FOR SELECT USING (true);

-- Permitir inserción a anon y authenticated
CREATE POLICY "Anyone can insert search_learning" ON search_learning
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Permitir actualización a todos
CREATE POLICY "Anyone can update search_learning" ON search_learning
  FOR UPDATE USING (true);

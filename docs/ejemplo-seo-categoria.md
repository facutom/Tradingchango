# Ejemplo: Página de Categoría con SEO

## Estado Actual (Solo botones tipo app bursátil)

```
┌─────────────────────────────────────────────────┐
│  / Limpieza                                     │
├─────────────────────────────────────────────────┤
│  [+0.5%]  Detergente Ala 900g              $320 │
│  [+2.1%]  Lavandina Ayudín 2L             $180 │
│  [-1.3%]  Jabón Dove 90g                  $150 │
│  [+0.8%]  Suavizante Downy 1.5L           $420 │
│  ...                                           │
└─────────────────────────────────────────────────┘
```

## Propuesta: Agregar Sección SEO Arriba (Opcional, collapsible)

```
┌─────────────────────────────────────────────────┐
│  📊 Limpieza                                    │
│  ▼ Ver descripción                              │
├─────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────┐  │
│  │ 💰 Compará precios de productos de        │  │
│  │ Limpieza en Buenos Aires. Seguí la        │  │
│  │ evolución de precios de detergente,       │  │
│  │ lavandina, jabón y más.                  │  │
│  │                                           │  │
│  │ 🔍 Búsquedas populares:                   │  │
│  │ • detergente precio - lavandina oferta    │  │
│  │ • productos limpieza baratos - jabón dove │  │
│  └───────────────────────────────────────────┘  │
├─────────────────────────────────────────────────┤
│  [+0.5%]  Detergente Ala 900g              $320 │
│  [+2.1%]  Lavandina Ayudín 2L             $180 │
│  [-1.3%]  Jabón Dove 90g                  $150 │
│  [+0.8%]  Suavizante Downy 1.5L           $420 │
│  ...                                           │
└─────────────────────────────────────────────────┘
```

## Alternativa: Solo Títulos Minimalistas (Más sutil)

```
┌─────────────────────────────────────────────────┐
│  🧴 Limpieza                                    │
│  Productos de limpieza al mejor precio          │
├─────────────────────────────────────────────────┤
│  [+0.5%]  Detergente Ala 900g              $320 │
│  [+2.1%]  Lavandina Ayudín 2L             $180 │
│  ...                                           │
└─────────────────────────────────────────────────┘
```

## Comparación SEO

| Aspecto | Sin texto | Con texto |
|---------|-----------|-----------|
| Google entiende | Poco | Bien |
| Keywords indexables | No | Sí |
| Visualmente intrusivo | No | Un poco (opcional) |
| Impacto en búsqueda | Bajo | Alto |

## Opciones de Implementación

### Opción 1: Badge con tooltip (menos intrusivo)
```jsx
// Solo mostrar texto cuando el usuario hace hover
<Badge tooltip="Productos de limpieza: detergente, lavandina, jabón...">
  🧴 Limpieza
</Badge>
```

### Opción 2: Sección colapsable (control total del usuario)
```jsx
<CollapsibleSection title="¿Qué es esta categoría?" defaultCollapsed>
  <p>Compará precios de productos de limpieza...</p>
</CollapsibleSection>
```

### Opción 3: Solo meta tags (ya implementado)
- Los textos están en los meta tags de la página
- Google los lee pero no se ven visualmente
- Ya está implementado en SEOTags.tsx

## Recomendación

Para mantener el estilo "app bursátil" te sugiero:

1. **Mantener minimalista visualmente** (Opción 1 o 2)
2. **Confiar en los meta tags** que ya están configurados
3. **Agregar schema markup** de productos (ya tiene)

¿Preferís alguna de estas opciones?

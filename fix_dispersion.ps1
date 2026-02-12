$content = Get-Content 'utils/categoryMetrics.ts' -Raw
$old = @'
  // Calcular dispersión promedio (brecha entre precio más alto y más bajo)
  const dispersions = products.map(p => {
    const min = getMinPrice(p);
    const max = getMaxPrice(p);
    if (min === 0 || max === 0) return 0;
    return ((max - min) / min) * 100;
  }).filter(d => d > 0);
  
  const avgDispersion = dispersions.length > 0 
    ? dispersions.reduce((a, b) => a + b, 0) / dispersions.length 
    : 0;
'@
$new = @'
  // Calcular dispersión promedio (brecha entre precio más alto y más bajo)
  const dispersions = products.map(p => {
    const min = getMinPrice(p);
    const max = getMaxPrice(p);
    if (min === 0 || max === 0) return 0;
    const dispersion = ((max - min) / min) * 100;
    // Limitar dispersión máxima a 150% (valores mayores son outliers)
    return Math.min(dispersion, 150);
  }).filter(d => d > 0);
  
  const avgDispersion = dispersions.length > 0 
    ? dispersions.reduce((a, b) => a + b, 0) / dispersions.length 
    : 0;
'@
$newContent = $content -replace [regex]::Escape($old), $new
Set-Content -Path 'utils/categoryMetrics.ts' -Value $newContent -Encoding UTF8

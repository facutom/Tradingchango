$lines = Get-Content 'App.tsx' -Raw
$insertAt = 876
$newCode = @'
  // Navegación por teclado en páginas de categoría
  useEffect(() => {
    const listPaths = ['/', '/carnes', '/verdu', '/varios', '/bebidas', '/almacen', '/lacteos', '/limpieza', '/perfumeria', '/mascotas'];
    const currentPath = location.pathname;
    const isCategoryPage = listPaths.some(path => currentPath === path || currentPath.startsWith(path + '/'));
    
    if (!isCategoryPage || currentPath === '/chango') return;
    
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        setDisplayLimit(prev => prev + 10);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        if (displayLimit > 10) {
          setDisplayLimit(prev => Math.max(10, prev - 10));
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [location.pathname, displayLimit]);
'@
$arrayLines = $lines -split "`n"
$newLines = $arrayLines[0..($insertAt-1)] + $newCode.Trim().Split("`n") + $arrayLines[$insertAt..($arrayLines.Count-1)]
Set-Content -Path 'App.tsx' -Value ($newLines -join "`n") -Encoding UTF8

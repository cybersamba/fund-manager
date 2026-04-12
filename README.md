# 📊 Fund Manager Pro v2.5
### Sistema Inteligente de Gestión de Patrimonio Boglehead

Bienvenido a la versión definitiva del **Fund Manager**. Esta aplicación ha evolucionado de un prototipo en Python a una plataforma financiera de alto rendimiento construida con React, diseñada para inversores que buscan precisión quirúrgica, diseño premium y control total sobre sus activos.

---

## 🚀 Innovaciones Arquitectónicas (v2.5)

### 1. El Motor Centralizado (`calculatePortfolioState`)
Hemos eliminado la fragmentación de datos. Ahora, un único motor matemático procesa todas las órdenes una sola vez y distribuye las métricas a toda la interfaz.
- **Lógica FIFO**: Gestión estricta de lotes de compra/venta para un cálculo preciso del coste base.
- **TIR Global (MWR)**: Tasa Interna de Retorno calculada mediante el algoritmo Newton-Raphson con protección contra divergencia.
- **TWR Anualizado**: Rentabilidad ponderada por tiempo que neutraliza el impacto de tus aportaciones, permitiéndote comparar tu desempeño con el mercado real.

### 2. Optimización de Rendimiento O(N)
El motor de visualización de gráficos históricos ha sido reconstruido.
- **Antes**: Complejidad O(N²) (simulación lenta día a día).
- **Ahora**: Procesamiento acumulativo lineal O(N). El gráfico "vuela" incluso con miles de operaciones y años de historial, utilizando un sistema de *downsampling* inteligente para mantener la fluidez.

### 3. Persistencia Segura en Google Drive
Tus datos viajan contigo de forma segura.
- **Sincronización en tiempo real**: Los datos se guardan automáticamente en un archivo oculto en tu Google Drive (`fund_manager_data.json`).
- **Escudo contra Corrupción**: Filtro estricto de saneamiento que detecta y aísla órdenes con fechas inválidas o importes corruptos antes de que afecten a la interfaz.

---

## 🧩 Guía de Módulos

### 🏦 Dashboard (Centro de Control)
Vista bento-box con tus KPIs más críticos:
- **Patrimonio Global**: Suma de activos invertidos + liquidez no invertida.
- **Plusvalía Neta**: Beneficio real descontando impuestos estimados y comparándolo con el "Hurdle" de la inflación.
- **Matriz de Rendimiento**: Heatmap mensual para detectar estacionalidad en tu rentabilidad.

### 📁 Cartera (Análisis de Activos)
- **Portfolio Snowflake**: Gráfico radial que puntúa tu cartera en 5 dimensiones: Eficiencia (TER), Rendimiento, Diversidad, Seguridad y Disciplina.
- **Asset Allocation**: Comparativa visual entre tu peso actual y tu objetivo estratégico.
- **Sparklines**: Tendencia de los últimos 60 días para cada fondo individual.

### 🧠 Análisis Estratégico
- **Simulador FIRE**: Proyección de libertad financiera utilizando la **Ecuación de Fisher** para ajustar la rentabilidad nominal por la inflación real.
- **Matriz de Correlación**: Identifica si tus fondos están realmente diversificados o si se mueven en bloque.
- **Smart Assistant**: Algoritmo que calcula exactamente cuánto comprar de cada activo para rebalancear tu cartera con tu próxima aportación.

---

## 🛠️ Especificaciones Técnicas

| Característica | Detalle |
| :--- | :--- |
| **Frontend** | React 18 + Vite |
| **Estilos** | CSS Vanilla (Arquitectura de Tokens) + TailwindCSS |
| **Gráficos** | Recharts (Optimizado para volumen masivo de datos) |
| **Iconografía** | Lucide React |
| **Auth/Storage** | Google Drive API v3 (OAuth 2.0) |

---

## 📝 Notas de Uso y Seguridad

- **Modo Privacidad**: Pulsa el icono del ojo para ocultar cifras absolutas (ideal para capturas de pantalla o mostrar en público).
- **Coste Oculto (TER)**: La aplicación calcula el impacto anual estimado de las comisiones de gestión de tus fondos.
- **Protección NaN**: Todos los cálculos matemáticos incluyen guardias de validación para evitar que errores en los datos de los fondos provoquen caídas en la interfaz.

---

**Última actualización**: 2026-04-12  
**Estado**: 🟢 ESTABLE | **Arquitectura**: Centralizada v2  
**Desarrollado por**: Antigravity AI

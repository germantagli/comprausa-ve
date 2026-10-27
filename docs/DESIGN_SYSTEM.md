# Sistema de diseño

Identidad propia de CompraUSA VE. No se copia el amarillo de un marketplace, el naranja de una tienda de ofertas ni el negro y rosa de una tienda de moda. La interfaz debe sentirse como una mesa de trabajo tranquila: mucho aire, estados legibles y ninguna cuenta regresiva falsa.

El nombre visible es configurable. No hay logotipo definitivo. Cuando se dibuje, será una marca geométrica nueva (dos puntos y un arco bastan como idea). No se usan logos de tiendas.

Los componentes de esta lista no están implementados. `packages/ui` solo expone el inventario y un aviso de fase.

## Color

Tokens en `packages/design-tokens`. El esquema activo es claro. El oscuro está definido y no se aplica.

| Token | Claro | Uso |
| --- | --- | --- |
| Primary `#1054B8` | Texto blanco encima | Acciones principales |
| Deep `#092C62` | Texto blanco encima | Énfasis corto, héroes y marcas fuertes |
| Cyan `#16B8D5` | Solo acento | Líneas, gráficos, iconos grandes. No es color de texto sobre blanco ni sobre `#F3F7FC` |
| Background `#F3F7FC` | — | Fondo de página |
| White `#FFFFFF` | — | Superficie |
| Text `#14243B` | Sobre blanco y sobre el fondo | Texto |
| Muted `#5B6B82` | — | Texto secundario, hints y navegación inactiva |
| Border `#D7E0EC` | — | Bordes de tarjetas, inputs y divisores |
| Warning `#C45C16` | — | Avisos no bloqueantes |
| Success `#16865D` | Texto blanco, o el verde como texto sobre blanco | Confirmación |
| Error `#D92D20` | Texto blanco, o el rojo como texto sobre blanco | Error |

La maqueta de producto (web + móvil) guía la composición: cabecera de escritorio, héroe USA→Venezuela, chips de tiendas sin logos de marca, categorías en círculo, grilla de fichas, resumen de carrito con líneas de envío/comisión «por cotización», pedidos con pestañas Activos/Historial y menú de perfil. No se usan logos oficiales de Amazon, Walmart u otras tiendas. Los precios de maqueta, si se muestran, van etiquetados como no reales; si no hay dato: «Precio por cotización».

En web, desde `768px` el sitio usa chrome de escritorio (cabecera horizontal a todo el ancho, sin barra inferior). En viewports más chicos (≤767px) la columna debe recorrer el flujo de ~16 pantallas de la maqueta: splash, registro, OTP, bienvenida, inicio, tiendas, búsqueda, filtros, ficha, carrito, dirección, pago, resumen, seguimiento y perfil. El contenido de escritorio usa una grilla ancha (`--cve-page-max`), no una columna de teléfono estirada.

Contraste calculado el 26 de octubre de 2026 con la fórmula WCAG:

| Par | Relación | Texto normal AA |
| --- | --- | --- |
| `#14243B` sobre `#FFFFFF` | 15.61 | Sí |
| `#14243B` sobre `#F3F7FC` | 14.51 | Sí |
| `#FFFFFF` sobre `#1054B8` | 7.04 | Sí |
| `#FFFFFF` sobre `#092C62` | 13.56 | Sí |
| `#FFFFFF` sobre `#16865D` | 4.56 | Sí |
| `#FFFFFF` sobre `#D92D20` | 4.83 | Sí |
| `#1054B8` sobre `#FFFFFF` | 7.04 | Sí |
| `#16B8D5` sobre `#FFFFFF` | 2.37 | No |
| `#16B8D5` sobre `#F3F7FC` | 2.21 | No |
| `#14243B` sobre `#16B8D5` | 6.58 | Sí, si el cian es fondo y el texto es el de cuerpo |
| `#16B8D5` sobre `#0B1220` | 7.89 | Sí en el esquema oscuro preparado |

El esquema oscuro preparado usa fondo `#0B1220`, superficie `#14243B`, texto `#F3F7FC` y el mismo primary. No está montado en ninguna pantalla.

WCAG 2.2 AA, cuando se construyan los componentes: contraste de texto 4.5:1 (3:1 si es texto grande), foco visible, objetivo táctil de al menos 24 px y, en móvil, 44 px como criterio nuestro. El estado de error no puede depender solo del color.

## Tipo

Inter, licencia SIL Open Font License 1.1 ([repositorio](https://github.com/rsms/inter)). Respaldo: `system-ui, sans-serif`. No se descarga la fuente en este corte y no se carga desde un CDN.

| Estilo | Tamaño | Interlineado |
| --- | --- | --- |
| Caption | 12 | 16 |
| Body | 16 | 24 |
| Title | 22 | 28 |
| Display | 32 | 40 |

## Espacio, radio y elevación

Espacio en múltiplos de 4: 4, 8, 12, 16, 24, 32, 48.

Radio: 8, 12 y 16. Sin cápsulas enormes en cada tarjeta.

Elevación: ninguna, una sombra corta `0 1px 2px rgba(20, 36, 59, 0.08)` y una media `0 8px 24px rgba(20, 36, 59, 0.08)`. Nada de brillos de oferta.

## Iconografía

[Lucide](https://lucide.dev/license), licencia ISC. No se usan iconos de marcas. No se usa emoji como sistema de iconos.

## Estados

Todo control futuro necesita reposo, hover o pressed, foco, deshabilitado, carga, vacío y error. El dinero se muestra como texto `USD 12.50` a partir de centavos enteros, nunca como un float editado a ojo. Un artículo demo lleva un aviso visible de que es ficticio.

## Componentes por construir

Button, IconButton, TextField, PhoneField, SearchField, MoneyText, StatusPill, DemoDisclaimer, QuoteLinkForm, OrderTimeline, PaymentInstructions, ProofUpload, PaymentStatus, AppHeader, BottomTabBar, EmptyState, ErrorState, LoadingSkeleton, Dialog, Toast, AddressForm.

La lista vive también en `packages/ui` (`plannedComponents`).

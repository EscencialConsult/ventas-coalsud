# COALSUD — Sistema Comercial · Documentación del Backend

**Esencial Consultora** · El Alto / La Paz, Bolivia · **v1.1 — 26/10/2026**

Documentación de ingeniería del Sistema Comercial de **COALSUD S.R.L.**, un ERP de ventas multi-regional que reemplaza la operación en WhatsApp + Excel. Esta carpeta es la **fuente de verdad de las reglas de negocio**: requerimientos, diseño de datos, seguridad y contrato de API. El frontend la referencia desde `../../frontend/docs/`.

- **Backend:** Supabase: Postgres 15+ · Auth · RLS · RPC `security definer` · Storage · Edge Function (⚙ DT-01).
- **Moneda:** Bolivianos (Bs, 2 decimales). **Idioma:** es-BO. **Zona horaria:** America/La_Paz.
- **Regionales:** La Paz (LP), Cochabamba (CBBA), Santa Cruz (SCZ), independientes y con almacén propio.
- **Usuarios:**
  - Nacional (Irene / ingeniero): consolida, administra usuarios y catálogo, reabre días.
  - Regional (Vanessa = LP + CBBA, Fernando = SCZ): opera sus regionales.
  - Los vendedores **no usan el sistema**.

---

## Cómo leer esta documentación

| MARCA | SIGNIFICA |
|---|---|
| **●** | Nuevo o modificado en v1.1 |
| **⚠ SUP-xx** | **Supuesto de negocio no confirmado por el cliente.** Se construye así, pero puede cambiar. Detalle en el [Registro de Supuestos](01-requerimiento/Registro_de_Supuestos.md) |
| **⚙ DT-xx** | Decisión técnica propuesta, que valida el equipo (mismo registro, §2) |

La versión 1.0 original está en `Desktop/Coalsud/docs/` y no se modifica. Los archivos fuente (PDF, prototipo, transcripciones) están en `Desktop/Coalsud/`.

---

## Índice

### 1 · Requerimiento
| DOCUMENTO | CONTENIDO |
|---|---|
| [SRS](01-requerimiento/SRS.md) | 42 RF + 30 RNF, actores, glosario, verificación, trazabilidad, decisiones Q |
| [Casos de Uso](01-requerimiento/Casos_de_Uso.md) | CU-01 a CU-12 |
| [Casos de Prueba](01-requerimiento/Casos_de_Prueba.md) | 94 casos con su capa (BD / E2E), incluido el caso dorado F3 |
| [Registro de Supuestos](01-requerimiento/Registro_de_Supuestos.md) | **55 supuestos + 42 decisiones técnicas** y las preguntas para el cliente |

### 2 · Diseño
| DOCUMENTO | CONTENIDO |
|---|---|
| [Modelo de Datos](02-diseno/Modelo_de_Datos.md) | 24 tablas, DER, relaciones, cálculos |
| [Normalización](02-diseno/Normalizacion.md) | 3FN y 4 desviaciones conscientes |
| [Diagrama de Clases](02-diseno/Diagrama_de_Clases.md) | Modelo estático + clases de control (RPC) |
| [Diagrama de Estados](02-diseno/Diagrama_de_Estados.md) | Nota, cobranza, liquidación, movimientos |
| [Diagramas de Flujo](02-diseno/Diagramas_de_Flujo.md) | Nota, anular vs devolver, cierre, traspaso, salida/retorno, cobranza |
| [Arquitectura](02-diseno/Arquitectura.md) | Supabase + React; qué va en la base y qué en el cliente |
| [Seguridad RLS](02-diseno/Seguridad_RLS.md) | Roles, 5 patrones, política por tabla, Storage, Edge Function, checklist |

### 3 · Especificación técnica
| DOCUMENTO | CONTENIDO |
|---|---|
| [Reglas de Cálculo](03-especificacion/Reglas_de_Calculo.md) | Fórmulas de nota, stock, liquidación, arqueo, EECC, reportes (con la verificación de F3) |
| [Esquema de BD](03-especificacion/Esquema_BD.md) | Columnas, restricciones, índices, vistas, funciones, triggers, orden de migraciones |
| [Contrato de API](03-especificacion/Contrato_API.md) | Lecturas, RPC, errores, Storage, Edge Function, invalidación de caché |

### 4 · Ejecución
| DOCUMENTO | CONTENIDO |
|---|---|
| [Plan de Implementación](04-ejecucion/Plan_Implementacion.md) | 9 sprints · tareas BE/FE · ~311 h |
| [Estructura del Backend](04-ejecucion/Estructura_Backend.md) | Árbol del repo, convenciones SQL, scripts, flujo de trabajo |
| [Entornos y Despliegue](04-ejecucion/Entornos_y_Despliegue.md) | local/dev/prod, secretos, configuración de Supabase, CI, release |
| [Estrategia de Pruebas](04-ejecucion/Estrategia_de_Pruebas.md) | pgTAP, invariantes, concurrencia, rendimiento |
| [Datos Iniciales](04-ejecucion/Datos_Iniciales.md) | Seeds, catálogo de F3, carga de puesta en marcha |

---

## Principios de diseño

1. **Trazabilidad sobre todo.** Nada se borra: se anula o se da de baja, con usuario y fecha.
2. **Un día cerrado es inmutable.** Las correcciones posteriores son movimientos nuevos (devolución, ajuste) con fecha de hoy.
3. **La base manda.** La seguridad (RLS) y los cálculos (totales, stock, arqueo) viven en Postgres, no en el navegador.
4. **Menos es más.** Solo se construye lo que la operación real usa.

## Antes de construir la liquidación y el EECC
Hay que validar con el cliente las preguntas de impacto **alto** del [Registro de Supuestos §3](01-requerimiento/Registro_de_Supuestos.md):
- circuito preventa vs mercadería en poder del vendedor;
- significado de saldo inicial y pedido;
- signo del traspaso;
- quién registra las cobranzas;
- cartera inicial.

El resto del sistema puede avanzar sin esas respuestas.

# Plan de ejecución de Jarling

> Contrato funcional y técnico de la primera release. El código, los tests, los
> [ADR](adr/README.md) y el [checklist de release](release-checklist.md) son la
> referencia ejecutable.

## 1. Estado y orden de ejecución

Última actualización: 20 de agosto de 2026.

| Orden | Fase                                                                | Estado      |
| ----- | ------------------------------------------------------------------- | ----------- |
| 0–5   | Foundation, Accounts, Categories, Transactions, Budget y Move Money | Completadas |
| 9     | Targets                                                             | Completada  |
| 6     | Transfers                                                           | Completada  |
| 7     | Reconciliation                                                      | Completada  |
| 8     | Reports                                                             | Completada  |

Importación CSV/QIF/OFX/CAMT, conexión bancaria, Scheduled Transactions, Payees
como entidad persistida, sincronización y cloud quedan fuera de la primera
release. La implementación CSV se conserva únicamente en
`feature/csv-import`; no hay código dormido ni tablas CSV en el artefacto 1.0.

## 2. Reglas que no pueden romperse

1. Los importes se almacenan como enteros en céntimos.
2. Solo el dinero existente en cuentas `onBudget` aumenta Ready to Assign.
3. Assigned, Activity, Available, saldos y RTA son valores derivados.
4. Available conserva rollover entre meses y puede ser negativo.
5. Un movimiento entre categorías no crea una transacción ni cambia RTA.
6. Un target recomienda cuánto asignar; nunca crea ni modifica allocations.
7. Domain y Application no importan React, Expo ni SQLite.
8. Presentation no ejecuta SQL ni replica fórmulas financieras.
9. Toda escritura compuesta se realiza mediante `UnitOfWork`.
10. La aplicación debe funcionar completamente offline.

## 3. Base técnica actual

- Expo SDK 57, React Native 0.86, React 19 y TypeScript estricto.
- Expo Router bajo `src/app/`.
- SQLite local en el directorio privado de la aplicación. Una instalación nueva
  crea directamente el baseline completo de la release 1; no reproduce
  migraciones de desarrollo. El runner forward-only se conserva vacío para que
  el primer cambio publicado sea la versión 2.
- Clean Architecture pragmática:

```text
Presentation → Application → Domain ← Infrastructure
                         ↑
                     Bootstrap
```

- `ApplicationServices` y `createApplication` son los puntos de composición.
- Repositorios in-memory para tests de casos de uso y SQLite para runtime.
- Exportación JSON legible y backup/restauración `.jarling` cifrado de forma
  independiente mediante PBKDF2-HMAC-SHA256 y AES-256-GCM.
- Temas light/dark/system, formatos configurables y bloqueo mediante las
  credenciales del dispositivo con Expo Local Authentication.
- Typecheck, lint, tests unitarios/integración, Expo Doctor, bundles Android/web
  y smoke E2E con IDs estables.
- El export web pasa. Android queda sujeto al build del entorno Android; iOS
  nativo requiere un entorno macOS.

### Mapa rápido del código

```text
src/domain/                 entidades, value objects, servicios y puertos
src/application/            casos de uso y contratos de aplicación
src/infrastructure/         SQLite, repositorios y servicios del sistema
src/bootstrap/              inicialización y composición
src/presentation/           hooks, componentes, pantallas y utilidades UI
src/app/                    rutas Expo Router sin lógica de negocio
```

No crear capas nuevas ni estados globales salvo una necesidad demostrable. Las
dependencias nativas se limitan a capacidades concretas: fecha, autenticación
local, SQLite, selección y compartición de archivos e iconos Expo.

## 4. Comportamiento financiero existente

Para un mes `M`:

```text
Activity(category, M)
  = suma de transacciones categorizadas del mes

Available(category, M)
  = Available(category, M - 1)
  + Assigned(category, M)
  + Activity(category, M)

ReadyToAssign(M)
  = ingresos on-budget acumulados hasta M
  - asignaciones acumuladas hasta M
```

Casos de control:

| Escenario                         | Resultado                                       |
| --------------------------------- | ----------------------------------------------- |
| Saldo inicial 2.000 € sin asignar | RTA 2.000 €                                     |
| Asignar 400 €                     | RTA 1.600 €                                     |
| Gastar 60 € en esa categoría      | Assigned 400 €, Activity −60 €, Available 340 € |
| Mover 20 € entre categorías       | Cambian ambas asignaciones; RTA no cambia       |
| Available 40 € al cerrar el mes   | El mes siguiente comienza con ese rollover      |

## 5. Fase 9 — Targets

Estado: implementada y validada automáticamente. La aceptación manual forma
parte del checklist de la release.

### 5.1 Objetivo

Permitir que cada categoría tenga como máximo un objetivo de financiación y
mostrar progreso y recomendación mensual. Targets aporta orientación; no mueve
dinero ni altera los cálculos presupuestarios existentes.

### 5.2 Modelo soportado

```ts
type TargetKind = 'weekly' | 'monthly' | 'yearly' | 'custom';
type RecurringFundingMode = 'set_aside' | 'refill_up_to';
type CustomFundingMode = 'set_aside' | 'fill_up_to' | 'balance';
```

- Todo importe es positivo y solo existe un target por categoría.
- Weekly, Monthly y Yearly guardan una estrategia recurrente de aportar o
  reponer.
- Monthly guarda último día (`0`) o día 1–31; en meses cortos se ajusta al
  último día real.
- Yearly guarda una fecha válida y repite el objetivo cada año.
- Custom guarda la estrategia de aportar, rellenar o mantener saldo y puede
  incluir una fecha objetivo para repartir la aportación entre los meses
  restantes.
- Al cambiar de tipo se limpian todos los campos exclusivos del tipo anterior.
- Una categoría oculta conserva su target y ninguna operación de target mueve
  dinero por sí sola.

### 5.3 Semántica de cálculo

`calculateTargetProgress` es un servicio puro. Las estrategias `set_aside`
miden lo aportado usando Assigned. `refill_up_to` y `fill_up_to` cuentan tanto
lo disponible como lo gastado durante el periodo actual, de modo que gastar
desde una categoría ya financiada no la marca falsamente como underfunded. Los
targets de saldo usan Available.

```text
Weekly goal = amount × occurrences(dayOfWeek, selectedMonth)
Monthly goal = amount con vencimiento en dayOfMonth
Yearly monthly plan = ceil((goal - fundedBeforeMonth) / monthsToDueDate)
Yearly recommended = max(0, monthlyPlan - assignedThisMonth)
Custom goal = amount
```

Weekly `set_aside` añade el importe aunque exista rollover; `refill_up_to`
repone solo lo gastado. Custom aplica la misma distinción entre `set_aside`,
`fill_up_to` y `balance`. El progreso se limita a `0..1` y devuelve
`underfunded`, `complete` u `overdue`.

### 5.4 Persistencia y casos de uso

`category_targets` contiene `day_of_week`, `funding_mode`,
`day_of_month`, `target_date` y `custom_funding_mode`, con una restricción SQL
que impide combinar campos de tipos distintos. La base activa es `jarling.db` y
la tabla forma parte del baseline directo de la release. El runner de
migraciones se conserva para cambios posteriores, pero las bases de desarrollo
anteriores a 1.0 no forman parte del contrato de compatibilidad.

Los casos de uso son `GetCategoryTargets`, `SetCategoryTarget` y
`DeleteCategoryTarget`, expuestos en `ApplicationServices.targets`. El
repositorio ofrece `findAll`, `findByCategory`, `save` y `deleteByCategory`.

### 5.5 UI entregada

- Edit Budget separado, `+` por grupo y orden manual oculto. `Add Target` abre
  directamente el editor; los targets existentes conservan el paso Details.
- Editor light Weekly / Monthly / Yearly / Custom con teclado TPV.
- Weekly: día y opciones explicadas `Set aside another` / `Refill up to`.
- Monthly: `Last Day` o 1st–31st y estrategia para el mes siguiente.
- Yearly: calendario nativo Android y estrategia para el mes siguiente.
- Custom: tres opciones seleccionables con explicación y casos de uso.
- Budget muestra barras Funded, Spent u Overspent solo cuando aportan contexto.
- Los targets con fecha muestran en amarillo cuánto falta aportar en el mes
  actual para llegar al objetivo, sin redistribuir otra vez lo ya asignado ese
  mismo mes.
- Los grupos colapsan usando el mismo chevron rotado 90 grados.
- El selector año/mes y el tipo de transacción aparecen centrados.
- El tab bar incorpora el safe-area inferior real de Android.
- Footer con iconos vectoriales: cerdito, banco, billete y gráfica.
- Transaction reserva una barra inferior dentro del safe-area para que Save no
  pueda quedar bajo la navegación del sistema.
- Transaction y Account creation son rutas opacas del Stack raíz: se abren
  sobre la pestaña actual y `back` vuelve exactamente al origen. Payee,
  Category, Account y Transaction Type son pasos de pantalla completa que
  conservan el borrador y usan transición lateral.
- Las pantallas completas entran lateralmente; los paneles parciales entran
  desde abajo mientras el backdrop aparece con un fade independiente, y
  comparten un contenedor con safe-area inferior y ajuste de teclado.
- Transactions permite Memo, búsqueda combinable por Anything/Payee/Memo,
  cuentas/categorías dentro de las sugerencias, filtros removibles y borrado
  automático al superar el umbral de swipe en cualquier dirección.
- Cada sugerencia aplica un paso, cierra el panel, actualiza resultados y cambia
  el placeholder a Refine search; tocar de nuevo la búsqueda abre el siguiente
  paso de refinamiento.
- El editor de transacciones ofrece Show more/less, estado Cleared y un teclado
  TPV compacto con suma, resta, multiplicación, división, igual y Done. El
  teclado solo permanece visible mientras se edita el importe.
- Las categorías iniciales contienen emoji y Demo utiliza sus IDs estables, sin
  crear un grupo `Everyday`.
- `❓ Uncategorized` es la categoría inicial de un gasto nuevo. Application,
  SQLite y restore rechazan gastos estándar sin categoría; transferencias,
  saldos iniciales y ajustes conservan su semántica sin categoría.

### 5.6 Validación y Definition of Done

- Validación de combinaciones, create/update/delete, unicidad y mapeo SQLite.
- Matriz de cálculo para los cuatro tipos, vencimientos, cuatro/cinco semanas,
  redondeo en céntimos, estrategias y progress `0..1`.
- Tests de integración garantizan que los targets no modifican RTA ni Budget.
- Demo es idempotente, solo referencia categorías predeterminadas y su control
  aparece exclusivamente en builds de desarrollo.
- La matriz automatizada se ejecuta en CI sin fijar aquí un recuento de tests
  que quedaría obsoleto. La aceptación manual y los builds de tienda se siguen
  en `release-checklist.md`.

### 5.7 Payees

- `GetPayees` deriva nombres únicos de las transacciones y los ordena sin crear
  una segunda fuente de verdad.
- La pantalla de selección permite búsqueda, elección y alta inline al estilo
  YNAB. Un nombre nuevo se persiste al guardar la transacción.
- La lista completa no depende de los filtros activos de Transactions.

## 6. Fase 6 — Transfers

Estado: implementada y validada automáticamente. La aceptación manual forma
parte del checklist de la release.

- Una transferencia se representa como una unión discriminada con dos patas de
  signos opuestos unidas por un `transactionGroupId` exclusivo. Normalmente no tienen
  categoría; al pagar una tarjeta de crédito, la parte de origen usa su
  categoría de pago enlazada para reflejar el movimiento entre sobres.
- Crear, actualizar y eliminar opera sobre ambas partes dentro de un único
  `UnitOfWork`; nunca puede persistirse media transferencia.
- La cuenta de origen y la de destino deben existir, estar abiertas y ser
  distintas. El importe es siempre positivo en la entrada del caso de uso.
- Entre dos cuentas on-budget el efecto neto sobre Ready to Assign es cero.
- Al mover desde on-budget a tracking, el dinero sale de Ready to Assign; el
  movimiento inverso lo incorpora.
- El editor permite seleccionar origen y destino y reutiliza el mismo teclado,
  fecha, memo y estado de una transacción normal.
- Las filas enlazadas se identifican como Transfer; los payees técnicos
  generados para cada parte no aparecen en la lista de Payees.
- Una parte reconciliada protege la pareja completa frente a edición o borrado.
- El parser de pareja exige dos cuentas distintas, importes opuestos exactos y
  el mismo grupo; las escrituras SQLite tienen guards adicionales.

Las relaciones no propietarias usan `transaction_links` con tipo `related` o
`bizum`. Sus extremos se normalizan para evitar duplicados y borrar una
transacción elimina sus vínculos mediante foreign keys, nunca la otra
transacción.

## 7. Fase 7 — Reconciliation

Estado: implementada y validada automáticamente. La aceptación manual forma
parte del checklist de la release.

Conciliar significa comparar el saldo que Jarling calcula para una cuenta con el
saldo confirmado por el banco en una fecha de corte. Si coinciden, las
transacciones incluidas pasan a `reconciled` y quedan protegidas frente a
cambios accidentales. Sirve para detectar movimientos ausentes, duplicados o
con importes incorrectos; no mueve dinero ni cambia por sí sola el presupuesto.

- Accounts abre un menú por cuenta con la acción Reconcile.
- La vista separa cleared balance y working balance; las operaciones uncleared
  no forman parte del saldo que se confirma.
- Si el saldo coincide, todas las transacciones `cleared` hasta hoy pasan a
  `reconciled` dentro de un único `UnitOfWork`.
- Si existe una diferencia, el usuario debe confirmar explícitamente un
  `Reconciliation Balance Adjustment`. El ajuste queda reconciliado y modifica
  el saldo/RTA de forma visible; nunca se corrige dinero silenciosamente.
- Las operaciones ya reconciliadas permanecen inmutables. No se necesita una
  migración en la primera release porque el estado forma parte de su baseline.

## 8. Fase 8 — Reports

Estado: implementada y validada automáticamente. La aceptación manual forma
parte del checklist de la release.

Informes derivados de transacciones y presupuesto, sin persistir agregados como
fuente alternativa de verdad.

- Spending Breakdown agrupa y ordena el gasto neto por categoría.
- Income vs Spending compara seis meses y excluye saldos iniciales y
  transferencias de los ingresos.
- Net Worth incorpora cuentas de presupuesto y tracking, separando activos y
  deuda.
- Los cálculos viven en Domain, la carga en Application y las gráficas se
  dibujan con componentes nativos, sin una dependencia de charts.

## 9. Settings, privacidad y portabilidad

- Budget Settings permite editar nombre, moneda, separadores numéricos,
  posición del símbolo y formato de fecha. Save persiste las preferencias y
  Budget usa el nombre configurado.
- Theme ofrece Light, Dark y Match System con aplicación inmediata.
- App Lock solo puede activarse después de una autenticación válida y vuelve a
  bloquear la interfaz al abandonar la aplicación. Se admite el fallback a las
  credenciales del dispositivo ofrecido por el sistema.
- La base SQLite se guarda como `jarling.db` en el almacenamiento privado de la
  aplicación. No contiene cifrado gestionado por Jarling. Su baseline es la
  primera base pública compatible y queda gobernado por ADR 0003.
- Cada copia `.jarling` solicita y confirma su propia contraseña. La copia
  contiene únicamente el snapshot cifrado y conserva esa contraseña aunque se
  creen posteriormente otras copias con una distinta.
- La restauración limita tamaño, filas y textos, valida semántica, claves
  foráneas, pares de transferencia e integridad SQLite.
- Delete Plan exige confirmación, borra los datos financieros dentro de una
  transacción SQLite y recrea únicamente las categorías predeterminadas. Las
  preferencias de aplicación se mantienen; las de presupuesto vuelven a sus
  valores iniciales.
- Los bottom sheets calculan `max(paddingSolicitado, safeAreaBottom)` en lugar
  de sumar ambos valores.

## 10. Protocolo de ejecución rápida

Este protocolo sustituye la planificación extensa por turno.

### Antes de editar

1. Leer la sección relevante y los ADR aplicables, sin cargar contexto ajeno al
   cambio.
2. Ejecutar `rg` sobre las interfaces y patrones directamente relacionados.
3. Confirmar que el árbol de trabajo no contiene cambios solapados.
4. Usar la especificación cerrada de la fase; no rediseñarla salvo
   contradicción demostrable con el código.

### Durante la implementación

1. Trabajar en un vertical slice pequeño: Domain → Application →
   Infrastructure → Bootstrap → Presentation.
2. Reutilizar repositorios, hooks, componentes de navegación y teclado
   monetario existentes.
3. Ejecutar tests enfocados después de cada capa, no la suite completa tras cada
   archivo.
4. Ejecutar typecheck cuando el slice compile de extremo a extremo.
5. No hacer refactors no necesarios ni introducir fases aplazadas.

### Validación final única

```bash
npm run format:check
npm run typecheck
npm run lint
npm run test:coverage
npm run export:web
npm run export:android
npm run export:ios
```

Los exports se ejecutan una vez al final, no después de cada cambio visual.

### Informe final

Entregar únicamente:

1. Implementado.
2. Archivos principales.
3. Decisiones o desviaciones.
4. Tests y validación.
5. Pendiente de la siguiente fase.

## 11. Límites de implementación

- No usar `any`, `eslint-disable` ni `@ts-ignore` para ocultar problemas.
- No ejecutar SQL desde Presentation.
- No guardar resultados derivados como fuente de verdad.
- No ejecutar `npm audit fix --force`.
- No añadir dependencias sin justificar una necesidad concreta.
- No modificar una migración publicada ni recrear una base de usuario para
  evitar escribir una migración nueva.
- No marcar una fase como completada sin tests automatizados y validación de
  empaquetado.

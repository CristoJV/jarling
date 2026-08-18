# Plan de ejecución de Jarling

> Documento operativo. Debe mantenerse corto y orientado a la siguiente
> entrega. El código y los tests son la referencia para las fases completadas.

## 1. Estado y orden de ejecución

Última actualización: 18 de agosto de 2026.

| Orden | Fase                                                                | Estado      |
| ----- | ------------------------------------------------------------------- | ----------- |
| 0–5   | Foundation, Accounts, Categories, Transactions, Budget y Move Money | Completadas |
| 9     | Targets                                                             | Completada  |
| 6     | Transfers                                                           | Aplazada    |
| 7     | Reconciliation                                                      | Aplazada    |
| 8     | Reports                                                             | Aplazada    |

No implementar las fases 6, 7 u 8 sin una nueva aprobación explícita. Scheduled
Transactions, Payees como entidad, sincronización y cloud quedan fuera de
alcance. La siguiente fase está deliberadamente sin seleccionar.

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
- SQLite local con un baseline consolidado y runner de migraciones conservado
  para el futuro.
- Clean Architecture pragmática:

```text
Presentation → Application → Domain ← Infrastructure
                         ↑
                     Bootstrap
```

- `ApplicationServices` y `createApplication` son los puntos de composición.
- Repositorios in-memory para tests de casos de uso y SQLite para runtime.
- 127 tests después de completar Targets y sus variantes de financiación.
- Web y Android exportan correctamente. iOS nativo continúa pendiente de un
  entorno macOS.

### Mapa rápido del código

```text
src/domain/                 entidades, value objects, servicios y puertos
src/application/            casos de uso y contratos de aplicación
src/infrastructure/         SQLite, repositorios y servicios del sistema
src/bootstrap/              inicialización y composición
src/presentation/           hooks, componentes, pantallas y utilidades UI
src/app/                    rutas Expo Router sin lógica de negocio
```

No crear capas nuevas, estados globales ni dependencias salvo que una necesidad
de Targets no pueda resolverse con estos patrones.

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

Estado: completada y validada automáticamente. Pendiente únicamente de smoke
test visual en dispositivo real.

### 5.1 Objetivo

Permitir que cada categoría tenga como máximo un objetivo de financiación y
mostrar progreso y recomendación mensual. Targets aporta orientación; no mueve
dinero ni altera los cálculos presupuestarios existentes.

### 5.2 Modelo soportado

```ts
type TargetKind = 'weekly' | 'monthly' | 'yearly' | 'custom';
type WeeklyFundingMode = 'set_aside' | 'refill_up_to';
type CustomFundingMode = 'set_aside' | 'fill_up_to' | 'balance';
```

- Todo importe es positivo y solo existe un target por categoría.
- Weekly guarda día ISO y estrategia de aportar o reponer.
- Monthly guarda último día (`0`) o día 1–31; en meses cortos se ajusta al
  último día real.
- Yearly guarda una fecha válida y repite el objetivo cada año.
- Custom guarda la estrategia de aportar, rellenar o mantener saldo.
- Al cambiar de tipo se limpian todos los campos exclusivos del tipo anterior.
- Una categoría oculta conserva su target y ninguna operación de target mueve
  dinero por sí sola.

### 5.3 Semántica de cálculo

`calculateTargetProgress` es un servicio puro. Las estrategias `set_aside`
miden lo aportado usando Assigned; las de reposición y saldo usan Available.

```text
Weekly goal = amount × occurrences(dayOfWeek, selectedMonth)
Monthly goal = amount con vencimiento en dayOfMonth
Yearly recommended = ceil((goal - Available) / inclusiveMonthsToDueDate)
Custom goal = amount
```

Weekly `set_aside` añade el importe aunque exista rollover; `refill_up_to`
repone solo lo gastado. Custom aplica la misma distinción entre `set_aside`,
`fill_up_to` y `balance`. El progreso se limita a `0..1` y devuelve
`underfunded`, `complete` u `overdue`.

### 5.4 Persistencia y casos de uso

`category_targets` contiene `day_of_week`, `weekly_funding_mode`,
`day_of_month`, `target_date` y `custom_funding_mode`, con una restricción SQL
que impide combinar campos de tipos distintos. La base activa es
`jarling-development-v4.db`; el runner de migraciones se conserva para el
futuro, pero no se migra información de desarrollo anterior.

Los casos de uso son `GetCategoryTargets`, `SetCategoryTarget` y
`DeleteCategoryTarget`, expuestos en `ApplicationServices.targets`. El
repositorio ofrece `findAll`, `findByCategory`, `save` y `deleteByCategory`.

### 5.5 UI entregada

- Edit Budget separado, `+` por grupo, orden manual oculto y acceso a Details.
- Editor light Weekly / Monthly / Yearly / Custom con teclado TPV.
- Weekly: día y `Set aside another` / `Refill up to` por semana.
- Monthly: selector inferior `Last Day` o 1st–31st.
- Yearly: calendario inferior con año, mes y día.
- Custom: tres opciones seleccionables con explicación y casos de uso.
- Budget muestra barras Funded, Spent u Overspent solo cuando aportan contexto.
- Los grupos colapsan usando el mismo chevron rotado 90 grados.
- El selector año/mes está anclado al fondo.
- El tab bar incorpora el safe-area inferior real de Android.
- Las categorías iniciales contienen emoji y Demo utiliza sus IDs estables, sin
  crear un grupo `Everyday`.

### 5.6 Validación y Definition of Done

- Validación de combinaciones, create/update/delete, unicidad y mapeo SQLite.
- Matriz de cálculo para los cuatro tipos, vencimientos, cuatro/cinco semanas,
  redondeo en céntimos, estrategias y progress `0..1`.
- Tests de integración garantizan que los targets no modifican RTA ni Budget.
- Demo es idempotente y solo referencia categorías predeterminadas.
- Typecheck, lint, 127 tests y exports web/Android deben pasar.
- Queda únicamente el smoke test visual en un dispositivo Android real.

## 6. Fases aplazadas

Estas fases conservan su número, pero no bloquean Targets.

### Fase 6 — Transfers

Transferencias atómicas mediante un identificador de vínculo genérico entre dos
transacciones. Antes de implementarla hay que decidir el comportamiento de los
cruces on-budget ↔ tracking.

### Fase 7 — Reconciliation

Comparación con saldo real, transición explícita a `reconciled` y protección de
operaciones conciliadas.

### Fase 8 — Reports

Informes derivados de transacciones y presupuesto, sin persistir agregados como
fuente alternativa de verdad.

## 7. Protocolo de ejecución rápida

Este protocolo sustituye la planificación extensa por turno.

### Antes de editar

1. Leer solo las secciones 1–5 de este documento.
2. Ejecutar `rg` sobre las interfaces y patrones directamente relacionados.
3. Confirmar que el árbol de trabajo no contiene cambios solapados.
4. Usar la especificación cerrada de la fase; no rediseñarla salvo
   contradicción demostrable con el código.

### Durante la implementación

1. Trabajar en un vertical slice pequeño: Domain → Application →
   Infrastructure → Bootstrap → Presentation.
2. Reutilizar repositorios, hooks, modales y teclado monetario existentes.
3. Ejecutar tests enfocados después de cada capa, no la suite completa tras cada
   archivo.
4. Ejecutar typecheck cuando el slice compile de extremo a extremo.
5. No hacer refactors no necesarios ni introducir fases aplazadas.

### Validación final única

```bash
npm run format:check
npm run typecheck
npm run lint
npm test
npx expo export --platform web
npx expo export --platform android
```

Los exports se ejecutan una vez al final, no después de cada cambio visual.

### Informe final

Entregar únicamente:

1. Implementado.
2. Archivos principales.
3. Decisiones o desviaciones.
4. Tests y validación.
5. Pendiente de la siguiente fase.

## 8. Límites de implementación

- No usar `any`, `eslint-disable` ni `@ts-ignore` para ocultar problemas.
- No ejecutar SQL desde Presentation.
- No guardar resultados derivados como fuente de verdad.
- No ejecutar `npm audit fix --force`.
- No añadir dependencias sin justificar una necesidad concreta.
- No borrar datos o regenerar la base activa sin aplicar primero el cambio de
  nombre de la base de desarrollo previsto para Targets.
- No marcar una fase como completada sin tests automatizados y validación de
  empaquetado.

# Plan de mejoras de interacción, presupuesto y cuentas

> Plan ejecutable para mejorar la fluidez de navegación, el comportamiento del
> teclado y los flujos de categorías, movimientos de dinero y cuentas sin
> debilitar las reglas financieras existentes.

- Estado: implementación completada; pendiente la aceptación manual en
  dispositivo y la ejecución E2E cuando Maestro esté disponible.
- Última actualización: 20 de agosto de 2026.
- CHANGELOG: se actualizará únicamente cuando se solicite al cerrar el bloque.
- ADR: no se creará uno por cada cambio. Solo se documentará una decisión si
  modifica de forma duradera un límite arquitectónico crítico.

## 1. Objetivos

1. Reducir el tiempo percibido de las transiciones, especialmente al crear una
   transacción.
2. Evitar que cualquier teclado tape el contenido o el campo que se está
   editando.
3. Mantener montado el borrador de New Transaction durante todos sus
   selectores.
4. Convertir los flujos de pantalla completa en rutas coherentes y reservar los
   modales para interacciones pequeñas.
5. Ofrecer errores financieros accionables, sin replicar reglas de negocio en
   Presentation.
6. Incorporar Ready to Assign al movimiento de dinero sin convertirlo en una
   categoría persistida.
7. Proteger Uncategorized como estructura del sistema.
8. Sustituir el menú modal de cuenta por una pantalla de detalle completa.

## 2. Diagnóstico inicial

- `Running "main" with ... fabric:true` es un mensaje informativo del runtime
  de React Native en desarrollo, no un error de Jarling.
- El warning real procede de `InteractionManager` en Payee Selection. Esa API
  está obsoleta y debe dejar de importarse.
- Transaction Editor sustituye actualmente todo su árbol visual al abrir un
  selector. Al volver, el formulario se vuelve a montar visualmente y produce
  la sensación de reconstrucción.
- Las pantallas completas mezclan rutas de Expo Router con `Modal` nativos que
  simulan una pantalla. Esto crea dos sistemas de navegación y animación.
- Android ya declara `softwareKeyboardLayoutMode: "resize"`, pero las
  pantallas y modales no siguen todavía una única estructura sensible al
  teclado.
- El movimiento actual solo acepta categoría → categoría. Ready to Assign no
  forma parte del contrato del caso de uso.
- `InsufficientReadyToAssignError` no incluye todavía el importe solicitado,
  disponible y faltante que necesita una respuesta visual accionable.

## 3. Decisiones de implementación

### 3.1 Pantallas, flujos internos y modales

Usar una única pila de rutas para destinos que ocupan toda la pantalla:

```text
(tabs)
transaction/new
transaction/[id]
category/[id]
category/[id]/target
account/new
account/[id]
account/[id]/reconcile
budget/edit
budget/move
settings
```

Los selectores de Type, Payee, Account y Category permanecen dentro del flujo
de Transaction. Se presentan como una capa interna de pantalla completa que se
anima sobre el editor, sin desmontarlo ni crear rutas adicionales.

Los modales quedan limitados a:

- Confirmaciones destructivas.
- Renombrados mediante diálogo central.
- Selector de fecha nativo.
- Asignación rápida de una categoría mediante bottom sheet.

### 3.2 Presupuesto de animación

Centralizar duraciones y curvas en tokens de movimiento:

| Interacción               | Entrada | Salida |
| ------------------------- | ------: | -----: |
| Ruta de pantalla completa |  160 ms | 140 ms |
| Selector interno          |  140 ms | 120 ms |
| Bottom sheet              |  170 ms | 150 ms |
| Diálogo central           |  140 ms | 120 ms |

- Usar aceleración nativa siempre que la propiedad animada lo permita.
- Mantener el fondo ya pintado con el tema activo durante toda la transición.
- Respetar Reduce Motion del sistema usando una transición inmediata o un fade
  corto.
- Validar los tiempos en Android e iOS: no asumir que ambos motores aplican de
  igual forma la duración configurada.

### 3.3 Contrato del teclado

Crear dos layouts reutilizables:

- `KeyboardResponsiveScreen`: pantalla completa con contenido adaptable y
  campos de texto.
- `BottomActionLayout`: contenido superior flexible y acciones o teclado en la
  zona inferior.

Reglas:

- El teclado nativo reduce el viewport disponible; nunca se superpone al campo
  enfocado.
- Android utiliza el resize nativo ya configurado, sin aplicar una segunda
  reducción artificial.
- iOS aplica `KeyboardAvoidingView` con el offset real del header.
- El contenido superior puede desplazarse lo mínimo necesario para conservar
  visible el foco.
- Los teclados numéricos propios son parte del layout flex y consumen altura
  real, no se posicionan de forma absoluta.
- Los modales centrales mantienen inputs y botones dentro de su altura útil.

## 4. Orden de ejecución

### Bloque A — Movimiento, rutas y New Transaction

- [x] Crear tokens de movimiento compartidos.
- [x] Reducir la duración de la transición raíz, incluida New Transaction.
- [x] Convertir las pantallas completas que aún usan `FullScreenModal` en rutas
      reales.
- [x] Reorganizar las rutas según el mapa definido en 3.1.
- [x] Centralizar la construcción de destinos en helpers de navegación tipados.
- [x] Mantener `TransactionEditorScreen` montado mientras se abre un selector.
- [x] Presentar Type, Payee, Account y Category como capas internas animadas.
- [x] Conservar cantidad, tipo, payee, cuenta, categoría, fecha, memo, cleared,
      Show More y visibilidad del teclado al volver.
- [x] Añadir una caché en memoria limitada a cuentas, categorías y payees para
      mostrar New Transaction sin esperar de nuevo a todas las consultas.
- [x] Invalidar esa caché cuando se cree, renombre, cierre u oculte una entidad
      relacionada.
- [x] Precargar los datos de referencia con `requestIdleCallback`, sin bloquear
      el arranque.
- [x] Sustituir `InteractionManager` por `requestAnimationFrame` para enfocar el
      buscador de Payee después del primer frame.
- [x] Eliminar imports y compatibilidad obsoleta de `InteractionManager`.

#### Aceptación del bloque A

- New Transaction muestra un primer frame tematizado inmediatamente.
- No aparece un frame blanco, footer intermedio ni pestaña equivocada.
- Volver desde Payee, Account o Category revela el mismo editor ya montado.
- El borrador permanece intacto y no aparece un indicador de carga al volver.
- El warning de `InteractionManager` desaparece.
- El botón físico Back reproduce la misma animación y resultado que el botón de
  la interfaz.

### Bloque B — Layouts sensibles al teclado

- [x] Implementar `KeyboardResponsiveScreen` y `BottomActionLayout`.
- [x] Aplicarlos a New/Edit Transaction y al memo central.
- [x] Aplicarlos a Payee Selection y búsquedas de Transactions.
- [x] Aplicarlos a Category Notes y renombrados.
- [x] Aplicarlos a creación, detalle y renombrado de cuentas.
- [x] Aplicarlos a Settings y al resto de inputs existentes.
- [x] Revisar `ModalScaffold` para que no combine resize nativo y ajuste manual
      de forma duplicada.
- [x] Verificar que la configuración Android compilada conserva
      `adjustResize`; los cambios nativos se prueban con una rebuild, no solo
      con recarga de Metro.
- [x] Configurar dismiss interactivo donde sea apropiado sin perder cambios.

#### Aceptación del bloque B

- El campo enfocado y su acción de guardado permanecen visibles.
- El teclado consume parte de la pantalla y el contenido restante se adapta.
- No hay saltos dobles de altura en Android.
- Los dispositivos pequeños pueden alcanzar todos los campos y botones.
- Ocultar el teclado devuelve exactamente el espacio anterior.

### Bloque C — Modelo financiero para Ready to Assign y errores accionables

- [x] Sustituir el contrato categoría → categoría por una ubicación de
      presupuesto discriminada:

```ts
type BudgetLocation =
  | Readonly<{ kind: 'ready-to-assign' }>
  | Readonly<{ kind: 'category'; categoryId: string }>;
```

- [x] Implementar Ready to Assign → categoría reutilizando la semántica de una
      asignación y comprobando RTA.
- [x] Implementar categoría → Ready to Assign reduciendo Assigned y aumentando
      RTA de forma derivada.
- [x] Conservar categoría → categoría sin alterar el RTA total.
- [x] Rechazar RTA → RTA, ubicaciones iguales, céntimos inválidos y fondos
      insuficientes.
- [x] Ejecutar las escrituras compuestas dentro de un único `UnitOfWork`.
- [x] Ampliar los errores de fondos insuficientes con `requested`, `available`
      y `missing`, manteniendo la decisión en Application/Domain.
- [x] No persistir Ready to Assign como categoría ni como fila especial.

#### Aceptación del bloque C

| Movimiento              | Resultado esperado                                        |
| ----------------------- | --------------------------------------------------------- |
| RTA → categoría         | Aumenta Assigned y disminuye RTA por el mismo importe.    |
| Categoría → RTA         | Disminuye Assigned y aumenta RTA por el mismo importe.    |
| Categoría → categoría   | Cambian ambas allocations y RTA permanece igual.          |
| Fondos insuficientes    | No se escribe nada y se informa exactamente del faltante. |
| Fallo durante escritura | El `UnitOfWork` revierte el movimiento completo.          |

### Bloque D — Uncategorized protegido

- [x] Crear un grupo propio `Uncategorized` que contenga únicamente
      `❓ Uncategorized`.
- [x] Mover la categoría predeterminada fuera de Needs en el baseline y en
      `EnsureDefaultCategories`.
- [x] Centralizar `isProtectedCategory` e `isProtectedGroup`; no repartir
      comparaciones de IDs por casos de uso y pantallas.
- [x] Impedir renombrar, ocultar y reordenar la categoría protegida.
- [x] Impedir renombrar y reordenar su grupo.
- [x] Impedir crear otras categorías dentro del grupo protegido.
- [x] Preparar la misma política para que un futuro borrado tampoco pueda
      eliminarla.
- [x] Ocultar en Edit Budget los controles estructurales que no se permiten.
- [x] Mantener permitidas las transacciones, asignaciones y movimientos sobre
      el sobre Uncategorized.
- [x] Adaptar sample data, delete plan, backup/restore y tests a los IDs
      estables.

#### Aceptación del bloque D

- Un gasto nuevo siempre puede seleccionar Uncategorized.
- Ninguna llamada directa a un caso de uso puede modificar su identidad o
  estructura.
- Restaurar o borrar el plan vuelve a garantizar el grupo y categoría
  protegidos.
- La protección no depende exclusivamente de botones ocultos en Presentation.

### Bloque E — Move Money Screen y asignación rápida

- [x] Crear la ruta `budget/move`.
- [x] Mostrar el importe centrado sobre la calculadora.
- [x] Añadir selector From y selector To.
- [x] Inyectar Ready to Assign como opción virtual únicamente en estos dos
      selectores.
- [x] Mostrar el disponible de cada categoría y el valor actual de RTA.
- [x] Seleccionar por defecto `From: Ready to Assign`.
- [x] Seleccionar por defecto en To la categoría desde la que se inició el
      movimiento.
- [x] Añadir un botón `swap-vertical` que intercambie origen y destino.
- [x] Reutilizar la misma calculadora y operaciones que New Transaction.
- [x] Mantener el estado de la pantalla al entrar y salir de los selectores.
- [x] Mostrar validaciones inline sin descartar importe ni selecciones.
- [x] Volver a Budget o Category Details con sus datos actualizados.

Rehacer el bottom sheet de asignación rápida:

- [x] Eliminar su `ScrollView`.
- [x] Calcular su altura a partir del viewport y safe-area disponibles.
- [x] Evitar `navigationBarTranslucent` cuando provoque que el sheet entre bajo
      la navegación de Android.
- [x] Usar la calculadora compacta de New Transaction con ×, ÷, +, −, = y Done.
- [x] Mantener una acción de guardado inequívoca y accesible.
- [x] Asegurar que contenido, calculadora y acción caben en el tamaño mínimo
      soportado sin quedar cortados.

#### Aceptación del bloque E

- Ready to Assign no aparece en Transaction Category ni en selectores normales.
- El botón swap produce siempre una combinación válida o muestra una
  explicación concreta.
- El bottom sheet nunca queda bajo la barra de navegación de Android.
- El sheet no necesita scroll para su interacción normal.
- La calculadora es visual y funcionalmente la misma que en New Transaction.

### Bloque F — Category Details y respuesta de targets

- [x] Exponer desde el cálculo de Budget los siguientes valores explícitos:

```text
Available from previous month
Assigned for selected month
Activity in selected month
Available
```

- [x] Calcular el rollover anterior en Domain, no mediante aritmética duplicada
      en la pantalla.
- [x] Mostrar nombres de meses localizados en las etiquetas.
- [x] Mantener Activity derivada de las transacciones del mes.
- [x] Después de Assign, recargar balance y progreso desde Application.
- [x] Si el target queda al día, colorear el progreso en verde y mostrar
      `You are on track to meet your target!`.
- [x] Si el progreso llega al 100 %, mostrar un check dentro del círculo y
      conservar el porcentaje en la información de accesibilidad.
- [x] Si falta dinero en RTA, mostrar requested, available y missing.
- [x] Añadir una acción `Move money` que abra `budget/move` con la categoría
      actual como destino.
- [x] Conservar la pantalla y el target intactos si se cancela el movimiento.
- [x] Sustituir el botón textual Edit de Budget por `pencil-outline`, manteniendo
      su etiqueta accesible.

#### Estados visuales del target

| Estado                             | Color    | Mensaje/indicador                            |
| ---------------------------------- | -------- | -------------------------------------------- |
| Falta asignar este mes             | Amarillo | `Assign X more this month to stay on track.` |
| Al día, progreso inferior al 100 % | Verde    | `You are on track to meet your target!`      |
| Objetivo financiado al 100 %       | Verde    | Check visible dentro del círculo.            |
| RTA insuficiente                   | Error    | Faltante exacto y acción `Move money`.       |

### Bloque G — Account Details

- [x] Añadir `GetAccountDetails` como read model independiente de la pantalla.
- [x] Calcular Working Balance con todas las transacciones aplicables.
- [x] Calcular Cleared Balance con `cleared` y `reconciled`.
- [x] Exponer Uncleared Balance como la diferencia, además de los contadores.
- [x] Añadir `RenameAccount` con validación de nombre y `UnitOfWork`.
- [x] Crear la ruta `account/[id]`.
- [x] Mostrar nombre, tipo, Working, Cleared y Uncleared.
- [x] Renombrar mediante diálogo central.
- [x] Abrir Reconciliation como ruta `account/[id]/reconcile`.
- [x] Mantener confirmación explícita para Close Account.
- [x] Conservar la regla de que una cuenta con saldo distinto de cero no puede
      cerrarse y convertir el error en una explicación accionable.
- [x] Hacer que tocar una cuenta navegue directamente a Account Details y
      retirar el modal de acciones anterior.

#### Aceptación del bloque G

- Working = Cleared + Uncleared para el mismo corte temporal.
- Renombrar no altera identidad, tipo, saldo ni transacciones.
- Reconcile vuelve a Account Details con balances actualizados.
- Close respeta las reglas actuales y nunca oculta dinero por accidente.
- Accounts se refresca al volver sin mostrar datos anteriores.

## 5. Cobertura de los requisitos

| Requisito solicitado                                   | Bloque principal |
| ------------------------------------------------------ | ---------------- |
| Transiciones más rápidas y New Transaction             | A                |
| Teclado que reduzca el espacio disponible              | B                |
| Assign con éxito, error y Move Money                   | C, E, F          |
| Desglose del balance de categoría                      | F                |
| Warning de `InteractionManager`                        | A                |
| Regreso fluido desde Payee/Account/Category            | A                |
| Enrutado uniforme                                      | A                |
| Icono Edit en Budget                                   | F                |
| Grupo y categoría Uncategorized protegidos             | D                |
| Account Details y sustitución del modal                | G                |
| Bottom sheet de categoría compacto y calculadora común | B, E             |
| Move Money Screen con RTA, selectores y swap           | C, E             |

## 6. Estrategia de pruebas

### 6.1 Unitarias y de integración

- Matriz completa de movimientos RTA/categoría y categoría/categoría.
- Rollback atómico ante fallos en cualquier escritura.
- Errores con requested, available y missing correctos en céntimos.
- Cálculo de rollover, Assigned, Activity y Available.
- Estados de target amarillo, verde y completo.
- Protección de Uncategorized desde todos los casos de uso estructurales.
- Balances Working, Cleared y Uncleared de cuenta.
- Renombrado de cuenta sin cambios colaterales.
- Helpers de altura, safe-area y movimiento cuando contengan lógica pura.

### 6.2 Componentes

- Transaction Editor conserva su árbol y el borrador entre selectores.
- El foco de Payee se solicita sin `InteractionManager`.
- Assign insuficiente muestra la acción de recuperación.
- El check de target conserva la información accesible del porcentaje.
- Ready to Assign solo aparece en Move Money.
- Bottom sheet respeta insets y tamaño útil.

### 6.3 E2E y aceptación manual

- Abrir New Transaction desde Budget y Transactions sin frames blancos.
- Elegir Payee, Account y Category y volver sin reconstrucción visible.
- Abrir/cerrar teclado en todos los campos con el contenido visible.
- Intentar financiar un target sin RTA, mover fondos y quedar on track.
- Completar un target al 100 % y comprobar el check.
- Mover RTA → categoría, categoría → RTA y categoría → categoría.
- Probar swap y errores por saldo insuficiente.
- Confirmar que Uncategorized no ofrece operaciones estructurales.
- Abrir Account Details, renombrar, reconciliar y cerrar cuando corresponda.
- Probar Android con navegación de tres botones y navegación por gestos.
- Probar tamaños pequeños y temas light/dark.

## 7. Gates por bloque

Cada bloque debe terminar con:

```bash
npm run format:check
npm run typecheck
npm run lint
npm run test:coverage
```

Cuando un bloque cambie navegación, layout o dependencias nativas:

```bash
npm run export:web
npm run export:android
npm run export:ios
npm run test:e2e
```

No se empieza el bloque siguiente con tests rotos. El recuento exacto de tests
no se fija en este documento para evitar que quede obsoleto.

## 8. Definition of Done global

- [x] Las doce mejoras están cubiertas por los bloques anteriores.
- [x] No quedan pantallas completas implementadas como modales salvo una
      excepción justificada.
- [x] No quedan imports de `InteractionManager`.
- [x] New Transaction conserva el borrador y no reconstruye visualmente el
      editor al volver de selectores.
- [x] Ningún teclado tapa el campo activo ni sus acciones esenciales.
- [x] Ready to Assign participa en movimientos sin convertirse en categoría.
- [x] Las reglas financieras continúan en Domain/Application.
- [x] Uncategorized queda protegido en Application y Presentation.
- [x] Category Details y Account Details muestran cálculos derivados de una
      única fuente de verdad.
- [ ] Navegación Android, safe areas y themes superan aceptación manual.
- [ ] Typecheck, lint, cobertura, bundles y E2E terminan correctamente. Falta
      únicamente E2E por no estar instalado Maestro en este entorno.
- [x] El CHANGELOG solo se actualiza cuando se solicite el cierre del bloque.

## 9. Registro de implementación

### 20 de agosto de 2026

- Rutas de pantalla completa reorganizadas para Transaction, Category, Target,
  Edit Budget, Move Money, Account Details y Reconciliation.
- New Transaction conserva su editor montado bajo selectores animados y usa
  una caché invalidable de cuentas, categorías y payees.
- Movimiento financiero generalizado entre Ready to Assign y categorías, con
  validación de fondos, importes de error precisos y rollback atómico probado.
- `Uncategorized` separado y protegido mediante una política de dominio; el
  baseline y la restauración reparan su estructura si falta o procede de un
  snapshot antiguo.
- Añadidos Move Money, desglose de Category Details, respuesta accionable ante
  RTA insuficiente, progreso completo con check, Account Details, renombrado y
  conciliación como ruta.
- Layouts de teclado y safe-area unificados; los bottom sheets ya no invaden la
  navegación de Android y la asignación rápida no depende de scroll.
- Eliminados los antiguos `FullScreenModal`, Move Budget modal, rutas planas y
  el uso obsoleto de `InteractionManager`.
- Verificación automática superada: typecheck, lint, 52 suites/225 tests,
  cobertura global por encima de los umbrales y bundles web/Android/iOS.
- E2E pendiente: el comando no pudo ejecutarse porque `maestro` no está
  instalado en este entorno. La aceptación visual en dispositivo también se
  mantiene pendiente.
- `CHANGELOG.md` no se ha modificado.

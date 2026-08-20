# Plan de interacción monetaria, teclado y categorías

Estado: implementación completada; pendiente aceptación visual en Android.

## Objetivos

- [x] Hacer que el teclado del memo reduzca el espacio útil y mantenga visible
      la acción de guardar.
- [x] Aplicar el mismo ajuste al editor de notas de Category Details y desplazar
      la lista hasta el campo activo.
- [x] Eliminar el botón `Done` duplicado de la asignación rápida de categoría.
- [x] Separar las acciones `Move Money` y `Details` de la calculadora.
- [x] Mostrar un cursor parpadeante en el importe activo de Category Budget y
      New Transaction, respetando la preferencia de movimiento reducido.
- [x] Hacer que el primer dígito sobreescriba el importe anterior; los dígitos
      posteriores continúan la entrada TPV desde céntimos.
- [x] Encadenar suma, resta, multiplicación y división, resolviendo la operación
      previa antes de comenzar la siguiente.
- [x] Mostrar la expresión completa mientras existe una operación pendiente.
- [x] Resolver la operación con `=`, `Done`, Save o al abandonar el importe, y
      redondear siempre el resultado final a céntimos enteros.
- [x] Animar los bottom sheets desde abajo con aparición progresiva del fondo y
      del contenido.
- [x] Reducir la duración específica de entrada a New Transaction.
- [x] Pedir confirmación `Continue Editing`/`Discard` al abandonar una nueva
      transacción con cambios sin guardar.
- [x] Mostrar un diálogo modal accionable cuando no haya suficiente Ready to
      Assign desde Category Details.

## Diseño técnico aplicado

- La máquina de estados de la calculadora vive en
  `presentation/utils/money-calculator.ts`; el componente visual solo traduce
  pulsaciones a transiciones y expone `resolve()` a la pantalla propietaria.
- Los resultados de multiplicación y división se redondean a céntimos y se
  rechazan resultados fuera del rango de enteros seguros.
- `KeyboardResponsiveScreen` y `ModalScaffold` concentran el comportamiento del
  teclado de sistema en Android e iOS.
- El diálogo de fondos insuficientes conserva la alternativa de abrir Move
  Money con la categoría actual como destino.

## Verificación

- [x] Pruebas unitarias de operaciones, encadenado, sobreescritura, borrado,
      redondeo y límites numéricos.
- [x] TypeScript sin errores.
- [x] ESLint sin errores ni advertencias.
- [ ] Aceptación manual en Android pequeño con navegación por gestos y tres
      botones.
- [ ] Aceptación manual en temas claro y oscuro.

`CHANGELOG.md` no se modifica hasta el cierre de la release.

<p align="center">
  <img src="../assets/images/jarling-icon.png" width="164" alt="Icono de Jarling" />
</p>

<h1 align="center">Jarling</h1>

<p align="center">
  <strong>Presupuesto por sobres diseñado para proteger tu privacidad.</strong><br />
  Dale un propósito a cada euro y conserva tu plan financiero en tu dispositivo.
</p>

<p align="center">
  <a href="../README.md">English</a> · <strong>Español</strong>
</p>

<p align="center">
  <a href="https://github.com/CristoJV/jarling/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/CristoJV/jarling/actions/workflows/ci.yml/badge.svg" /></a>
  <img alt="Expo" src="https://img.shields.io/badge/Expo-57-000020?logo=expo" />
  <img alt="React Native" src="https://img.shields.io/badge/React%20Native-0.86-61DAFB?logo=react" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript" />
  <img alt="Local first" src="https://img.shields.io/badge/data-local--first-167D6C" />
  <img alt="Licencia" src="https://img.shields.io/badge/license-MIT-blue" />
</p>

Jarling es una aplicación de presupuesto personal local-first para Android,
iOS y web. Traslada la claridad del **método de presupuesto por sobres** a una
interfaz moderna y directa: divide el dinero disponible entre categorías con
un propósito, gasta desde ellas y adapta el plan cuando cambie la realidad.

Jarling está diseñado para planificar, no solo para registrar gastos cuando el
dinero ya se ha ido. Cuentas, transacciones, objetivos e informes ayudan a
responder una misma pregunta: **¿qué debe hacer ahora el dinero que tienes?**

## Presupuesto por sobres

Los sobres tradicionales convierten un único saldo en varias decisiones de
gasto. Jarling aplica digitalmente el mismo método:

1. Registra el dinero que tienes actualmente en tus cuentas.
2. Asígnalo a sobres como alquiler, alimentación, transporte o ahorro.
3. Gasta desde esos sobres y mueve dinero entre ellos cuando cambien tus
   prioridades.

Solo se asigna dinero que ya existe. Los saldos de las categorías permiten ver
las decisiones antes de gastar, mientras que los objetivos ayudan a preparar
facturas periódicas y metas a largo plazo.

## Funciones principales

- Presupuestos mensuales por sobres organizados en grupos y categorías.
- Objetivos de financiación semanales, mensuales, anuales y personalizados.
- Estados claros de financiado, pendiente, gastado, disponible y sobregastado.
- Transacciones, transferencias, beneficiarios, notas y búsqueda refinable.
- Saldos y reconciliación de cuentas con el saldo real.
- Informes de ingresos, gastos y patrimonio neto.
- Almacenamiento SQLite local en el directorio privado de la aplicación, sin
  necesidad de crear una cuenta.
- Copias `.jarling` portátiles y cifradas de forma independiente con la
  contraseña elegida al exportarlas.
- Exportación JSON legible; ambos formatos se restauran mediante un único
  proceso transaccional, validado y compatible con versiones anteriores.
- Protección opcional mediante las credenciales del dispositivo.
- Temas claro, oscuro y según el sistema.
- Interfaz en español e inglés según el idioma del dispositivo.

## Principios del producto

- **Planificar antes de gastar.** El presupuesto es la fuente de verdad y las
  transacciones lo mantienen actualizado.
- **Tus datos son tuyos.** La información financiera se almacena localmente y
  la experiencia principal no depende de una cuenta en la nube.
- **Decisiones explícitas.** Mover dinero entre sobres es una parte normal de
  mantener un plan realista.

## Puesta en marcha

Necesitas Node.js 22.13–24 y npm. Las compilaciones nativas requieren además
Android Studio con JDK 17 y NDK 27.1.12297006 o, en macOS, una versión
compatible de Xcode.

Instala las dependencias e inicia la plataforma que quieras utilizar:

```bash
npm ci
npm run android
```

Ejecuta una plataforma concreta:

```bash
npm run android
npm run ios
npm run web
```

## Validación

Ejecuta todas las comprobaciones antes de considerar terminado un cambio:

```bash
npm run doctor
npm run format:check
npm run typecheck
npm run lint
npm run test:coverage
npm run export:web
npm run export:android
npm run export:ios
npm run test:e2e # requiere Maestro y un emulador con build nativo
```

## Arquitectura y estado de la release

Jarling usa una arquitectura limpia pragmática y un baseline SQLite directo
para la versión 1. Las instalaciones nuevas crean el esquema actual sin
reproducir migraciones de desarrollo; el runner conservado se utilizará a
partir del primer cambio de esquema posterior a la publicación. La primera
release excluye deliberadamente importación CSV, conexión bancaria,
sincronización cloud y transacciones programadas.

- [Índice de documentación](README.md)
- [Especificación del producto](product-specification.md)
- [Diseño de interacción](interaction-design.md)
- [Decisiones de arquitectura](adr/README.md)
- [Checklist de la primera release](release-checklist.md)
- [Privacidad y protección de datos](privacy.md)
- [Changelog](../CHANGELOG.md)

## Licencia

Jarling se distribuye bajo la [licencia MIT](../LICENSE).

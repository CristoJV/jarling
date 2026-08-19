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
  <img alt="Expo" src="https://img.shields.io/badge/Expo-57-000020?logo=expo" />
  <img alt="React Native" src="https://img.shields.io/badge/React%20Native-0.86-61DAFB?logo=react" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript" />
  <img alt="Local first" src="https://img.shields.io/badge/data-local--first-167D6C" />
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
- Exportación JSON legible y restauración transaccional de copias.
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

Necesitas Node.js 22.13 o posterior y npm. Las compilaciones nativas requieren
además Android Studio o, en macOS, Xcode.

Instala las dependencias e inicia la plataforma que quieras utilizar:

```bash
npm install
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
npm run format:check
npm run typecheck
npm run lint
npm run test:coverage
npm run test:e2e # requiere Maestro y un emulador con build nativo
```

Jarling está en desarrollo activo. Consulta el
[plan de la aplicación](application-plan.md) para ver el roadmap, las decisiones
de producto y los criterios de aceptación.

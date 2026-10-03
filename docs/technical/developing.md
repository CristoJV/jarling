# Desarrollo local

## Gradle en equipos con recursos limitados (opcional)

Para limitar el consumo de memoria y CPU, añade lo siguiente a
`~/.gradle/gradle.properties`. Al ser una configuración del usuario, sobrevive a
`npm run android:debug:prebuild`, que regenera el directorio `android/`.

```properties
# JVM de Gradle
org.gradle.jvmargs=-Xmx1024m -XX:MaxMetaspaceSize=384m -Dfile.encoding=UTF-8

# Ejecutar lo mínimo simultáneamente
org.gradle.parallel=false
org.gradle.workers.max=1

# Kotlin dentro del mismo proceso para evitar otra JVM
kotlin.compiler.execution.strategy=in-process

# Reducir prioridad del proceso frente al resto del sistema
org.gradle.priority=low

# Reutilizar resultados y evitar trabajo innecesario
org.gradle.caching=true

# Menos recursos persistentes en WSL
org.gradle.vfs.watch=false

# Mantener el daemon un poco más; 60s es demasiado agresivo
org.gradle.daemon=true
org.gradle.daemon.idletimeout=300000
```

Una compilación nativa grande puede superar el límite de 1 GB. Si Gradle termina
por falta de memoria, aumenta primero `-Xmx1024m` a `-Xmx1536m` o `-Xmx2048m`.

## Compilar únicamente la arquitectura del dispositivo

No hace falta añadir `react-native run-android --active-arch-only`. El proyecto
usa Expo CLI y no instala `@react-native-community/cli`; además,
`expo run:android` ya consulta la ABI del dispositivo conectado y, en una build
debug, pasa a Gradle `-PreactNativeArchitectures=<ABI>` automáticamente.

Por tanto, el comando habitual ya compila solamente lo necesario para el
teléfono o emulador elegido:

```bash
npm run android:debug -- --device
```

Las builds release mantienen todas las arquitecturas deliberadamente para que
el artefacto sea distribuible.

## Conectar un teléfono USB a ADB desde WSL 2

En Windows, comprueba primero que la distribución utiliza WSL 2 y lista los
dispositivos USB. Ejecuta estos comandos desde PowerShell:

```powershell
wsl --list --verbose
usbipd list
```

La primera vez, comparte el teléfono usando su `BUSID`. Este paso requiere
PowerShell como administrador; la vinculación queda guardada después de
reiniciar:

```powershell
usbipd bind --busid 2-3
usbipd list
```

Mantén una terminal WSL abierta y conecta el teléfono a WSL desde un PowerShell
normal:

```powershell
usbipd attach --wsl --busid 2-3
usbipd list
```

Dentro de WSL, comprueba que Linux y ADB pueden ver el teléfono:

```bash
lsusb
adb devices -l
```

Si el USB aparece en `lsusb` pero no en ADB, reinicia su servidor y vuelve a
listar los dispositivos. Acepta también la autorización de depuración que
aparezca en el teléfono:

```bash
adb kill-server
adb start-server
adb devices -l
```

Al terminar, desconecta el dispositivo de WSL desde PowerShell para que Windows
pueda volver a utilizarlo:

```powershell
usbipd detach --busid 2-3
```

`bind` solo suele ser necesario la primera vez. `attach` debe repetirse después
de desconectar físicamente el teléfono, reiniciar WSL o reiniciar el equipo.

## Construir e instalar en un usuario Android determinado

Primero conecta el dispositivo, autoriza la depuración USB y localiza tanto el
dispositivo como el identificador del usuario o perfil Android:

```bash
adb devices
adb shell pm list users
adb shell getprop ro.product.cpu.abi
```

Regenera el proyecto nativo debug cuando sea necesario y construye el APK para
la ABI obtenida, por ejemplo `arm64-v8a`:

```bash
npm run android:debug:prebuild
cd android
./gradlew app:assembleDebug -PreactNativeArchitectures=arm64-v8a
cd ..
```

Instala el APK sustituyendo `<USER_ID>` por el identificador mostrado por
Android:

```bash
adb install --user <USER_ID> -r android/app/build/outputs/apk/debug/app-debug.apk
```

Si el paquete ya está instalado en el dispositivo pero no está habilitado para
ese usuario, puede reutilizarse sin volver a transferir el APK:

```bash
adb shell cmd package install-existing --user <USER_ID> com.cristojv.jarling.debug
```

Para arrancarlo en ese perfil y conectarlo a Metro por USB:

```bash
adb reverse tcp:8081 tcp:8081
adb shell am start --user <USER_ID> -n com.cristojv.jarling.debug/.MainActivity
```

## Scripts de desarrollo

Instala primero las versiones exactas de las dependencias:

```bash
npm ci
```

Los comandos habituales son:

```bash
# Iniciar Metro
npm start

# Regenerar Android para la variante de desarrollo
npm run android:debug:prebuild

# Compilar, instalar y abrir Jarling Debug
npm run android:debug

# Elegir entre varios dispositivos o emuladores
npm run android:debug -- --device

# Ejecutar las otras plataformas
npm run ios
npm run web
```

Con Jarling Debug ya instalada, se puede iniciar Metro explícitamente para el
development client sin recompilar la aplicación:

```bash
APP_VARIANT=development npx expo start --dev-client
```

Antes de entregar un cambio, ejecuta como mínimo:

```bash
npm run format:check
npm run typecheck
npm run lint
npm test
```

La puerta de calidad completa está descrita en
[Testing and contributing](testing-and-contributing.md).

# Privacy and data protection

[English](#english) · [Español](#español)

## English

Jarling is local-first. It does not require an account and the application code
does not send financial data, diagnostics, or analytics to a Jarling server.

On Android and iOS, the SQLite database is stored in the application's private
internal directory. The operating system isolates that directory from ordinary
applications and protects device storage according to the platform and device
security configuration. Jarling does not add a second application-managed
encryption layer to the local database.

Application preferences are stored locally. Device credential lock can add an
authentication gate whenever Jarling returns to the foreground. This interface
lock is separate from storage protection and can be enabled in Settings.

Jarling provides two intentionally different portability formats:

- **Export (`.json`)** is human-readable and unencrypted. Anyone with access to
  that file can read its financial data.
- **Backup (`.jarling`)** is encrypted with AES-256-GCM. Its key is derived from
  the password chosen for that backup using PBKDF2-HMAC-SHA256, 310,000
  iterations, and a unique random salt. Jarling cannot recover a forgotten
  backup password.

Each `.jarling` file is independent. Creating another backup with a different
password does not alter previously exported files. Restoration validates the
format and financial relationships before replacing the plan in a single
SQLite transaction. Files are selected and shared through the operating system;
their destination is controlled by the user.

The web build uses browser-managed storage. Do not use it on a shared or
untrusted browser profile for sensitive financial data.

Deleting a plan removes its financial records from the active database. Device
backups and previously exported files are outside the app's control and must be
deleted separately by the user.

## Español

Jarling es local-first. No requiere una cuenta y el código de la aplicación no
envía datos financieros, diagnósticos ni analítica a un servidor de Jarling.

En Android e iOS, la base SQLite se almacena en el directorio interno privado de
la aplicación. El sistema operativo aísla ese directorio de las aplicaciones
normales y protege el almacenamiento según la plataforma y la configuración de
seguridad del dispositivo. Jarling no añade una segunda capa de cifrado
gestionada por la aplicación a la base local.

Las preferencias se guardan localmente. El bloqueo con las credenciales del
dispositivo puede añadir autenticación cada vez que Jarling vuelve a primer
plano. Este bloqueo de interfaz es independiente de la protección del
almacenamiento y puede activarse en Ajustes.

Jarling ofrece dos formatos de portabilidad deliberadamente distintos:

- **Exportación (`.json`)**: legible y sin cifrar. Cualquiera con acceso al
  archivo puede leer sus datos financieros.
- **Copia (`.jarling`)**: cifrada con AES-256-GCM. Su clave se deriva de la
  contraseña elegida para esa copia mediante PBKDF2-HMAC-SHA256, 310.000
  iteraciones y una sal aleatoria única. Jarling no puede recuperar una
  contraseña olvidada.

Cada archivo `.jarling` es independiente. Crear otra copia con una contraseña
distinta no modifica los archivos anteriores. La restauración valida el formato
y las relaciones financieras antes de sustituir el presupuesto dentro de una
única transacción SQLite. Los archivos se eligen y comparten mediante el sistema
operativo; su destino lo controla el usuario.

La versión web usa almacenamiento administrado por el navegador. No debe usarse
en un perfil compartido o no confiable con datos financieros sensibles.

Eliminar un presupuesto borra sus registros de la base activa. Las copias del
dispositivo y los archivos exportados anteriormente están fuera del control de
la aplicación y deben eliminarse por separado.

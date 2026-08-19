# Privacy and data protection

[English](#english) · [Español](#español)

## English

Jarling is local-first. It does not require an account and the application code
does not send financial data, diagnostics, or analytics to a Jarling server.

On Android and iOS, the main SQLite database is encrypted at rest with
SQLCipher using a random 256-bit key kept in the operating system secure store.
Application preferences are also kept in that secure store. Device credential
lock can add an authentication gate whenever the app returns to the foreground.

Jarling provides two intentionally different portability formats:

- **Export (`.json`)** is human-readable and unencrypted. Anyone with access to
  that file can read its financial data.
- **Backup (`.jarling`)** is encrypted with AES-256-GCM. Its key is derived from
  the user's password with PBKDF2-HMAC-SHA256 and a unique random salt. Jarling
  cannot recover a forgotten password.

Restoration validates the format and database relationships, then replaces the
plan in a single SQLite transaction. Files are selected and shared through the
operating system; their destination is controlled by the user.

The web build uses browser-managed local storage and cannot provide SQLCipher's
native at-rest guarantees. Do not use the web build on a shared or untrusted
browser profile for sensitive financial data.

Deleting a plan removes its financial records from the active database. Device
backups, previously exported files, and encrypted `.jarling` copies are outside
the app's control and must be deleted separately by the user.

## Español

Jarling es local-first. No requiere una cuenta y el código de la aplicación no
envía datos financieros, diagnósticos ni analítica a un servidor de Jarling.

En Android e iOS, la base SQLite principal se cifra en reposo con SQLCipher y
una clave aleatoria de 256 bits almacenada en el almacén seguro del sistema
operativo. Las preferencias también se guardan allí. El bloqueo con las
credenciales del dispositivo puede añadir autenticación cada vez que la app
vuelve a primer plano.

Jarling ofrece dos formatos de portabilidad deliberadamente distintos:

- **Exportación (`.json`)**: legible y sin cifrar. Cualquiera con acceso al
  archivo puede leer sus datos financieros.
- **Copia (`.jarling`)**: cifrada con AES-256-GCM. La clave se deriva de la
  contraseña mediante PBKDF2-HMAC-SHA256 y una sal aleatoria única. Jarling no
  puede recuperar una contraseña olvidada.

La restauración valida el formato y las relaciones de la base y sustituye el
presupuesto dentro de una única transacción SQLite. Los archivos se eligen y
comparten mediante el sistema operativo; su destino lo controla el usuario.

La versión web usa almacenamiento administrado por el navegador y no puede
ofrecer las garantías nativas de SQLCipher. No debe usarse en un perfil de
navegador compartido o no confiable con datos financieros sensibles.

Eliminar un presupuesto borra sus registros de la base activa. Las copias del
dispositivo y archivos exportados anteriormente están fuera del control de la
app y el usuario debe eliminarlos por separado.

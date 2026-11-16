# Pruebas con curl sin autenticación

Todas las operaciones HTTP del Gateway son públicas: no requieren login,
cabecera `Authorization`, rol ni cargo. Swagger está en `/api/docs`.
Los DTO, archivos requeridos y reglas de negocio siguen validándose.

```bash
BASE_URL='http://localhost:3000'
curl -i "$BASE_URL/api/employees/findAll"
curl -i "$BASE_URL/api/employees/10"
curl -i "$BASE_URL/api/admin/admin"
curl -i "$BASE_URL/api/administrative-data/contracts/stats"

curl -i -X POST "$BASE_URL/api/admin/create-admin" \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","name":"Juan","last_name":"Perez","age":30}'

curl -i -X PATCH "$BASE_URL/api/employees/updateUser/10" \
  -H 'Content-Type: application/json' \
  -d '{"id_employee":10,"age":30}'

curl -i -X PATCH "$BASE_URL/api/employees/upload-profile-image?employeeId=10" \
  -F 'file=@./foto.png'

curl -i -X POST "$BASE_URL/api/employees/10/qr"
curl -i -X POST "$BASE_URL/api/employees/qr/scan" \
  -H 'Content-Type: application/json' \
  -d '{"qrToken":"VALOR_DEVUELTO_AL_GENERAR_EL_QR"}'
```

La subida de imagen recibe ahora `employeeId` como query obligatorio, en lugar
de extraerlo del token de sesión. `getMyProfile/:id`, `firstTimeSetup/:id` y
`completeFirstLogin/:id` reciben el UUID de Supabase del usuario.

`qrToken` es el contenido del QR que se quiere leer, no una sesión de usuario.
Se obtiene generando un QR sin autenticación; conserva su firma y caducidad.
Para generación/lectura pública de QR se requiere también la actualización de
Users-Microservice de la rama `feature/public-employee-qr`.

Supabase, NATS y las bases de datos siguen siendo dependencias del backend.
Crear usuarios o administradores sigue enviando invitaciones por Supabase.
Los endpoints `/api/auth/*` se conservan por compatibilidad, pero no es
necesario llamarlos para acceder a las demás operaciones.

# Electronix

Proyecto estático listo para GitHub + Vercel + Supabase.

## Estructura

- `index.html` catálogo público
- `styles.css` diseño
- `app.js` catálogo, carrito, precios por cantidad y WhatsApp
- `config.js` URL/key pública de Supabase + WhatsApp
- `admin/index.html` panel privado
- `admin/admin.js` login, stock, precios, fotos y nuevos productos
- `supabase/schema.sql` tablas, permisos, Storage y productos iniciales

## 1. Crear/configurar Supabase

1. Crea un proyecto en Supabase.
2. Ve a SQL Editor.
3. Copia y ejecuta `supabase/schema.sql`.
4. Ve a Authentication > Users y crea manualmente tu usuario administrador.
5. No habilites registro público si solo tú administrarás la tienda.
6. Ve a Project Settings / API y copia:
   - Project URL
   - Publishable key o anon key
7. Pégalos en `config.js`.

IMPORTANTE: nunca pongas una `service_role` key en `config.js` ni en archivos del frontend.

## 2. Probar localmente

Puedes abrir `index.html` directamente.
Para `/admin`, es mejor servir la carpeta con un servidor local simple o probarla ya desplegada en Vercel.

## 3. GitHub

Crea un repositorio, por ejemplo `electronix-web`, y sube todo el contenido de esta carpeta.
El archivo `index.html` debe quedar en la raíz.

## 4. Vercel

1. Add New Project.
2. Importa el repositorio de GitHub.
3. Framework Preset: Other.
4. Build Command: vacío.
5. Output Directory: vacío.
6. Deploy.

La web pública será:
`https://tu-proyecto.vercel.app/`

El panel será:
`https://tu-proyecto.vercel.app/admin/`

## 5. Cambios futuros

### Stock / precio / fotos
Entra a `/admin/`, modifica y guarda.
No requiere commit ni nuevo deploy.

### Diseño / nuevas funciones
Modifica el repositorio de GitHub.
Vercel desplegará automáticamente los cambios.

## WhatsApp

Ya está configurado:
`+51 945 623 290`

Se puede cambiar en `config.js`.

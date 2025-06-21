# Guía de Despliegue en Netlify

## Opción 1: Solo Frontend en Netlify (Recomendado)

### Paso 1: Desplegar el Backend

Antes de desplegar el frontend, necesitas desplegar tu backend en un servicio que soporte Node.js:

#### Opciones recomendadas:
- **Render** (Gratuito): https://render.com
- **Railway** (Gratuito): https://railway.app
- **Heroku** (Pago): https://heroku.com

#### Instrucciones para Render:
1. Ve a https://render.com y crea una cuenta
2. Conecta tu repositorio de GitHub
3. Crea un nuevo "Web Service"
4. Selecciona el directorio `backend/`
5. Configura:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment Variables**: Agrega las variables de tu `.env`

### Paso 2: Configurar Variables de Entorno

En tu backend desplegado, asegúrate de configurar estas variables de entorno:
```
JWT_SECRET=tu_secreto_jwt
DB_HOST=tu_host_mysql
DB_USER=tu_usuario_mysql
DB_PASSWORD=tu_password_mysql
DB_NAME=tu_base_de_datos
```

### Paso 3: Actualizar Configuración del Frontend

Una vez que tengas la URL de tu backend desplegado, actualiza el archivo `js/config.js`:

```javascript
// Cambia estas URLs por la de tu backend desplegado
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:3000/api' 
    : 'https://tu-backend-en-render.onrender.com/api';

const SOCKET_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'
    : 'https://tu-backend-en-render.onrender.com';
```

### Paso 4: Desplegar en Netlify

1. Ve a https://netlify.com y crea una cuenta
2. Conecta tu repositorio de GitHub
3. Configura el despliegue:
   - **Build command**: (dejar vacío)
   - **Publish directory**: `.` (directorio raíz)
4. Haz clic en "Deploy site"

### Paso 5: Configurar Dominio Personalizado (Opcional)

En Netlify, puedes configurar un dominio personalizado en:
Settings > Domain management > Custom domains

## Opción 2: Backend y Frontend Juntos (Alternativa)

Si prefieres tener todo en un solo servicio, puedes usar **Render** o **Railway** para desplegar toda la aplicación:

1. Modifica el `package.json` principal para incluir el backend
2. Configura el build para copiar los archivos estáticos
3. Usa el mismo servicio para frontend y backend

## Solución de Problemas

### Error de CORS
Si ves errores de CORS, asegúrate de que tu backend tenga configurado:
```javascript
app.use(cors({
    origin: ['https://tu-sitio.netlify.app', 'http://localhost:3000']
}));
```

### Error de Socket.IO
Si el chat en tiempo real no funciona, verifica:
1. La URL del socket en `js/config.js`
2. Que el backend esté configurado para Socket.IO
3. Que no haya problemas de CORS con WebSockets

### Base de Datos
Asegúrate de que tu base de datos MySQL esté accesible desde internet o usa una base de datos en la nube como:
- **PlanetScale** (Gratuito)
- **Railway** (Gratuito)
- **AWS RDS** (Pago)

## Archivos Importantes

- `netlify.toml`: Configuración de Netlify
- `index.html`: Página de entrada que redirige a login
- `js/config.js`: Configuración de URLs de API y Socket.IO
- `backend/`: Directorio del servidor Node.js 
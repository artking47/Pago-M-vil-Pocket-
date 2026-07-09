# 💳 Pago Móvil VE - PWA

Una Progressive Web App (PWA) minimalista para gestionar y compartir datos de Pago Móvil de bancos venezolanos.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![Tailwind](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwind-css)

## ✨ Características

- 🎨 **Diseño Premium** - Interfaz moderna con efectos glassmorphism y gradientes suaves
- 💾 **Persistencia Local** - Almacenamiento seguro en LocalStorage del navegador
- 📋 **Copiar Datos** - Un click para copiar información formateada al portapapeles
- 📤 **Compartir Fácil** - Integración con Web Share API para WhatsApp/Telegram
- 🎨 **Colores por Banco** - Cada banco tiene su color característico
- 📱 **PWA** - Instalable en dispositivos móviles como app nativa
- ⚡ **Offline-First** - Funciona sin conexión gracias al Service Worker

## 🏦 Bancos Soportados

- Mercantil 🟡
- Provincial 🔵🔴
- Banesco 🟠
- Venezuela 🔴
- BOD 🔵
- Banco del Tesoro 🟢
- Bicentenario 🔵
- Bancaribe 🔵

## 🚀 Instalación

### Opción 1: Con Node.js/npm

```bash
# Clonar o navegar al directorio
cd pago-movil-pwa

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# La app estará disponible en http://localhost:5173
```

### Opción 2: Sin Node.js (Servidor HTTP simple)

Si no tienes Node.js instalado, puedes usar cualquier servidor HTTP:

**Con Python 3:**
```bash
# Abrir los archivos directamente con un servidor
python -m http.server 8000
```

**Con PHP:**
```bash
php -S localhost:8000
```

Luego abre `http://localhost:8000` en tu navegador.

## 📱 Instalar como PWA

### En Android (Chrome):

1. Abre la app en Chrome
2. Toca el menú (⋮) > "Añadir a pantalla de inicio"
3. Confirma la instalación
4. ¡Listo! Ahora tienes un ícono en tu pantalla

### En iOS (Safari):

1. Abre la app en Safari
2. Toca el botón de compartir (cuadrado con flecha)
3. Selecciona "Añadir a pantalla de inicio"
4. Confirma y listo

### En Desktop (Chrome/Edge):

1. Abre la app en Chrome o Edge
2. Busca el ícono de instalación en la barra de direcciones
3. Click en "Instalar"

## 🎯 Uso

### Agregar una Cuenta

1. Click en el botón flotante "+" en la esquina inferior derecha
2. Selecciona el banco
3. Ingresa tu cédula (formato: V-12345678)
4. Ingresa tu teléfono (formato: 0414-1234567)
5. Click en "Guardar"

### Copiar Datos

- Click en el botón "Copiar" de cualquier tarjeta
- Los datos se copian con formato: `Mis datos de Pago Móvil: [Banco] - [Teléfono] - [CI]`
- ¡Pega donde necesites!

### Compartir

- Click en el botón "Compartir"
- Se abrirá el menú nativo de compartir de tu dispositivo
- Selecciona WhatsApp, Telegram o cualquier app
- Envía a quien quieras

### Eliminar una Cuenta

- Click en el ícono "×" en la esquina superior derecha de la tarjeta
- Confirma la eliminación

## 🛠️ Tecnologías

- **React 18** - Framework UI
- **Vite** - Build tool ultrarrápido
- **Tailwind CSS** - Framework de estilos utility-first
- **LocalStorage API** - Persistencia de datos
- **Clipboard API** - Copiar al portapapeles
- **Web Share API** - Compartir nativo
- **Service Worker** - Funcionamiento offline

## 📂 Estructura del Proyecto

```
pago-movil-pwa/
├── public/
│   ├── manifest.json          # Configuración PWA
│   ├── sw.js                  # Service Worker
│   ├── icon-192.svg           # Icono PWA 192x192
│   └── icon-512.svg           # Icono PWA 512x512
├── src/
│   ├── components/
│   │   ├── BankCard.jsx       # Tarjeta de banco
│   │   ├── AddBankForm.jsx    # Formulario agregar
│   │   └── Dashboard.jsx      # Dashboard principal
│   ├── utils/
│   │   └── storage.js         # Funciones LocalStorage
│   ├── App.jsx                # Componente raíz
│   ├── main.jsx               # Entry point
│   └── index.css              # Estilos globales
├── index.html                 # HTML principal
├── package.json               # Dependencias
├── tailwind.config.js         # Config Tailwind
├── vite.config.js             # Config Vite
└── README.md                  # Este archivo
```

## 🔧 Scripts Disponibles

```bash
# Desarrollo
npm run dev

# Build para producción
npm run build

# Preview del build
npm run preview
```

## 🌐 Deploy

### Netlify / Vercel

1. Conecta tu repositorio
2. Build command: `npm run build`
3. Publish directory: `dist`

### GitHub Pages

```bash
npm run build
# Subir la carpeta 'dist' a GitHub Pages
```

## 🔒 Privacidad

- ✅ Todos los datos se guardan **localmente** en tu navegador
- ✅ **Sin servidor** - no se envía información a internet
- ✅ **Sin tracking** - cero analíticas
- ✅ **100% privado** - tú tienes el control

## 🎨 Personalización

### Agregar un Nuevo Banco

Edita `src/utils/storage.js`:

```javascript
export const BANK_COLORS = {
  // ... bancos existentes
  'Mi Banco': { 
    primary: '#FF5733', 
    gradient: 'from-red-500 to-orange-600' 
  },
};
```

### Cambiar el Tema

Modifica los colores en `tailwind.config.js` y `src/index.css`.

## 📝 Notas Importantes

- **Formato de Cédula**: Acepta V, E, J, P, G seguido de guión y 6-9 dígitos
- **Formato de Teléfono**: Acepta códigos 0412, 0414, 0424, 0416, 0426 + 7 dígitos
- **Web Share API**: Solo funciona en HTTPS y dispositivos compatibles
- **Clipboard API**: Requiere HTTPS en producción

## 🐛 Solución de Problemas

**La PWA no se instala:**
- Verifica que estés usando HTTPS (en producción)
- Asegúrate de que el manifest.json esté accesible

**No funciona el botón Compartir:**
- Tu navegador puede no soportar Web Share API
- Se usará automáticamente "Copiar" como fallback

**Los datos no persisten:**
- Verifica que el navegador permita LocalStorage
- No uses modo incógnito

## 📄 Licencia

Este proyecto es de código abierto y está disponible para uso personal o comercial.

## 👨‍💻 Autor

Creado con ❤️ para facilitar el día a día con Pago Móvil en Venezuela.

---

**¿Encontraste útil esta app? ¡Compártela con tus amigos! 🚀**

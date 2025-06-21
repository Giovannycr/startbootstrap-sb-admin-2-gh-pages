// Configuración de la API
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:3000/api' 
    : 'https://tu-backend-url.herokuapp.com/api'; // Cambia esto por la URL de tu backend desplegado

// Configuración de Socket.IO
const SOCKET_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'
    : 'https://tu-backend-url.herokuapp.com'; // Cambia esto por la URL de tu backend desplegado 
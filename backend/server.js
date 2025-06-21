require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const authRoutes = require('./routes/auth');
const messageRoutes = require('./routes/messages');
const friendRoutes = require('./routes/friends');
const groupRoutes = require('./routes/groups');
const profileRoutes = require('./routes/profile');
const { verifyToken } = require('./middleware/auth');

const app = express();
const server = http.createServer(app);

// Lista de orígenes permitidos
const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:5500', // Para Live Server de VSCode
    'https://chatonline123.netlify.app' // Tu frontend en Netlify
];

const io = socketIo(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"]
    }
});

// Middleware
const corsOptions = {
    origin: (origin, callback) => {
        // Permitir peticiones sin 'origin' (como apps móviles o Postman)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'La política de CORS para este sitio no permite el acceso desde el origen especificado.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    }
};
app.use(cors(corsOptions));
app.use(express.json());

// Pasar la instancia de Socket.IO a las rutas
app.set('socketio', io);

// Servir archivos estáticos desde el directorio padre
app.use(express.static(path.join(__dirname, '..')));

// Crear directorio de uploads si no existe
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Servir archivos de uploads
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/messages', verifyToken, messageRoutes);
app.use('/api/friends', verifyToken, friendRoutes);
app.use('/api/groups', verifyToken, groupRoutes);
app.use('/api/profile', verifyToken, profileRoutes);

// Rutas para el frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'login.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'register.html'));
});

app.get('/chat', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'chat.html'));
});

app.get('/friends', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'friends.html'));
});

app.get('/groups', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'groups.html'));
});

app.get('/profile', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'profile.html'));
});

// Manejo de conexiones Socket.IO
const connectedUsers = new Map();

io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        return next(new Error('Authentication error: Token not provided'));
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.userId;
        next();
    } catch (error) {
        return next(new Error('Authentication error: Invalid token'));
    }
});

io.on('connection', (socket) => {
    console.log('Usuario conectado:', socket.id, 'con ID de usuario:', socket.userId);

    // Unir al usuario a su propia "sala" para notificaciones directas
    socket.join(`user_${socket.userId}`);
    connectedUsers.set(socket.id, socket.userId);

    // Autenticar usuario (deprecated, se maneja en el middleware)
    socket.on('authenticate', (data) => {
        // ...
    });

    // Manejar mensajes privados
    socket.on('privateMessage', async (data) => {
        try {
            const { recipientId, message } = data;
            const senderId = connectedUsers.get(socket.id);
            
            // Guardar mensaje en la base de datos
            const savedMessage = await savePrivateMessage(senderId, recipientId, message);
            
            // Enviar mensaje al destinatario
            io.to(`user_${recipientId}`).emit('message', {
                id: savedMessage.id,
                from: senderId,
                to: recipientId,
                content: message,
                timestamp: new Date()
            });
        } catch (error) {
            console.error('Error al enviar mensaje privado:', error);
        }
    });

    // Manejar mensajes de grupo
    socket.on('groupMessage', async (data) => {
        try {
            const { groupId, message } = data;
            const senderId = connectedUsers.get(socket.id);
            
            // Guardar mensaje en la base de datos
            const savedMessage = await saveGroupMessage(senderId, groupId, message);
            
            // Enviar mensaje a todos los miembros del grupo
            io.to(`group_${groupId}`).emit('message', {
                id: savedMessage.id,
                from: senderId,
                groupId: groupId,
                content: message,
                timestamp: new Date()
            });
        } catch (error) {
            console.error('Error al enviar mensaje de grupo:', error);
        }
    });

    // Manejar unión a grupos
    socket.on('joinGroup', (groupId) => {
        socket.join(`group_${groupId}`);
        console.log(`Usuario ${connectedUsers.get(socket.id)} se unió al grupo ${groupId}`);
    });

    // Manejar desconexión
    socket.on('disconnect', () => {
        const userId = connectedUsers.get(socket.id);
        if (userId) {
            io.emit('userDisconnected', userId);
            connectedUsers.delete(socket.id);
        }
        console.log('Usuario desconectado:', socket.id);
    });
});

// Funciones auxiliares para guardar mensajes
async function savePrivateMessage(senderId, recipientId, content) {
    // Esta función debería guardar el mensaje en la base de datos
    // Por ahora retornamos un objeto simulado
    return {
        id: Date.now(),
        senderId,
        recipientId,
        content,
        timestamp: new Date()
    };
}

async function saveGroupMessage(senderId, groupId, content) {
    // Esta función debería guardar el mensaje en la base de datos
    // Por ahora retornamos un objeto simulado
    return {
        id: Date.now(),
        senderId,
        groupId,
        content,
        timestamp: new Date()
    };
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
    console.log(`Frontend disponible en: http://localhost:${PORT}`);
}); 
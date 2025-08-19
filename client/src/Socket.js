import { io } from 'socket.io-client';

export const initSocket = async () => {
    const options = {
        'force new connection': true,
        reconnectionAttempts: Infinity, // Changed from string to number
        timeout: 10000,
        transports: ['websocket'],
    };

    const backendURL =
        process.env.REACT_APP_BACKEND_URL ||
        (process.env.NODE_ENV === 'production'
            ? 'https://codesync-hmt6.onrender.com'
            : 'http://localhost:5000');

    return io(backendURL, options);
};

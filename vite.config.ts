import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type PluginOption } from 'vite';
import { Server } from 'socket.io'

const webSocketServer: PluginOption = {
	name: 'webSocketServer',
	configureServer(server) {
		if (!server.httpServer) {
			throw new Error('WebSocket server requires an HTTP server');
		}
		const io = new Server(server.httpServer)

		io.on('connection', (socket) => {
			const username = `User ${Math.round(Math.random() * 999_999)}`
			socket.emit('name', username)

			socket.on('message', (message) => {
				console.log(`Message from ${username}: ${message}`)
				socket.emit('message', {
					from: username,
					message: message,
					time: new Date().toLocaleString(),
				})
			})
		})
		console.log('SocketIO injected');
	}
}

export default defineConfig({
	plugins: [sveltekit(), webSocketServer]
});
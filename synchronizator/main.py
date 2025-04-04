import os
import tornado.ioloop
import tornado.web
import socketio

PORT = int(os.environ.get('TORNADO_PORT', 8888))

class IndexHandler(tornado.web.RequestHandler):
    """Basic health check endpoint."""
    def get(self):
        self.set_status(200)
        self.write("OK")

class DevHandler(tornado.web.RequestHandler):
    """Handler for dev.html"""
    def get(self):
        with open(os.path.join(os.path.dirname(__file__), 'dev.html'), 'r') as f:
            self.write(f.read())


sio = socketio.AsyncServer(
    async_mode='tornado',
    cors_allowed_origins="*",
    logger=True,
    engineio_logger=True
)

app = tornado.web.Application([
    (r'/', IndexHandler),
    (r'/socket.io/', socketio.get_tornado_handler(sio)),
    (r'/subscriber', DevHandler),
])


@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")

@sio.event
async def update_data(sid, data):
    print(f"Received data from {sid}: {data}")
    await sio.emit('data_update', data)

if __name__ == "__main__":
    app.listen(PORT)
    print(f"Tornado server started on http://127.0.0.1:{PORT}/")
    tornado.ioloop.IOLoop.current().start()

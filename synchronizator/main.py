import os
import tornado.ioloop
import tornado.web
import socketio
from typing import List, Optional

PORT = int(os.environ.get('TORNADO_PORT', 8888))

subscribers: List[str] = []  # List of subscriber socket IDs
controllers: List[str] = []  # List of controller socket IDs
current_controller: Optional[str] = None  # Currently active controller

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
    logger=False,
    engineio_logger=False
)

app = tornado.web.Application([
    (r'/', IndexHandler),
    (r'/socket.io/', socketio.get_tornado_handler(sio)),
    (r'/dev', DevHandler), # TODO: Remove this before deploying
])


@sio.event
async def connect(sid, environ):
    print(f"✅ client connected: {sid}")
    subscribers.append(sid)
    await sio.emit('role_assigned', {'role': 'subscriber'}, room=sid)


@sio.event
async def disconnect(sid):
    print(f"❌ client disconnected: {sid}")
    global subscribers, controllers, current_controller
    if sid in subscribers:
        subscribers.remove(sid)
    if sid in controllers:
        controllers.remove(sid)

    if sid != current_controller:
        return
    
    current_controller = None
    if controllers:
        current_controller = controllers[0]
        await sio.emit('controller_assigned', {'controller_id': current_controller})

@sio.event
async def request_controller_role(sid):
    """Event handler for clients requesting controller role. Only one controller is allowed.
    TODO: Implement a queue of waiting subscribers for the controller role.
    """
    global current_controller, controllers, subscribers
    if current_controller is not None:
        print(f"🚫 controller role already assigned: {current_controller}")
        await sio.emit('error', {'message': 'Controller role already assigned'}, room=sid)
        return

    print(f"👑 controller role assigned to: {sid}")
    if sid in subscribers:
        subscribers.remove(sid)

    controllers.append(sid)
    current_controller = sid
    await sio.emit('role_assigned', {'role': 'controller'}, room=sid)
    await sio.emit('controller_assigned', {'controller_id': sid})
        

@sio.event
async def update_data(sid, data):
    """Event handler for data updates - only controllers can send data"""
    global current_controller
    if sid != current_controller:
        print(f"🚫 data update rejected from non-controller {sid}")
        await sio.emit('error', {'message': 'Only controller can send data'}, room=sid)
        return

    print(f"🔄 received data from controller {sid}: {data}")
    await sio.emit('data_update', data, room=subscribers)

if __name__ == "__main__":
    app.listen(PORT)
    print(f"Tornado server started on http://127.0.0.1:{PORT}/")
    tornado.ioloop.IOLoop.current().start()

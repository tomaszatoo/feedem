import os
import tornado.ioloop
import tornado.web
import socketio
from typing import List, Any

PORT = int(os.environ.get('TORNADO_PORT', 8888))
DEBUG = os.environ.get('DEBUG', 'false').lower() == 'true'
PRODUCTION = os.environ.get('PRODUCTION', 'false').lower() == 'true'

subscribers: List[str] = []
"""List of SIDs of all connected clients which are just watching."""
controllers: List[str] = []
"""List of SIDs of all connected clients which want to send the data. Only the the first one can!"""
game: dict[str, Any] = {}
"""Game state."""


class IndexHandler(tornado.web.RequestHandler):
    """Basic health check endpoint."""
    def get(self):
        self.set_status(200)
        self.write("OK")

class DevHandler(tornado.web.RequestHandler):
    """Handler for dev.html which contains a simple UI for development purposes.
    Should be removed before deploying.
    """
    def get(self):
        with open(os.path.join(os.path.dirname(__file__), 'dev.html'), 'r') as f:
            self.write(f.read())

# SocketIO server instance
sio = socketio.AsyncServer(
    async_mode='tornado',
    cors_allowed_origins="*",
    logger=DEBUG,
    engineio_logger=DEBUG
)

routes = [
    (r'/', IndexHandler),
    (r'/socket.io/', socketio.get_tornado_handler(sio)),
]
if not PRODUCTION:
    routes.append((r'/dev', DevHandler))
app = tornado.web.Application(routes) # type: ignore


@sio.event
async def connect(sid, environ):
    global game
    print(f"✅ client connected: {sid}")
    subscribers.append(sid)
    if len(controllers) > 0:
        controller = controllers[0]
    else:
        controller = ""
    
    await sio.emit('controller', {'controller_id': controller}, room=sid)
    await sio.emit('game', game, room=sid)


@sio.event
async def disconnect(sid):
    global subscribers, controllers
    if sid in subscribers:
        print(f"❌ subscriber removed: {sid}")
        subscribers.remove(sid)
        
    if sid not in controllers:
        return
    
    if sid in controllers[1:]:
        print(f"❌ waiting controller removed: {sid}")
        controllers.remove(sid)
        
    if sid == controllers[0]:
        print(f"👑 main controller removed: {sid}")
        controllers.remove(sid)
        if len(controllers) > 0: # Immediately assign NEW MAIN CONTROLLER
            await sio.emit('controller', {'controller_id': controllers[0]})

    # Emit warning to those who are waiting for the controller role
    for i, controller in enumerate(controllers):
        if i == 0:
            continue
        await sio.emit('warning', {'message': f'Waiting for controller role, {i} in front of you'}, room=controller)


@sio.event
async def request_controller_role(sid):
    """Event handler for clients requesting controller role. Only one controller is allowed.
    TODO: Implement a queue of waiting subscribers for the controller role.
    """
    global controllers, subscribers
    # NOT EXPECTED
    if sid in controllers:
        print(f"🚫 already in controller queue with id {sid}")
        await sio.emit('error', {'message': 'Already in controller queue'}, room=sid)
        return

    # NEW KING OF THE HILL
    if len(controllers) == 0:
        print(f"👑 controller role assigned to: {sid}")
        if sid in subscribers:
            subscribers.remove(sid)
        controllers.append(sid)
        await sio.emit('controller', {'controller_id': sid})
        return

    # ADD TO QUEUE - is not present, is not the first so we add to the end
    print(f"⏳ adding {sid} to controllers queue")
    controllers.append(sid)
    position = len(controllers) - 1
    await sio.emit('warning', {'message': f'Waiting for controller role, {position} in front of you'}, room=sid)


@sio.event
async def update_data(sid, data):
    """Event handler for data updates - only controllers can send data"""
    global controllers

    # NOT EXPECTED
    if sid != controllers[0]:
        print(f"🚫 data update rejected from non-controller {sid}")
        await sio.emit('error', {'message': 'Only first controller can send data!'}, room=sid)
        return

    # DISTRIBUTE DATA
    print(f"🔄 received data from controller {sid}: {data}")
    lookers = subscribers + controllers[1:]
    await sio.emit('data_update', data, room=lookers)


if __name__ == "__main__":
    app.listen(PORT)
    print(f"🚀 Tornado server started on http://127.0.0.1:{PORT}/")
    tornado.ioloop.IOLoop.current().start()

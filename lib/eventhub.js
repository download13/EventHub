var PACK = JSON.stringify;
var UNPACK = JSON.parse;
var slice = Array.prototype.slice;

function EventHub() {
	this._handlers = {};
}
EventHub.prototype = {
	emit: function(type) {
		var ht = this._handlers[type];
		if(ht == null) return;
		
		var packed = PACK(slice.call(arguments, 0));
		for(var i = 0, l = ht.length; i < l; i++) {
			var ws = ht[i]; // Get the socket
			ws.send(packed); 
		}
	},
	// Add new connection
	connect: function(ws) {
		var self = this;
		ws.on('message', function(message) {
			try { // Make sure we're getting good data
				message = UNPACK(message);
				message = [ws].concat(message);
			} catch(e) {
				return;
			}
			self._onmessage.apply(self, message);
		});
		ws.on('close', function() {
			var handlers = this._handlers;
			
			// TODO When they are available in Node, use WeakMaps to make this more efficient
			// Also use Sets instead of arrays
			for(var type in handlers) { // Go through each type of handlers
				var ht = handlers[type];
				var pos = ht.indexOf(ws);
				if(pos != -1) { // See if the socket is in this handler set
					ht.splice(pos, 1); // If so, remove it
				}
			}
		});
	},
	_onmessage: function(ws, whatdo) {
		var handlers = this._handlers;
		var types = slice.call(arguments, 2); // Allow bulk subscribes and unsubscribes
		
		if(whatdo == 1) { // Subscribe
			for(var i = 0; i < types.length; i++) {
				var type = types[i];
				var ht = handlers[type];
				if(ht == null) {
					handlers[type] = ht = [];
				}
				
				var pos = ht.indexOf(ws); // Check if this handler is already subscribed
				if(pos != -1) return; // If so, don't add it again
				
				ht.push(ws);
				
				if(ht.length == 1) { // This is the first client added for this type
					this.onAdd && this.onAdd(type); // Tell the onAdd function about it
				}
			}
		} else { // Unsubscribe
			for(var i = 0; i < types.length; i++) {
				var type = types[i];
				var ht = handlers[type];
				if(ht == null) return;
				
				var pos = ht.indexOf(ws);
				if(pos == -1) return;
				ht.splice(pos, 1);
				
				if(ht.length == 0) { // No longer any clients for this type
					this.onRemove && this.onRemove(type); // Tell the onRemove function about it
				}
			}
		}
	}
};
(function(global) {
	var slice = Array.prototype.slice;
	var PACK = JSON.stringify;
	var UNPACK = JSON.parse;
	
	// TODO Add a re-sub feature to allow re-subscribing to all subbed channels in the event of a reconnection
	function EventHub(socket) {
		socket.onmessage = this._onmessage.bind(this);
		this._socket = socket;
		this._handlers = {};
	}
	EventHub.prototype = {
		_onmessage: function(message) {
			message = UNPACK(message);
			this.emit.apply(this, message);
		},
		
		on: function(type, listener) {
			var handlers = this._handlers;
			var ht = handlers[type];
			if(!ht) {
				handlers[type] = ht = [];
			}
			
			ht.push(listener);
			
			if(ht.length == 1) { // First one added
				// Alert the server
				this._socket.send(PACK([1, type])); // Subscribe to `type`
			}
		},
		emit: function(type) {
			var args = slice.call(arguments, 0);
			this.eventHook && this.eventHook.apply(null, args);
			args.shift();
			
			if(!this._handlers[type]) this._handlers[type] = [];
			
			var ht = this._handlers[type];
			if(ht == null) return;
			for(var i = 0; i < ht.length; i++) {
				ht[i].apply(this, args);
			}
		},
		removeListener: function(type, listener) {
			if(this._handlers[type] == null) return;
			
			var ht = this._handlers[type];
			var pos = ht.indexOf(listener);
			if(pos == -1) return;
			ht.splice(pos, 1);
			
			if(ht.length == 0) { // Removed the last listener
				this._socket.send(PACK([0, type])); // Unsubscribe from `type`
			}
		},
		
		refreshSubs: function() {
			
		}
	};
	
	global.EventHub = EventHub;
})(this);
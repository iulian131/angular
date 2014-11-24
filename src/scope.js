var Scope = function(){
	this.$$watchers = [];
	this.$$maxDigestLoops = 10;
	this.$$lastDirtyWatch = null;
	this.$$asyncQueue = [];
	this.$$applyAsyncQueue = [];
	this.$$applyAsyncId = null;
	this.$$postDigestQueue = [];
	this.$$phase = null;
};

Scope.prototype.$beginPhase = function(phase) {
	if(this.$$phase) {
		throw this.$$phase + " already in progress!";
	}
	this.$$phase = phase;
};

Scope.prototype.$clearPhase = function() {
	this.$$phase = null;
};

Scope.prototype.$watch = function(watchFn, listenerFn, valueEq) {
	//Urmareste o functie
	var self = this;
	this.$$lastDirtyWatch = null;
	var watcher = {
		watchFn: watchFn,
		listenerFn: listenerFn || function() {},
		oldValue: undefined,
		valueEq: !!valueEq
	};
	
	self.$$watchers.push(watcher);
	
	return function(){
		index = self.$$watchers.indexOf(watcher);
		if(index >= 0){
			self.$$watchers.splice(index, 1);
		}
		this.$$lastDirtyWatch = null;
	};
};

Scope.prototype.$$areEqual = function(newVal, oldVal, valueEq) {
	if(valueEq) {
		return _.isEqual(newVal, oldVal);
	}else{
		return newVal === oldVal || (newVal !== newVal && oldVal !== oldVal);
	}
};

Scope.prototype.$$digestOnce = function() {
	//Apeleaza fiecare functie urmarita pentru a afla valorile schimbate
	var scope = this;
	var dirty = false;
	this.$$watchers.forEach(function(watcher) {
		try {
			var newValue = watcher.watchFn(scope);
			var oldValue = watcher.oldValue;
			var valueEq = watcher.valueEq;
			
			if(!scope.$$areEqual(newValue, oldValue, valueEq)) {//Daca s-a schimbat valoarea
				watcher.listenerFn(newValue, oldValue, scope);//Apeleaza callback-ul
				watcher.oldValue = (valueEq ? _.cloneDeep(newValue) : newValue);//Daca se face cautarea intr-un Object, se cloneaza obiectul.
				dirty = true;//S-a gasit o functie cu valoare schimbata
				scope.$$lastDirtyWatch = watcher;//Cache the last watcher
			}else if(scope.$$lastDirtyWatch === watcher) {
				return false;
			}
		}catch(e){
			console.log(e);
		}
	});
	
	return dirty;
};

Scope.prototype.$digest = function() {
	//Apeleaza toate callback-urile functiilor cu valori schimbate
	var dirty;
	var numberOfDigests=0;//Numarul de verificari integrale a functiilor urmarite
	this.$$lastDirtyWatch = null;
	this.$beginPhase("$digest");
	
	if(this.$$applyAsyncId) {
		clearTimeout(this.$$applyAsyncId);
		this.$$flushApplyAsync();
	}
	
	do {
		while(this.$$asyncQueue.length) {
			var evalAsync = this.$$asyncQueue.shift();
			try{
				evalAsync.fn(evalAsync.scope, evalAsync.args);
			}catch(e){
				console.log(e);
			}
		}
		numberOfDigests++;
		dirty = this.$$digestOnce();
		
		if(numberOfDigests === this.$$maxDigestLoops) {
			throw this.$$maxDigestLoops + " digest iterations reached!";
		}
		
	}while(dirty === true);
	
	while(this.$$postDigestQueue.length) {
		var postDigest = this.$$postDigestQueue.shift();
		try{
			postDigest.fn(postDigest.scope, postDigest.args);
		}catch(e){
			console.log(e);
		}
	}
	
	this.$clearPhase();
};

Scope.prototype.$$postDigest = function(fn, args) {
	this.$$postDigestQueue.push({
		fn: fn,
		scope: this,
		args: args
	});
};

Scope.prototype.$eval = function(fn, args) {
	if(typeof fn === 'function') {
		fn(this, args);
	}
};

Scope.prototype.$evalAsync = function(fn, args) {
	self = this;
	if(!self.$$phase && !self.$$asyncQueue.length) {
		setTimeout(function() {
			if (self.$$asyncQueue.length){
				self.$digest();
			}
		},0);
	}
	this.$$asyncQueue.push({
		fn: fn, 
		scope: this, 
		args: args
	});
};

Scope.prototype.$apply = function(fn, args) {
	try {
		this.$beginPhase("$apply");
		return this.$eval(fn, args);
	}finally{
		this.$clearPhase();
		this.$digest();
	}
};

Scope.prototype.$$flushApplyAsync = function() {
	while(this.$$applyAsyncQueue.length) {
		this.$$applyAsyncQueue.shift()();
	}
	this.$$applyAsyncId = null;
};

Scope.prototype.$applyAsync = function(fn, args) {
	var self = this;
	self.$$applyAsyncQueue.push(function() {
		self.$eval(fn, args);
	});
	if(self.$$applyAsyncId === null) {
		self.$$applyAsyncId = setTimeout(function() {
			self.$apply(_.bind(self.$$flushApplyAsync, self));
		},0);
	}
};
r = (Math.pow(5, 1/2) +1)/2;
var clipping = [[-canvas.width,-canvas.height], [2*canvas.width,-canvas.height], [2*canvas.width,2*canvas.height], [-canvas.width,2*canvas.height]];
var maxRotation = 1/10;

var X = 0;
var Y = 1;
var LEN = 0;
var ANGLE = 1;
var VERTICES = 0;
var VECTOR = 1;
var STROKE = 0;
var FILL = 1;
var SHAPE = 0;
var VERTEX = 1

var generateColor = function(){
	return tinycolor({s: 0.6, v: 0.64, h: parseInt(Math.random()*360)});
}

var generateScheme = function(c){
	if(!c) c = generateColor();
	else c = tinycolor(c);
	var hsv = c.toHsv();
	var c1 = tinycolor({h: hsv.h, s: hsv.s, v:(hsv.v-0.5) });
	var c2 = tinycolor({h: hsv.h, s: hsv.s, v:(hsv.v-0.1) });
	return [c.toHexString(), c1.toHexString(), c1.toHexString()];
}

var generateColors = function(shapes, colors){
	var ret = [];
	for(var i=0;i<shapes; i++){
		var color = colors ? colors[i] : undefined;
		ret = ret.concat(generateScheme(color).slice(0,3));
	}
	return ret;
}

var incrementHue = function(color, step){
	var c = tinycolor(color);
	var hsv = c.toHsv(); 
	var c1 = tinycolor({h: (hsv.h + step) % 360, s: hsv.s, v:hsv.v });
	return c1.toHexString()
}

var rotate = function(v, angle, center, inplace){
	var v1 = v.slice();
	if(center) v1 = diff(v1, center)
	var angle = angle * Math.PI;
	var x2 = v1[X] * Math.cos(angle) - v1[Y] * Math.sin(angle);
	var y2 = v1[X] * Math.sin(angle) + v1[Y] * Math.cos(angle);
	v1 = [x2,y2];
	if(center) v1 = sum(v1, center);
	if(!inplace) return v1;
	else {
		v[X] = v1[X];
		v[Y] = v1[Y];
	}
}

var scaleShape = function(shape, factor){
	var shape1 = shape.slice();
	for(var i=0; i<shape1.length; i++){
		var shape2 = shape1[i].slice();
		shape2[LEN] = shape2[LEN]*factor;
		shape1[i] = shape2;
	}
	return shape1;
}

var mult = function(v, s){
	var v1 = v.slice();
	v1[X] = v1[X] * s;
	v1[Y] = v1[Y] * s;
	return v1;
}

var invert = function(v){
	v[X] = v[X] * -1;
	v[Y] = v[Y] * -1;
}

var sum = function(v1, v2){
	var ret = v1.slice();
	for(var i=0;i<v1.length;i++) ret[i] = v1[i] + v2[i];
	return ret;
}

var diff = function(v1, v2){
	var v3 = v2.slice();
	v3 = mult(v3, -1);
	return sum(v1,v3);
}

var norm = function(v){
	var sum = 0;
	for(var i=0;i<v.length;i++) sum += Math.pow(v[i],2);
	return Math.sqrt(sum);
}

var versor = function(v){
	
	var n1 = norm(v);
	var v1 = v.slice();
	for(var i=0;i<v1.length;i++) v1[i] = v1[i] / n1;
	return v1;
}

var createShape = function(conf, pos, type, scale, init, v, direction){
	var shape = scaleShape(conf.shapes[type], scale);
	if(init === undefined) init = 0;
	if(v === undefined) v = [1, 0];
	if(direction === undefined) direction = 1;

	var i = init;
	var vertices = [[pos[X], pos[Y]]];
	while(true){
		var edge = shape[i];
		var x1 = Math.round(pos[X] + v[X] * edge[LEN]);
		var y1 = Math.round(pos[Y] + v[Y] * edge[LEN]);
		
		vertices.push([x1,y1]);	
		pos[X] = x1;
		pos[Y] = y1;

		if(direction>0) rotate(v, edge[ANGLE] * direction, undefined, true);
		i = (i+direction) % shape.length;
		if(i<0) i+=shape.length;
		if(direction<0) rotate(v, shape[i][ANGLE] * direction, undefined, true);
		if(i==init) break;
	}

	var s1 = new Shape(type, vertices, conf);
	return s1;
};

var drawShape = function(context, vertices, init, direction){
	if(init === undefined) init = 0;
	if(direction === undefined) direction = 1;

	var i = init;
	//context.moveTo(Math.round(vertices[i][X]),Math.round(vertices[i][Y]));
	context.moveTo(vertices[i][X],vertices[i][Y]);
	context.beginPath();
	while(true){
		i = (i+direction) % vertices.length;
		if(i<0) i+=vertices.length;
		if(i==init) break;
		//context.lineTo(Math.round(vertices[i][X]),Math.round(vertices[i][Y]));
		context.lineTo(vertices[i][X],vertices[i][Y]);
	}
	//context.lineTo(Math.round(vertices[i][X]),Math.round(vertices[i][Y]));
	context.lineTo(vertices[i][X],vertices[i][Y]);
	context.closePath();
};

var drawContour = function(context, vertices, contourType, color, clip){
	
	for(var i=0;i<vertices.length;i++){
		context.beginPath();
		if(contourType[i]){
			context.lineWidth = 0.4;
			context.strokeStyle = "black";
		} else {
			context.lineWidth = 1;		
			context.strokeStyle = color;
		}
		var vertex = vertices[i];
		var next = vertices[(i+1) % vertices.length];
		var vs1 = [[vertex, next]];
		if(clip) var vs1 = intersection([vertex,next], clipping);
		if(vs1 && vs1.length>0){
			vs1 = vs1[0];
			context.moveTo(vs1[0][X],vs1[0][Y]);
			context.lineTo(vs1[1][X],vs1[1][Y]);
			context.closePath();
			context.stroke();
		}
	}

}


var fillShape = function(context, params){
	context.fillStyle = params;
	context.fill();
}

var intersection = function(shape, clip){
	return greinerHormann.intersection(shape, clip);
}

var PenroseRombs = function(){

	this.shapes = [ 
	  [[1, 3/5], [r, 4/5], [r, 3/5]],
	  [[1, 4/5], [r / (r+1), 2/5], [r / (r+1), 4/5]]
        ];

	this.contours = [
		[0,1,1],
		[0,1,1]
	];

	this.initial_subdivisions = 7;
	this.next_subdivisions = 5;

	this.shape_params = generateColors(this.shapes.length);

	this.createFirstShape = function(canvas){
		var width = canvas.width;
		var height = canvas.height;
		var hypotenuse = width*r;
		var heightTriangle = hypotenuse * Math.sin(2*Math.PI/5);
		var widthTriangle = (height + heightTriangle) / heightTriangle * width;
		var halfWidth = (widthTriangle - width) / 2;
		var s1 = createShape(this, [-halfWidth,0], 0, widthTriangle, 0, [1, 0]);
		return s1;
	}

	this.subdivide = function(s){

		var ret = [];
		
		if(s.type == 0){
			var v1 = diff(s.vertices[2], s.vertices[1]);
			v1 = mult(v1, 1/(r+1));

			var p1 = sum(s.vertices[1], v1);

			var s1 = new Shape(0, [s.vertices[1], p1, s.vertices[0] ], s.conf, 0);
			ret.push(s1);

			var s1 = new Shape(1, [s.vertices[2], s.vertices[0], p1 ], s.conf, 3);
			ret.push(s1);

		} else if(s.type == 1){

			var v1 = diff(s.vertices[1], s.vertices[0]);
			var v2 = diff(s.vertices[2], s.vertices[1]);
			v1 = mult(v1, 1/(r+1));
			v2 = mult(v2, r/(r+1));
			
			var p1 = sum(s.vertices[0], v1);
			var p2 = sum(s.vertices[1], v2);

			var s1 = new Shape(1, [s.vertices[1], p1, p2 ], s.conf, 3);
			ret.push(s1);

			var s1 = new Shape(0, [s.vertices[2], p2, p1 ], s.conf, 0);
			ret.push(s1);			

			var s1 = new Shape(1, [s.vertices[2], s.vertices[0], p1 ], s.conf, 3);
			ret.push(s1);			


		}
	
		return ret;	
		
	};


	this.clone = function(){
		return new this.constructor(); 
	}
}

var PenroseKitesAndDarts = function(colors){

	this.shapes = [ 
	  [[1, 4/5], [1/r, 2/5], [1/r, 4/5]],
	  [[1, 4/5], [1/r, 3/5], [1, 3/5]]
        ];

	this.contours = [
		[1,1,0],
		[0,1,1]
	];


	this.initial_subdivisions = 7;
	this.next_subdivisions = 5;

	if(!colors) colors = generateColors(this.shapes.length);
	this.shape_params = colors;

	this.createFirstShape = function(canvas){
		var width = canvas.width;
		var height = canvas.height;
		var hypotenuse = width/r;
		var heightTriangle = hypotenuse * Math.sin(Math.PI/5);
		var widthTriangle = (height + heightTriangle) / heightTriangle * width;
		var halfWidth = (widthTriangle - width) / 2;
		var s1 = createShape(this, [-halfWidth,0], 0, widthTriangle, 0, [1, 0]);
		return s1;
	}

	this.subdivide = function(s){

		var ret = [];
		
		if(s.type == 0){

			var v1 = diff(s.vertices[1], s.vertices[0]);
			v1 = mult(v1, r/(r+1));

			var p1 = sum(s.vertices[0], v1);

			var s1 = new Shape(1, [s.vertices[0], s.vertices[2], p1 ], s.conf, 3);
			ret.push(s1);

			var s1 = new Shape(0, [s.vertices[1], s.vertices[2], p1 ], s.conf, 0);
			ret.push(s1);

		} else if(s.type == 1){	
	
			var v1 = diff(s.vertices[1], s.vertices[0]);
			var v2 = diff(s.vertices[2], s.vertices[0]);
			v1 = mult(v1, r/(r+1));
			v2 = mult(v2, 1/(r+1));

			var p1 = sum(s.vertices[0], v1);
			var p2 = sum(s.vertices[0], v2);

			var s1 = new Shape(0, [s.vertices[0], p1, p2 ], s.conf, 0);
			ret.push(s1);

			var s1 = new Shape(1, [s.vertices[2], p1, p2 ], s.conf, 3);
			ret.push(s1);

			var s1 = new Shape(1, [s.vertices[2], p1, s.vertices[1] ], s.conf,3);
			ret.push(s1);

		}
	
		return ret;	
		
	};

	this.clone = function(){
		return new this.constructor(this.colors); 
	}

}

var Shape = function(type, vertices, conf, drawType){

	this.vertices = vertices;
	this.type = type;
	this.conf = conf;
	if(drawType) this.drawType = drawType;
	else this.drawType = type;
	
	this.draw = function(context, clip){
		var dimensions = this.dimensions();
		if(dimensions[X] < 1 || dimensions[Y] < 1) return;

		if(clip) var vs1 = this.intersection(clipping);
		else var vs1 = [this.vertices];
		if(vs1 && vs1.length>0){
			var status1 = drawShape(context, vs1[0]);
			fillShape(context, this.conf.shape_params[this.drawType]);
		} else {
			this.remove=true;		
		}
		
	}

	this.drawContour = function(context, clip){
		drawContour(context, this.vertices, this.conf.contours[this.type], this.conf.shape_params[this.drawType], clip);
	}

	this.bounds = function(){
		if(this._bounds) return this._bounds;

		var min = [null,null];
		var max = [null,null];
		for(var i=0;i<this.vertices.length;i++){
			var vertex = this.vertices[i];
			if(min[X] === null || min[X] > vertex[X]) min[X] = vertex[X];
			if(min[Y] === null || min[Y] > vertex[Y]) min[Y] = vertex[Y];
			if(max[X] === null || max[X] < vertex[X]) max[X] = vertex[X];
			if(max[Y] === null || max[Y] < vertex[Y]) max[Y] = vertex[Y];
		}
		this._bounds = [min, max];
		return this._bounds;
	}
	
	this.dimensions = function(){
		if(this._dimensions) return this._dimensions;

		var bounds = this.bounds();
		this._dimensions = [bounds[1][X]-bounds[0][X], bounds[1][Y]-bounds[0][Y]];
		return this._dimensions;
	}

	this.center = function(){
		if(this._center) return this._center;

		var bounds = this.bounds();
		var dimensions = this.dimensions();
		this._center = [bounds[0][X] + dimensions[X]/2, bounds[0][Y] + dimensions[Y]/2 ];
		return this._center;
	}

	this.inside = function(canvas){
		var inside = false;
		var bounds = this.bounds();
		var dimensions = this.dimensions();

		var min = bounds[0];
		var max = bounds[1];

		return !(min[X] > canvas.width || (min[X] + dimensions[X]) <= 0 || (min[Y] + dimensions[Y]) <= 0 || 
			min[Y] > canvas.height)
	}

	this.subdivide = function(){
		var ret = this.conf.subdivide(this);
		return ret;
	}

	this.intersection = function(clip){
		return intersection(this.vertices, clip);
	}

	this.zoom = function(center, ratio){
		var vertices1 = this.vertices.slice();
		for(var i=0;i<vertices1.length;i++){
			var vertex = vertices1[i].slice();
			vertex[X] = (vertex[X]-center[X]) *ratio + center[X];
			vertex[Y] = (vertex[Y]-center[Y]) *ratio + center[Y];
			vertices1[i] = vertex;
		}
		return new Shape(this.type, vertices1, this.conf, this.drawType);
	}

	this.rotate = function(center, angle){
		var vertices1 = this.vertices.slice();
		for(var i=0;i<vertices1.length;i++){
			var vertex = vertices1[i].slice();
			vertex = rotate(vertex, angle, center);
			vertices1[i] = vertex;
		}
		return new Shape(this.type, vertices1, this.conf, this.drawType);
	}

}

var Penrose = function(canvas, conf){

	this.chooseNextTile = function(shapes){
		var me = this;
		if(!shapes) shapes = this.shapes;
		shapes.sort(function(x,y){return norm(diff(x.vertices[0], me.center)) - norm(diff(y.vertices[0], me.center))})
		var shapes = shapes.slice(0,10);
		return shapes[Math.floor(Math.random()*shapes.length)];
	}

	this.decomposeNextTile = function(){
		this.shapes.splice(this.shapes.indexOf(this.nextTile), 1);
		var shapes1 = this.decompose([this.nextTile], this.conf.next_subdivisions);
		this.shapes = this.shapes.concat(shapes1);
		this.nextTile = this.chooseNextTile(shapes1);
		this.center = this.nextTile.center();
	}

	this.draw = function(shapes, clip){
		if(!shapes) shapes = this.shapes;
		for(var j=0;j<shapes.length;j++){
			shapes[j].draw(this.context, clip);
		}
		for(var j=0;j<shapes.length;j++){
			shapes[j].drawContour(this.context, clip);
		}
	}

	this.removeOutside = function(ret1){
		var ret2 = [];
		for(var j=0;j<ret1.length;j++){
			if(!ret1[j].remove && ret1[j].inside(canvas)) ret2.push(ret1[j]);
		}	
		return ret2;	
	}

	this.decompose = function(ret, rounds){
		for(var i=0;i<rounds; i++){
			var ret1 = [];
			for(var j=0;j<ret.length;j++){
				ret1 = ret1.concat(ret[j].subdivide());
			}	
			ret = this.removeOutside(ret1);
		}
		if(this.isChangeColorActive){
			var conf1 = this.conf.clone();
			var colors = [];
			i=0;
			while(i<ret[0].conf.shape_params.length){
				var c1 = ret[0].conf.shape_params[i*3];
				colors.push(incrementHue(c1, 10));
				i+=1;
			}
			conf1.shape_params = generateColors(this.conf.shapes.length, colors);
		
			for(var j=0;j<ret.length;j++){
				ret[j].conf = conf1
			}
		}
		return ret;
	}
	
	this.zoom = function(){
		var start = null;
		var me = this;
		var currentRotation = Math.random() * Math.PI * maxRotation  - (Math.PI * maxRotation / 2 );

		function step(timestamp) {
		  if (!start) start = timestamp;
		  var progress = timestamp - start;
		
		  if(progress >= 30){

			  var ratio = 1 + (progress / me.timeToDouble);
			  var rotation = currentRotation * (progress / me.timeToDouble);
			  
			  for(var i=0;i<me.shapes.length;i++){
				var isnext = false;
				if(me.shapes[i] == me.nextTile) isnext = true;
				me.shapes[i] = me.shapes[i].zoom(me.center, ratio);
				if(me.isRotationActive) me.shapes[i] = me.shapes[i].rotate(me.center, rotation);
				if(isnext) me.nextTile = me.shapes[i];
			  }

			  start = timestamp;

			  var nextTileDimensions = me.nextTile.dimensions();
			  var decompose = nextTileDimensions[X] > 5 
				|| nextTileDimensions[Y] > 5;
			  if(decompose){
				me.shapes = me.removeOutside(me.shapes);
				me.decomposeNextTile();
				currentRotation = Math.random() * Math.PI * maxRotation  - (Math.PI * maxRotation / 2 );
			  } 
			  if(!me.dismissed){
				 me.context.clearRect(0, 0, canvas.width, canvas.height);
				 me.draw(me.shapes, decompose);
			  }			  
		  }

		  if(me.isZoomActive) window.requestAnimationFrame(step);
		}

		window.requestAnimationFrame(step);
	}

	this.setZoom = function(zoom){
		if(!this.center) this.decomposeNextTile();
		this.isZoomActive = zoom;
		if(zoom) this.zoom();
	}

	this.setRotationActive = function(rotation){
		this.isRotationActive = rotation;
	}

	this.setChangeColorActive = function(changeColor){
		this.isChangeColorActive = changeColor;
	}

	this.switchZoom = function(){
		this.setZoom(!this.isZoomActive);
	}

	this.switchRotation = function(){
		this.setRotationActive(!this.isRotationActive);
	}

	this.switchChangeColor = function(){
		this.setChangeColorActive(!this.isChangeColorActive);
	}

	this.clone = function(conf){
	    if(!conf) conf = this.conf;
	    angular.element(window).off('resize');
	    var penrose1 = new Penrose(this.canvas, conf);
	    this.setZoom(false);
    	    penrose1.setRotationActive(this.isRotationActive);
	    penrose1.setChangeColorActive(this.isChangeColorActive);
	    this.dismissed = true;
	    return penrose1;
	}

	this.scaleShapes = function(lastWidth){
		  var ratio = this.canvas.width / lastWidth;
		  for(var i=0;i<this.shapes.length;i++){
			var isnext = false;
			if(this.shapes[i] == this.nextTile) isnext = true;
			this.shapes[i] = this.shapes[i].zoom([0,0], ratio);
			if(isnext) this.nextTile = this.shapes[i];
		  }
		  if(this.center) this.center = [this.center[X] * ratio, this.center[Y] * ratio];
	}

	this.resizeCanvas = function(width){
		var widthBefore = this.canvas.width;
		if(!width){
			canvas.width = parseInt(document.body.offsetWidth * 0.6);
		} else canvas.width = width;
		canvas.height = canvas.width / screen.width * screen.height;
		if(this.shapes){
			this.scaleShapes(widthBefore);
			this.draw();
		}
	}

	this.isFullscreen = function(){
		return document.webkitIsFullScreen || document.mozFullScreen || document.msFullscreenElement;
	}

	this.fullscreen = function(){
		var body = angular.element(document.body);

		if (this.canvas.requestFullscreen) {
		  this.canvas.requestFullscreen();
		} else if (this.canvas.msRequestFullscreen) {
		  this.canvas.msRequestFullscreen();
		} else if (this.canvas.mozRequestFullScreen) {
		  this.canvas.mozRequestFullScreen();
		} else if (this.canvas.webkitRequestFullscreen) {
		  this.canvas.webkitRequestFullscreen();
		}

		var me = this;
		var exit = function(){
		    if (!me.isFullscreen())
		    {
			angular.element(window).off('webkitfullscreenchange mozfullscreenchange fullscreenchange MSFullscreenChange');
			body.removeClass("fullscreen");
			me.resizeCanvas();
		    } else {
			me.resizeCanvas(screen.width);
			body.addClass("fullscreen");
		    }
		}

		angular.element(window).on('webkitfullscreenchange mozfullscreenchange fullscreenchange MSFullscreenChange', exit);
	}

	this.speedup = function(){
		this.timeToDouble -= 100;
		if(this.timeToDouble<500) this.timeToDouble = 500;
	}

	this.slowdown = function(){
		this.timeToDouble += 100;
		if(this.timeToDouble>2500) this.timeToDouble = 2500;
	}

	this.conf = conf;
	this.canvas = canvas;
	this.context = canvas.getContext('2d');
	this.isZoomActive = false;
	this.isRotationActive = true;
	this.isChangeColorActive = true;
	this.timeToDouble = 1000;


	this.resizeCanvas();
	this.center = [canvas.width/2, canvas.height/2];
	var s1 = conf.createFirstShape(canvas);
	this.shapes = s1.subdivide();
	this.shapes = this.decompose(this.shapes, this.conf.initial_subdivisions);
	this.nextTile = this.chooseNextTile();
	this.draw();
	var me = this;
	angular.element(window).on('resize', function(){
		if (!me.isFullscreen()) me.resizeCanvas();
	});			
}


var penroseApp = angular.module('penroseApp', []);
penroseApp.controller('PenroseController', ['$scope', function($scope) {
 
  var canvas = document.getElementById('canvas');

  var conf = new PenroseKitesAndDarts();
  var penrose = new Penrose(canvas, conf);

  $scope.kitesSelected = true;
  $scope.rombsSelected = false;
  $scope.zoomSelected = false;
  $scope.rotationSelected = true;
  $scope.colorSelected = true;

  $scope.update = function(){
	$scope.zoomSelected = penrose.isZoomActive;
	$scope.rotationSelected = penrose.isRotationActive;
	$scope.colorSelected = penrose.isChangeColorActive;
  };

  $scope.switchZoom = function() {
    penrose.switchZoom();
    $scope.update();
  };

  $scope.switchRotation = function() {
    penrose.switchRotation();
    $scope.update();
  };

  $scope.switchChangeColor = function() {
    penrose.switchChangeColor();
    $scope.update();
  };

  $scope.switchKites = function() {
	
    conf = new PenroseKitesAndDarts();
    penrose = penrose.clone(conf);
    penrose.draw();
    $scope.kitesSelected = true;
    $scope.rombsSelected = false;
    $scope.update();
  };


  $scope.switchRombs = function(){
    conf = new PenroseRombs();
    penrose = penrose.clone(conf);
    penrose.draw();
    $scope.kitesSelected = false;
    $scope.rombsSelected = true;
    $scope.update();
  };

  $scope.fullscreen = function() {	
	penrose.fullscreen();
  };

  $scope.speedup = function() {	
	penrose.speedup();
  };

  $scope.slowdown = function() {	
	penrose.slowdown();
  };
}]);


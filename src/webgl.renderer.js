// inspired by https://xem.github.io/articles/webgl-guide.html
// https://webgl2fundamentals.org/webgl/lessons/webgl-fundamentals.html
// https://twgljs.org/docs/module-twgl.html#.setBuffersAndAttributes
// https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API

// TODO: currently does not use twgl but would reduce the lines here

import * as m3 from './m3.js';
import Flatbush from 'flatbush';
import { vertexShaderSource, fragmentShaderSource } from './wegl.shaders';
import * as d3 from 'd3';

class Wglr {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = this.canvas.getContext("webgl2", {
            // alpha: false,
            // premultipliedAlpha: false,
            // preserveDrawingBuffer: true,
        });

        // create GLSL shaders, upload the GLSL source, compile the shaders
        this.vShader = this.getVShader();
        this.fShader = this.getFShader();

        // Link the two shaders to a program
        this.program = this.createProgram(this.vShader, this.fShader);

        // Get shaders attributes and uniforms from program
        let dotXY = this.gl.getAttribLocation(this.program, 'in_dotXY');
        let dotSize = this.gl.getUniformLocation(this.program, 'u_dotSize');
        let dotColor = this.gl.getUniformLocation(this.program, 'u_dotColor');
        let projMat = this.gl.getUniformLocation(this.program, "u_mat");

        // set a class level state for all params to shaders
        this.glState = {
            dotXY, dotSize, dotColor, projMat
        };

        // Create a buffer
        let dotXYBuffer = this.gl.createBuffer();

        // Create & enable a vertex array object on the buffer
        this.vao = this.gl.createVertexArray();
        this.gl.bindVertexArray(this.vao);
        this.gl.enableVertexAttribArray(dotXY);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, dotXYBuffer);

        // set the camera position
        this.camera = {
            x: 0,
            y: 0,
            rotation: 0,
            zoom: 1,
        };

        // TODO: modify this later to buffer many points at once
        var size = 2; // 2 components per iteration
        var type = this.gl.FLOAT; // the data is 32bit floats
        var normalize = false; // don't normalize the data
        // TODO: these two are useful when the buffer contains an array of points
        var stride = 0; // 0 = move forward size * sizeof(type) each iteration to get the next position
        var offset = 0; // start at the beginning of the buffer

        this.gl.vertexAttribPointer(
            this.glState.dotXY, size,
            type, normalize, stride, offset);

        // other params for tracking camera and projection matrices
        this.viewProjectionMat = null;
        this.startCamera = null;
        this.startPos = null;

        // scale to translate from data space to canvas space
        this.xScale = null;
        this.yScale = null;

        // data format
        this.data = {
            x: null,
            y: null,
            color: null,
            opacity: null,
        }
    }

    setViewPort() {
        // Tell WebGL how to convert from clip space to pixels
        // we don't need this the input coordinates are the canvas 
        // dimensions and are translated to clip space at using the
        // projection matrix
        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
    }

    // creating shaders
    createShader(type, source) {
        let shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        let success = this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS);
        if (success) {
            return shader;
        }

        // console.log(this.gl.getShaderInfoLog(shader));  
        // eslint-disable-line
        this.gl.deleteShader(shader);
        return undefined;
    }

    // use the shaders to create a program
    createProgram(vertexShader, fragmentShader) {
        let program = this.gl.createProgram();
        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);

        let success = this.gl.getProgramParameter(program, this.gl.LINK_STATUS);
        if (success) {
            return program;
        }

        // console.log(this.gl.getProgramInfoLog(program));  
        // eslint-disable-line
        this.gl.deleteProgram(program);
        return undefined;
    }

    getVShader() {
        return this.createShader(this.gl.VERTEX_SHADER, vertexShaderSource);
    }

    getFShader() {
        return this.createShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);
    }

    // initial camera
    makeCameraMatrix() {
        const zoomScale = 1 / this.camera.zoom;
        let cameraMat = m3.identity();
        cameraMat = m3.translate(cameraMat, this.camera.x, this.camera.y);
        cameraMat = m3.rotate(cameraMat, this.camera.rotation);
        cameraMat = m3.scale(cameraMat, zoomScale, zoomScale);
        return cameraMat;
    }

    updateViewProjection() {
        const projectionMat = m3.projection(
            this.gl.canvas.width, this.gl.canvas.height);
        const cameraMat = this.makeCameraMatrix();
        let viewMat = m3.inverse(cameraMat);
        this.viewProjectionMat = m3.multiply(projectionMat, viewMat);
    }

    // setData automatically calls this unless you want to control the scale
    setScale(xScale, yScale) {
        this.xScale = xScale;
        this.yScale = yScale;
    }

    handleZoom(clipX, clipY, deltaY) {
        // console.log("handleZoom, ", clipX, clipY, deltaY);
        // position before zooming
        const [preZoomX, preZoomY] = m3.transformPoint(
            m3.inverse(this.viewProjectionMat),
            [clipX, clipY]
        );

        const newZoom = this.camera.zoom * Math.pow(2, deltaY * -0.01);
        this.camera.zoom = Math.max(0.02, Math.min(100, newZoom));

        this.updateViewProjection();

        const [postZoomX, postZoomY] = m3.transformPoint(
            m3.inverse(this.viewProjectionMat),
            [clipX, clipY]
        );

        this.camera.x += preZoomX - postZoomX;
        this.camera.y += preZoomY - postZoomY;

        this.render();
    }

    moveCamera(clip) {
        // console.log("moveCamer, ", clip);
        const pos = m3.transformPoint(
            m3.inverse(this.viewProjectionMat),
            clip);

        this.camera.x = this.startCamera.x + this.startPos[0] - pos[0];
        this.camera.y = this.startCamera.y + this.startPos[1] - pos[1];
        this.render();
    }

    handlePan(clip) {
        // console.log("handlePan, ", clip);
        this.startCamera = Object.assign({}, this.camera);

        this.startPos = m3.transformPoint(
            m3.inverse(this.viewProjectionMat),
            clip
        );

        this.render();
    }

    setData(data) {
        this.data = data;

        let xExtent = d3.extent(this.data.x);
        let yExtent = d3.extent(this.data.y);

        let xScale = d3.scaleLinear()
            .domain(xExtent)
            .range([0, this.gl.canvas.width]);

        var yScale = d3.scaleLinear()
            .domain(yExtent)
            .range([this.gl.canvas.height, 0]);

        this.setScale(xScale, yScale);

        // index the data
        this.dIdx = new Flatbush(this.data.x.length);
        for (let i = 0; i < this.data.x.length; i++) {
            this.dIdx.add(this.data.x[i] - 5, this.data.y[i] - 5,
                this.data.x[i] + 5, this.data.y[i] + 5)
        }

        this.dIdx.finish();
    }

    setColors(data) {
        this.colors = data;
    }

    render() {

        // TODO: only select points currently in viewport as the 
        // camera moves and render

        // Clear the canvas
        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        this.updateViewProjection();

        // Tell it to use our program (pair of shaders)
        this.gl.useProgram(this.program);

        // Bind the attribute/buffer set we want.
        this.gl.bindVertexArray(this.vao);

        for (let i = 0; i < this.data.x.length; i++) {

            // TODO: can i set multiple points at once to render in batches ?
            this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([
                this.xScale(this.data.x[i]), this.yScale(this.data.y[i]), 0
            ]), this.gl.STATIC_DRAW);

            this.gl.vertexAttrib4f(this.glState.dotXY,
                this.xScale(this.data.x[i]), this.yScale(this.data.y[i]),
                0, 1);
            this.gl.uniform1f(this.glState.dotSize, 10);
            this.gl.uniform4f(this.glState.dotColor, 
                this.colors['r'][i], this.colors['g'][i], this.colors['b'][i], 1);
            this.gl.uniformMatrix3fv(this.glState.projMat, false, this.viewProjectionMat);

            // TODO: if the previous todo is true, we can iterative over size of the buffer 
            // and change the offset here
            this.gl.drawArrays(this.gl.POINTS, 0, 1);
        }
    }
}

export default Wglr;
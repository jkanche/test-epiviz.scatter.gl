// inspired by https://xem.github.io/articles/webgl-guide.html
// https://webgl2fundamentals.org/webgl/lessons/webgl-fundamentals.html
// https://twgljs.org/docs/module-twgl.html#.setBuffersAndAttributes
// https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API

// TODO: currently does not use twgl but would reduce the lines here

import * as m3 from './m3.js';
import Flatbush from 'flatbush';
import { vertexShaderSource, fragmentShaderSource } from './wegl.shaders';
import * as d3 from 'd3';
import * as twgl from 'twgl.js';

class Wglr {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = this.canvas.getContext("webgl2", {
            // alpha: false,
            // premultipliedAlpha: false,
        });

        this.programInfo = twgl.createProgramInfo(this.gl, [vertexShaderSource, fragmentShaderSource]);

        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        // gl.scissor(0, 0, canvas_width, canvas_height);

        this.gl.clearColor(1, 1, 1, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        // set the camera position
        this.camera = {
            x: 0,
            y: 0,
            rotation: 0,
            zoom: 1,
        };

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

        this.vArrays = {};
        this.uArrays = {
            u_dotSize: 10
        };
    }

    setViewPort() {
        // Tell WebGL how to convert from clip space to pixels
        // we don't need this the input coordinates are the canvas 
        // dimensions and are translated to clip space at using the
        // projection matrix
        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
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

        requestAnimationFrame(this.update.bind(this));
    }

    moveCamera(clip) {
        // console.log("moveCamer, ", clip);
        const pos = m3.transformPoint(
            m3.inverse(this.viewProjectionMat),
            clip);

        this.camera.x = this.startCamera.x + this.startPos[0] - pos[0];
        this.camera.y = this.startCamera.y + this.startPos[1] - pos[1];
        requestAnimationFrame(this.update.bind(this));
    }

    handlePan(clip) {
        // console.log("handlePan, ", clip);
        this.startCamera = Object.assign({}, this.camera);

        this.startPos = m3.transformPoint(
            m3.inverse(this.viewProjectionMat),
            clip
        );

        requestAnimationFrame(this.update.bind(this));
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
        let d = [];
        this.dIdx = new Flatbush(this.data.x.length);
        for (let i = 0; i < this.data.x.length; i++) {
            d.push(this.data.x[i]);
            d.push(this.data.y[i]);
            this.dIdx.add(this.data.x[i] - 5, this.data.y[i] - 5,
                this.data.x[i] + 5, this.data.y[i] + 5)
        }

        this.dIdx.finish();

        this.vArrays["in_dotXY"] = {
            data: d,
            numComponents: 2,
        };

        this.updateGLConfig();
    }

    setColors(color) {
        this.colors = color;

        this.vArrays["in_dotColor"] = {
            data: color,
            numComponents: 1
        }

        this.updateGLConfig();
    }

    updateGLConfig() {
        this.bufferInfo = twgl.createBufferInfoFromArrays(this.gl, this.vArrays);
        this.vai = twgl.createVertexArrayInfo(this.gl, this.programInfo, this.bufferInfo);
        // twgl.setUniforms(this.programInfo, this.uArrays);
    }

    render() {
        // Clear the canvas
        this.gl.clearColor(1, 1, 1, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        // Sam was using this :) 
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
            
        this.updateViewProjection();

        this.uArrays["u_mat"] = this.viewProjectionMat;

        this.updateGLConfig();

        console.log(this.uArrays);
        console.log(this.vArrays);

        console.log(this.vArrays["in_dotXY"]["data"].length / 2)

        this.gl.useProgram(this.programInfo.program);
        twgl.setUniforms(this.programInfo, this.uArrays);
        twgl.setBuffersAndAttributes(this.gl, this.programInfo, this.vai)
        twgl.drawBufferInfo(this.gl, this.vai, this.gl.POINTS, this.vArrays["in_dotXY"]["data"].length / 2);
    }

    update() {

        // this.render();
        this.updateViewProjection();

        this.uArrays["u_mat"] = this.viewProjectionMat;
        twgl.setUniforms(this.programInfo, this.uArrays);
        twgl.drawBufferInfo(this.gl, this.vai, this.gl.POINTS, this.vArrays["in_dotXY"]["data"].length / 2);
    }
}

export default Wglr;
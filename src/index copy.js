// import EglViz from "./egl.viz.js";

import { flatGroup } from "d3";
import * as twgl from "twgl.js";

// export default EglViz;

const vertexShaderSource = `#version 300 es

    // buffer for points
    in vec2 in_dotXY;

    // size of point
    uniform float u_dotSize;

    void main() {
        gl_Position = vec4(in_dotXY, 0, 1);
        gl_PointSize = u_dotSize;
    }
`;

const fragmentShaderSource = `#version 300 es

    // precision
    precision highp float;

    // colors for each point
    uniform vec4 u_dotColor;

    // declare an output 
    // for the fragment shader
    out vec4 out_color;

    void main() {

        float d = distance(gl_PointCoord, vec2(0.5, 0.5));
        if(d < .5) { 
            out_color = u_dotColor;
        }
        else { discard; }
    }
`;

// creating shaders
function createShader(gl, type, source) {
    let shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    let success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) {
        return shader;
    }

    // console.log(gl.getShaderInfoLog(shader));  
    // eslint-disable-line
    gl.deleteShader(shader);
    return undefined;
}

// use the shaders to create a program
function createProgram(gl, vertexShader, fragmentShader) {
    let program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    let success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) {
        return program;
    }

    // console.log(gl.getProgramInfoLog(program));  
    // eslint-disable-line
    gl.deleteProgram(program);
    return undefined;
}

export function EglViz(canvas) {

    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    const gl = canvas.getContext("webgl2", {
        // alpha: false,
        // premultipliedAlpha: false,
        // preserveDrawingBuffer: true,
    });

    if (!gl) {
        throw "webgl2 not supported";
    }

    // Set the size of the canvas
    const canvas_width = canvas.clientWidth;
    const canvas_height = canvas.clientHeight;

    // gl.enable(gl.SCISSOR_TEST);
    // gl.enable(gl.DEPTH_TEST);

    // const vShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    // const fShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

    // // Link the two shaders to a program
    // const program = createProgram(gl, vShader, fShader);

    const programInfo = twgl.createProgramInfo(gl, [vertexShaderSource, fragmentShaderSource]);

    gl.useProgram(program);

    gl.viewport(0, 0, canvas_width, canvas_height);
    // gl.scissor(0, 0, canvas_width, canvas_height);

    gl.clearColor(1, 1, 1, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // generate random data
    let t0 = performance.now();
    let dsize = 1000000;
    let x = Array(dsize), y = Array(dsize), r = Array(dsize), g = Array(dsize), b = Array(dsize);
    for (var ii = 0; ii < dsize; ++ii) {

        // need a scale here for points
        x.push(Math.random() * 2 - 1);
        y.push(Math.random() * 2 - 1);
        r.push(Math.random());
        g.push(Math.random());
        b.push(Math.random());
    }
    console.log("generating points, ", performance.now() - t0);

    let dotXY = gl.getAttribLocation(program, 'in_dotXY');
    let dotSize = gl.getUniformLocation(program, 'u_dotSize');
    let dotColor = gl.getUniformLocation(program, 'u_dotColor');

    let glState = {
        dotXY, dotSize, dotColor
    };

    // Create a buffer
    let dotXYBuffer = gl.createBuffer();

    // Create & enable a vertex array object on the buffer
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    gl.enableVertexAttribArray(dotXY);
    gl.bindBuffer(gl.ARRAY_BUFFER, dotXYBuffer);

    // TODO: modify this later to buffer many points at once
    var size = 2; // 2 components per iteration
    var type = gl.FLOAT; // the data is 32bit floats
    var normalize = false; // don't normalize the data
    // TODO: these two are useful when the buffer contains an array of points
    var stride = 0; // 0 = move forward size * sizeof(type) each iteration to get the next position
    var offset = 0; // start at the beginning of the buffer

    gl.vertexAttribPointer(
        glState.dotXY, size,
        type, normalize, stride, offset);

    // Bind the attribute/buffer set we want.
    gl.bindVertexArray(this.vao);

    console.log(x, y);

    function render() {
        for (let i = 0; i < x.length; i++) {

            // TODO: can i set multiple points at once to render in batches ?
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
                x[i], y[i], 0
            ]), gl.STATIC_DRAW);

            gl.vertexAttrib2f(glState.dotXY,
                x[i], y[i]);
            gl.uniform1f(glState.dotSize, 1);
            gl.uniform4f(glState.dotColor,
                r[i], g[i], b[i], 1);
            // gl.uniformMatrix3fv(glState.projMat, false, this.viewProjectionMat);

            // TODO: if the previous todo is true, we can iterative over size of the buffer 
            // and change the offset here
            gl.drawArrays(gl.POINTS, 0, 1);
        }
    }

    render();

    function getClipSpaceMousePosition(e) {

        console.log("getclipspace", e);
        // get canvas relative css position
        const rect = canvas.getBoundingClientRect();
        const cssX = e.clientX - rect.left;
        const cssY = e.clientY - rect.top;

        // get normalized 0 to 1 position across and down canvas
        const normalizedX = cssX / canvas_width;
        const normalizedY = cssY / canvas_height;

        // convert to clip space
        const clipX = normalizedX * 2 - 1;
        const clipY = normalizedY * -2 + 1;

        return [[cssX, cssY], [clipX, clipY]];
    }

    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();

        const [css, clip] = getClipSpaceMousePosition(e);
        console.log(css, clip, e.deltaX, e.deltaY);
        gl.viewport(e.clientX, e.clientY, canvas_width, canvas_height);
        // render();
    });
}
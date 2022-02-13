// import EglViz from "./egl.viz.js";

import * as twgl from "twgl.js";

const vertexShaderSource = `#version 300 es

    // precision
    // precision highp float;

    // buffer for points
    in vec2 in_dotXY;

    // size of point
    uniform float u_dotSize;

    // output color (used in fragment)
    out vec4 vColor;

    // color for dots
    in float in_dotColor;

    vec3 unpackColor(float f) {
        vec3 colorVec;
        colorVec.r = floor(f / 65536.0);
        colorVec.g = floor((f - colorVec.r * 65536.0) / 256.0);
        colorVec.b = floor(f - colorVec.r * 65536.0 - colorVec.g * 256.0);
        return colorVec / 256.0;
    }

    void main() {
        gl_Position = vec4(in_dotXY, 0, 1);

        vec3 unpackedValues = unpackColor(in_dotColor);

        vColor = vec4(
            unpackedValues.rgb,
            1
        );

        gl_PointSize = u_dotSize;
    }
`;

const fragmentShaderSource = `#version 300 es

    // precision
    precision highp float;

    // colors for each point
    in vec4 vColor;

    // declare an output 
    // for the fragment shader
    out vec4 out_color;

    void main() {

        float d = distance(gl_PointCoord, vec2(0.5, 0.5));
        if(d < .5) { 
            out_color = vColor;
        }
        else { discard; }
    }
`;

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

    const programInfo = twgl.createProgramInfo(gl, [vertexShaderSource, fragmentShaderSource]);

    gl.viewport(0, 0, canvas_width, canvas_height);
    // gl.scissor(0, 0, canvas_width, canvas_height);

    gl.clearColor(1, 1, 1, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // generate random data
    let t0 = performance.now();
    let dsize = 1000;
    let d = Array(), color = Array();
    for (var ii = 0; ii < dsize; ii++) {

        // need a scale here for points
        // x.push(Math.random() * 2 - 1);
        // y.push(Math.random() * 2 - 1);
        d.push(Math.random() * 2 - 1);
        d.push(Math.random() * 2 - 1);
        color.push((Math.random() * 256 << 16) | (Math.random() * 256 << 8) | (Math.random() * 256 << 0))
    }
    console.log("generating points, ", performance.now() - t0);
    console.log(d, color);

    const vArrays = {
        in_dotXY: {
            data: d,
            numComponents: 2,
        },
        in_dotColor: {
            data: color,
            numComponents: 1
        },
    }

    const uArrays = {
        u_dotSize: 10
    }

    const bufferInfo = twgl.createBufferInfoFromArrays(gl, vArrays);
    const vai = twgl.createVertexArrayInfo(gl, programInfo, bufferInfo);


    function render() {
        // set and render
        gl.useProgram(programInfo.program);
        twgl.setUniforms(programInfo, uArrays);

        twgl.setBuffersAndAttributes(gl, programInfo, vai)

        twgl.drawBufferInfo(gl, vai, gl.POINTS, dsize / 2);
    }

    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();

        const [css, clip] = getClipSpaceMousePosition(e);
        console.log(css, clip, e.deltaX, e.deltaY);
        gl.viewport(e.clientX, e.clientY, canvas_width, canvas_height);
        // render();
    });
}
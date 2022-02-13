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

    // projections for zoom/pan
    uniform mat3 u_mat;

    void main() {
        gl_Position = vec4((u_mat * vec3(in_dotXY, 1)).xy, 0, 1);
        // gl_Position = vec4(in_dotXY, 0, 1);

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
    precision mediump float;

    // colors for each point
    in vec4 vColor;

    // declare an output 
    // for the fragment shader
    out vec4 out_color;

    void main() {
        // out_color = vColor;

        float d = distance(gl_PointCoord, vec2(0.5, 0.5));
        if(d < .5) { 
            out_color = vColor;
        }
        else { discard; }
    }
`;

export { vertexShaderSource, fragmentShaderSource };
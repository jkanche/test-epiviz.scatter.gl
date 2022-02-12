const vertexShaderSource = `#version 300 es

    // buffer for points
    in vec2 in_dotXY;

    // size of point
    uniform float u_dotSize;

    // projections for zoom/pan
    uniform mat3 u_mat;

    void main() {
        gl_Position = vec4((u_mat * vec3(in_dotXY, 1)).xy, 0, 1);
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

export {vertexShaderSource, fragmentShaderSource};
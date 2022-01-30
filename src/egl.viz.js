import Wglr from './webgl.renderer';
import * as d3 from 'd3';

export default class EglViz {
  constructor(canvas) {

    this.canvas = canvas;

    canvas.height = canvas.clientHeight * window.devicePixelRatio;
    canvas.width = canvas.clientWidth * window.devicePixelRatio;

    const gl = canvas.getContext("webgl2", {
      // alpha: false,
      // premultipliedAlpha: false,
      // preserveDrawingBuffer: true,
    }
    );

    // If we don't have a GL context, fail
    if (!gl) {
      throw "Browser does not support WebGL!";
    }

    this.wglr = new Wglr(gl);

    // generate random data
    let x = Array(50), y = Array(50);
    for (var ii = 0; ii < 50; ++ii) {

      // need a scale here for points
      x.push(parseInt(Math.random() * 100));
      y.push(parseInt(Math.random() * 100));
    }

    let xExtent = d3.extent(x);
    let yExtent = d3.extent(y);

    let xScale = d3.scaleLinear()
      .domain(xExtent)
      .range([0, gl.canvas.width]);

    var yScale = d3.scaleLinear()
      .domain(yExtent)
      .range([gl.canvas.height, 0]);

    this.wglr.setScale(xScale, yScale);
    this.wglr.setData({ x, y });
    this.wglr.render();

    var self = this;

    canvas.addEventListener('mousedown', (e) => {
      e.preventDefault();
      window.addEventListener('mousemove', this.handleMouseMove.bind(self));
      window.addEventListener('mouseup', this.handleMouseUp.bind(self));
      const clip = this.getClipSpaceMousePosition(e);

      this.wglr.handlePan(clip);
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const [clipX, clipY] = this.getClipSpaceMousePosition(e);

      this.wglr.handleZoom(clipX, clipY, e.deltaY);
    });
  }

  getClipSpaceMousePosition(e) {
    // get canvas relative css position
    const rect = this.canvas.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;

    // get normalized 0 to 1 position across and down canvas
    const normalizedX = cssX / this.canvas.clientWidth;
    const normalizedY = cssY / this.canvas.clientHeight;

    // convert to clip space
    const clipX = normalizedX * 2 - 1;
    const clipY = normalizedY * -2 + 1;

    return [clipX, clipY];
  }

  handleMouseMove(e) {
    const clip = this.getClipSpaceMousePosition(e);
    this.wglr.moveCamera(clip);
  }

  handleMouseUp(e) {
    this.wglr.render();
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mouseup', this.handleMouseUp);
  }
}
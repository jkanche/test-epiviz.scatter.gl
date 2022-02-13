import WglWorker from 'web-worker:./wegl.worker.js';

export default class EglViz {
  constructor(canvas) {
    var self = this;

    self.canvas = canvas;
    self.mousedrag = false;

    canvas.height = canvas.clientHeight * window.devicePixelRatio;
    canvas.width = canvas.clientWidth * window.devicePixelRatio;

    // TODO: check ahead of time if webgl is supported
    const offscreenCanvas = self.canvas.transferControlToOffscreen();

    self.webglWorker = new WglWorker();

    self.webglWorker.postMessage(
      {
        type: "init",
        canvas: offscreenCanvas,
      },
      [offscreenCanvas]
    );

    canvas.addEventListener('mousedown', (e) => {
      self.mousedrag = true;
      // canvas.addEventListener('mouseup', this.handleMouseUp.bind(self));
      self.canvas.addEventListener('mousemove', self.handleMouseMove.bind(self));
      e.preventDefault();

      const clip = self.getClipSpaceMousePosition(e);

      self.webglWorker.postMessage(
        {
          type: "handlePan",
          clip: clip,
        }
      );
    });

    canvas.addEventListener('mouseup', (e) => {
      self.mousedrag = false;
      self.canvas.removeEventListener('mousemove', self.handleMouseMove.bind(self));
      e.preventDefault();

      const clip = self.getClipSpaceMousePosition(e);

      self.webglWorker.postMessage(
        {
          type: "handlePan",
          clip: clip,
        }
      );
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const [clipX, clipY] = self.getClipSpaceMousePosition(e);

      self.webglWorker.postMessage(
        {
          type: "handleZoom",
          clip: [clipX, clipY, e.deltaY],
        }
      );
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
    var self = this;
    e.preventDefault();

    if (this.mousedrag) {
      const clip = this.getClipSpaceMousePosition(e);

      self.webglWorker.postMessage(
        {
          type: "moveCamera",
          clip: clip,
        }
      );
    }
  }

  render(data) {

    // validation
    // if (!('x' in data) || !('y' in data)) {
    //   throw "data does not contain x and y coordinates";
    // }

    // generate random data
    let t0 = performance.now();
    let dsize = 10000000;
    let x = Array(), y = Array(), color = Array();
    for (var ii = 0; ii < dsize; ii++) {

        // need a scale here for points
        // x.push(Math.random() * 2 - 1);
        // y.push(Math.random() * 2 - 1);
        x.push(Math.random() * this.canvas.width);
        y.push(Math.random() * this.canvas.height);
        color.push((Math.random() * 256 << 16) | (Math.random() * 256 << 8) | (Math.random() * 256 << 0))
    }
    console.log("generating points, ", performance.now() - t0);
    console.log(x, y, color);

    this.webglWorker.postMessage(
      {
        type: "setData",
        data: { x, y },
      }
    );

    this.webglWorker.postMessage(
      {
        type: "setColors",
        data: color,
      }
    );

    this.webglWorker.postMessage(
      {
        type: "render"
      }
    );
  }
}
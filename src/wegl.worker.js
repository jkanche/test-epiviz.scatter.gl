import Wglr from './webgl.renderer';

self.onmessage = (message) => {
    const payload = message.data;
    // console.log(payload);
    switch (payload.type) {
        case "init":
            const canvas = payload.canvas;
            self.wglr = new Wglr(canvas);
            break;
        case "setData":
            self.wglr.setData(payload.data);
            break;
        case "setColors":
            self.wglr.setColors(payload.data);
            break;
        case "render":
            self.wglr.render();
            break;
        case "handlePan":
            self.wglr.handlePan(payload.clip);
            break;
        case "handleZoom":
            const [clipX, clipY, deltaY] = payload.clip;
            self.wglr.handleZoom(clipX, clipY, deltaY);
            break;
        case "moveCamera":
            self.wglr.moveCamera(payload.clip);
            break;
        default:
            console.error(`Received unknown message type: ${message.type}`);
    }
};
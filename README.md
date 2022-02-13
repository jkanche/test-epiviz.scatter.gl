# Scatter GL

This library's goal is to build a fast, native webgl-based library to render scatter plots. A motivation for this is to support visualization of t-SNE or UMAP coordinates from large single cell experiments (millions of cells...). Eventually this will be integrated with the [WIP: epiviz.gl library](http://www.github.com/epiviz/epiviz.gl).

Traditionally DOM elements are not accessible from a web worker except for `canvas`. With `OffScreenCanvas` one can now delegate rendering (large) datasets to a web worker. This makes applications rendering large datasets responsive since the main thread is available for any user interactions.

TODO:
- [x] Finish up scatter plot rendering
- [x] Move to web worker for rendering
- [x] add index for rendering (flatbush)
- [ ] use viewport, currently its slow because its always rendering
- [ ] enable selection of cells (helps indexing the data to find data in a given geometry)
- [ ] Support high precision and medium precision (fast render)
- [ ] Optional distance option (fast render), otherwise visualization look like pixels

Project setup using [rollup-starter-lib](https://github.com/rollup/rollup-starter-lib)

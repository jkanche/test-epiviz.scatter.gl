# Scatter GL

The main goal is to build a fast, native webgl-based library to render scatter plots. A motivation for this is to support visualization of t-SNE or UMAP coordinates from large single cell experiments (millions of cells...).

Why and What ?

A number of webgl libraries often provide high level functions to balance between speed, optimizations and features. This library is only going to focus on one visualization type - Scatter Plot. eventually this will be integrated with the [WIP: epiviz.gl library](http://www.github.com/epiviz/epiviz.gl).

Traditionally DOM elements are not accessible from a web worker except for Canvas. One of recent advances in the browser is to support rendering (large) datasets in a web worker.  We transfer ownership of the canvas element from the main thread to the webworker, hence the name `OffScreenCanvas`. This keeps applications rendering large datasets highly responsive.

TODO: 
- [ ] Finish up scatter plot rendering
- [ ] Move to web worker for rendering
- [ ] add index for rendering (flatbush)
- [ ] enable selection of cells (helps indexing the data to find data in a given geometry)
- [ ] Support high precision and medium precision (fast render)
- [ ] Optional distance option (fast render), otherwise visualization look like pixel

Project setup using [rollup-starter-lib](https://github.com/rollup/rollup-starter-lib)

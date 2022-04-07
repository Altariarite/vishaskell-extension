<script lang="ts">
  import { afterUpdate, onMount } from 'svelte';
  import * as d3 from 'd3';

  const vscode = acquireVsCodeApi();

  let tree; // data[0] to access name and data[1] for children
  let selected; // which node is selected currently
  let value: Number; // value in the text box

  // Render object to an SVG tree display
  function updateTree(treeData) {
    // set the dimensions and margins of the diagram
    let margin = { top: 40, right: 90, bottom: 50, left: 90 },
      width = 500 - margin.left - margin.right,
      height = 300 - margin.top - margin.bottom;

    // declares a tree layout and assigns the size
    let treemap = d3.tree().size([width, height]);

    //  assigns the data to a hierarchy using parent-child relationships
    let nodes = d3.hierarchy(treeData, (d) =>
      Array.isArray(d) ? d[1] : undefined
    );

    // maps the node data to the tree layout
    nodes = treemap(nodes);

    // remove svg upfront
    d3.select('svg').remove();
    // append the svg obgect to the body of the page
    // appends a 'group' element to 'svg'
    // moves the 'group' element to the top left margin

    let svg = d3
        .select('body')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom),
      g = svg
        .append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    // adds the links between the nodes
    let link = g
      .selectAll('.link')
      .data(nodes.descendants().slice(1))
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', function (d) {
        return (
          'M' +
          d.x +
          ',' +
          d.y +
          'C' +
          d.x +
          ',' +
          (d.y + d.parent.y) / 2 +
          ' ' +
          d.parent.x +
          ',' +
          (d.y + d.parent.y) / 2 +
          ' ' +
          d.parent.x +
          ',' +
          d.parent.y
        );
      });

    // adds each node as a group
    let node = g
      .selectAll('.node')
      .data(nodes.descendants())
      .enter()
      .append('g')
      .attr('class', function (d) {
        return 'node' + (d.children ? ' node--internal' : ' node--leaf');
      })
      .attr('transform', function (d) {
        return 'translate(' + d.x + ',' + d.y + ')';
      });

    // adds the circle to the node
    node.append('circle').attr('r', 10);

    // adds the text to the node
    node
      .append('text')
      .attr('dy', '.35em')
      .attr('y', function (d) {
        return d.children ? -20 : 20;
      })
      .style('text-anchor', 'middle')
      .text(function (d) {
        return d.data[0];
      });

    node.on('click', function (e, d) {
      console.log(d);
      console.log(d.data);
      // d is a data structure of D3
      // d.data contains a subtree with the selected node as the root
      value = d.data[0];
      selected = d;
    });
  }

  // Handle the message inside the webview
  function handleSave() {
    vscode.postMessage({
      command: 'save',
      // fill in original value
      f: `decode ${JSON.stringify(JSON.stringify(tree))} :: Maybe (Tree Int)`,
    });
  }

  function handleLoad(event: any) {
    const message = event.data; // The JSON data our extension sent
    console.log('message recved', message);
    switch (message.command) {
      case 'load':
        console.log('svelte recv message: ', message);
        tree = JSON.parse(message.data);
        updateTree(tree);
        console.log('tree', tree);
        break;
    }
  }

  onMount(() => updateTree(tree));
  afterUpdate(() => {
    selected.data[0] = Number(value);
    updateTree(tree);
    console.log(tree);
  });
</script>

<h1>Selected: {selected ? selected.data[0] : 'nothing'}</h1>
<input bind:value />

<svelte:window on:message={handleLoad} />

<button on:click={handleSave}>Save</button>

<style>
  /* set the CSS */

  :global(.node circle) {
    fill: #ffff;
    stroke: steelblue;
    stroke-width: 3px;
  }

  :global(.node text) {
    font: 12px sans-serif;
  }

  :global(.node--internal text) {
    text-shadow: 0 1px 0 #fff, 0 -1px 0 #fff, 1px 0 0 #fff, -1px 0 0 #fff;
  }

  :global(.link) {
    fill: none;
    stroke: #ccc;
    stroke-width: 2px;
  }
</style>

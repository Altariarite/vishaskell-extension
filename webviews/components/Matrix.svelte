

<script lang="ts">
  import { afterUpdate, beforeUpdate, onMount } from 'svelte';
  import * as d3 from 'd3';

  const vscode = acquireVsCodeApi();

  let matrix = [
    [11975, 5871, 8916, 2868],
    [1951, 10048, 2060, 6171],
    [8010, 16145, 8090, 8045],
    [1013, 990, 940, 6907],
  ];

  function updateTable(data) {
	d3.select("table").remove();
    const table = d3.select('body').append('table');
	table.style("border-color","--vscode-foreground");
    // Join
    var tr = table.selectAll('tr').data(data);

    var row_index = d3.local();
    // enter + update rows
    var row = tr
      .enter()
      .append('tr')
      .merge(tr)
      .each(function (d, i) {
        row_index.set(this, i); // Store index in local variable.
      });

    var td = row.selectAll('td').data((d) => d);

    var col_index = d3.local();
    //enter + update cells
    td.enter()
      .append('td')
      .each(function (d, i) {
        col_index.set(this, i); // Store index in local variable.
      })

      .on('click', function (e, d) {
        let [i, j] = [row_index.get(this), col_index.get(this)];
        console.log(i, j);
        console.log('data ', data);
        vscode.postMessage({
          command: 'input',
          // fill in original value
          original: data[i][j],
          d: data,
          coords: [i, j],
        });

        // data[i][j] = value;
        // updateTable(data);
      })
      .merge(td)
      .text(function (d) {
        return d;
      });

    // json = JSON.stringify(m);
    // console.log(json);
    // return td;
  }

  // Handle the message inside the webview
  function handleMessage(event: any) {
    const message = event.data; // The JSON data our extension sent
    console.log('message recved', message);
    switch (message.command) {
      case 'input':
		console.log("svelte recv message: " ,message);
		matrix = message.data
		updateTable(matrix)
		console.log("matrix",matrix)
        break;
    }
  }

  function handleSave(){
	vscode.postMessage({
          command: 'save',
          // fill in original value
          d: matrix
        });
  }
  afterUpdate(()=> updateTable(matrix))


</script>



<h1>Hello3</h1>
<svelte:window on:message={handleMessage}/>
<button on:click={handleSave}>Save</button>


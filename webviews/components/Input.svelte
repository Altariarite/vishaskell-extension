<script>
  function clickOutside(node) {
    const handleClick = (event) => {
      if (!node.contains(event.target)) {
        node.dispatchEvent(new CustomEvent('outclick'));
      }
    };

    document.addEventListener('click', handleClick, true);

    return {
      destroy() {
        document.removeEventListener('click', handleClick, true);
      },
    };
  }
  let showModal = true;
</script>

<button on:click={() => (showModal = true)}>Change</button>
{#if showModal}
  <div class="box" use:clickOutside on:outclick={() => (showModal = false)}>
    click outside me
  </div>
{/if}

<style>
  .box {
    --width: 100px;
    --height: 100px;
    position: absolute;
    width: var(--width);
    height: var(--height);
    left: calc(50% - var(--width) / 2);
    top: calc(50% - var(--height) / 2);
    border-radius: 4px;
    background-color: #ff3e00;
    color: #fff;
    text-align: center;
    font-weight: bold;
  }
</style>

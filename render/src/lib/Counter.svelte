<script lang="ts">
  import { ipcRenderer } from "electron";
  let count: number = 0;
  const increment = () => {
    count += 1;
  };
  let customer: string = undefined;
  let album: string = undefined;
  function requestCreateEmptyAlbum(name: string) {
    ipcRenderer.send(`create-empty-album`, { name, customer });
  }
  function requestAlbums() {
    ipcRenderer.send("get-albums");
  }
  function requestUploadDirectory(dir: string) {
    ipcRenderer.send("upload-to-album", { dir });
  }
</script>

<button on:click={increment}>
  Clicks: {count}
</button>

<style>
  button {
    font-family: inherit;
    font-size: inherit;
    padding: 1em 2em;
    color: #ff3e00;
    background-color: rgba(255, 62, 0, 0.1);
    border-radius: 2em;
    border: 2px solid rgba(255, 62, 0, 0);
    outline: none;
    width: 200px;
    font-variant-numeric: tabular-nums;
    cursor: pointer;
  }

  button:focus {
    border: 2px solid #ff3e00;
  }

  button:active {
    background-color: rgba(255, 62, 0, 0.2);
  }
</style>

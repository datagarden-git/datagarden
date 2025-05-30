import { WorkspaceController } from "./controllers/workspace_controller.js";

export let FileHandler = function () {
    function downloadJSON(obj) {
        let blob = new Blob([JSON.stringify(obj)], { type: 'text/plain' });
        downloadFile(blob, 'data_garden_' + Date.now() + '.json');
    }

    async function downloadPNG(canvas) {
        let blob = await new Promise(resolve => canvas.toBlob(resolve));
        downloadFile(blob, 'data_garden_' + Date.now() + '.png');
    }

    function downloadFile(blob, name) {
        let link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = name;
        link.click();
        // delete the internal blob reference to clear memory
        URL.revokeObjectURL(link.href);
    }

    async function getJSONModel() {
        let file = await new Promise((resolve, reject) => {
            let input = document.createElement('input');
            input.type = 'file';
            input.click();
            input.onchange = e => {
                resolve(e.target.files[0]);
            };
            input.oncancel = e => { reject("User Canceled."); }
        })
        let contents = await file.text();
        return JSON.parse(contents);
    }

    async function getWorkspace() {
        let directoryHandle = await window.showDirectoryPicker();
        let workspace = new WorkspaceController(directoryHandle);
        return workspace;
    }

    return {
        downloadJSON,
        downloadPNG,
        getJSONModel,
        getWorkspace,
    }
}();
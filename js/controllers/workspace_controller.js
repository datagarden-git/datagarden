export function WorkspaceController(directoryHandle) {
    let mHandle = directoryHandle;

    async function writePNG(canvas, folder, fileName) {
        let blob = await new Promise(resolve => canvas.toBlob(resolve));
        let name = fileName + ".png";
        let folderHandle = await mHandle.getDirectoryHandle("pngs", { create: true });
        let fileHandle = await folderHandle.getFileHandle(name, { create: true });
        let stream = await fileHandle.createWritable();
        await stream.write(blob);
        await stream.close();
    }

    this.writePNG = writePNG;
}

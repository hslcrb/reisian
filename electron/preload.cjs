'use strict';
const { contextBridge, ipcRenderer } = require('electron');

// No channel names, filesystem primitives or event objects cross this boundary.
contextBridge.exposeInMainWorld(
  'reisian',
  Object.freeze({
    platform: process.platform,
    saveProject: (content, name) => ipcRenderer.invoke('reisian:save-project', content, name),
    openProject: () => ipcRenderer.invoke('reisian:open-project'),
    exportSite: (files, name) => ipcRenderer.invoke('reisian:export-site', files, name),
  }),
);

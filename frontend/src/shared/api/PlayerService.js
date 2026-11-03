import { client } from './client';

export const PlayerService = {
  getProgram: () => client('player/program'),
  saveProgram: (program) => client('player/program', { method: 'PUT', body: program }),
  getFolders: () => client('player/folders'),
  createFolder: (name) => client('player/folders', { method: 'POST', body: { name } }),
  renameFolder: (name, newName) => client('player/folders', { method: 'PUT', body: { name, newName } }),
  deleteFolder: (name) => client('player/folders', { method: 'DELETE', params: { name } }),
  assignFile: (fileName, folder) => client('player/files/folder', { method: 'PUT', body: { fileName, folder } }),
  renameFile: (fileName, newName) => client('player/files/rename', { method: 'PUT', body: { fileName, newName } }),
  command: (command) => client('player/command', { method: 'POST', body: { command } }),
  quickRun: (files) => client('player/command', { method: 'POST', body: { command: 'quick', files } }),
  startParty: (party) => client('player/command', { method: 'POST', body: { command: 'party', party } }),
  sync: () => client('player/sync', { method: 'POST' }),
  status: () => client('player/status'),
};

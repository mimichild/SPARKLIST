const mockPlayer = {
  play: jest.fn(),
  pause: jest.fn(),
  remove: jest.fn(),
  seekTo: jest.fn(),
};

export const createAudioPlayer = jest.fn(() => mockPlayer);
export const __mockPlayer = mockPlayer;

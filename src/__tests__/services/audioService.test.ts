import { createAudioPlayer, __mockPlayer } from 'expo-audio';
import * as audioService from '../../services/audioService';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('audioService', () => {
  it('playFireworks 會建立音訊播放器並呼叫 play', () => {
    audioService.playFireworks();
    expect(createAudioPlayer).toHaveBeenCalled();
    expect(__mockPlayer.play).toHaveBeenCalled();
  });

  it('playCheer 會建立音訊播放器並呼叫 play', () => {
    audioService.playCheer();
    expect(createAudioPlayer).toHaveBeenCalled();
    expect(__mockPlayer.play).toHaveBeenCalled();
  });
});
